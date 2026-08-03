const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const WORKER_ID = `local-${process.pid}`;
const TEXT_MODEL_ID = "sentence-transformers-all-MiniLM-L6-v2";
const FACE_MODEL_ID = "deepface-facenet";
const TEXT_ARTIFACT_HASH = "1377e9af0ca0b016a9f2aa584d6fc71ab3ea6804fae21ef9fb1416e2944057ac";
const FACE_ARTIFACT_HASH = "90659cc97bfda5999120f95d8e122f4d262cca11715a21e59ba024bcce816d5c";
const SCORING_VERSION = "phase5-additive-1";
const MAX_RECOMMENDATIONS_PER_REPORT = 10;

function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

function serviceConfig() {
  const url = (process.env.HUMTRACE_AI_SERVICE_URL || "http://127.0.0.1:5055").replace(/\/+$/, "");
  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN || "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url) || token.length < 32) throw new Error("AI_SERVICE_CONFIG_INVALID");
  return { url, token };
}

function configuredKeyId() {
  return process.env.HUMTRACE_EMBEDDING_KEY_ID || "local-v1";
}

function resolvePrivateStoragePath(storagePath) {
  const prefix = "storage/reports/";
  const normalized = String(storagePath || "").replace(/\\/g, "/");
  if (!normalized.startsWith(prefix)) throw new Error("PRIVATE_PHOTO_PATH_INVALID");
  const root = path.resolve(process.env.HUMTRACE_PRIVATE_STORAGE_ROOT || path.join(process.cwd(), "storage", "reports"));
  const absolute = path.resolve(root, normalized.slice(prefix.length));
  if (!absolute.startsWith(root + path.sep)) throw new Error("PRIVATE_PHOTO_PATH_INVALID");
  return absolute;
}

function encryptionKey(keyId = configuredKeyId()) {
  if (keyId !== configuredKeyId()) throw new Error("EMBEDDING_KEY_ID_UNKNOWN");
  const value = process.env.HUMTRACE_EMBEDDING_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("EMBEDDING_KEY_INVALID");
  return Buffer.from(value, "hex");
}

function vectorBuffer(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((value, index) => buffer.writeFloatLE(Number(value), index * 4));
  return buffer;
}

function encryptVector(vector, aad) {
  const iv = crypto.randomBytes(12);
  const keyId = configuredKeyId();
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(keyId), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(vectorBuffer(vector)), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyId };
}

function decryptVector(record, aad) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(record.keyId || "local-v1"), Buffer.from(record.iv));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(record.authTag));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(record.ciphertext)), decipher.final()]);
  if (plaintext.length !== record.dimensions * 4) throw new Error("EMBEDDING_DIMENSION_MISMATCH");
  const vector = [];
  for (let offset = 0; offset < plaintext.length; offset += 4) vector.push(plaintext.readFloatLE(offset));
  return vector;
}

function inputFingerprint(value) {
  return crypto.createHmac("sha256", encryptionKey()).update(value).digest("hex");
}

async function aiRequest(endpoint, { json, bytes, contentType } = {}) {
  const { url, token } = serviceConfig();
  const controller = new AbortController();
  const inference = endpoint === "/ai/face-embedding" || endpoint === "/ai/text-embedding";
  const timeout = setTimeout(() => controller.abort(), inference ? 190000 : 10000);
  try {
    const response = await fetch(url + endpoint, {
      method: "POST",
      headers: {
        "X-HumTrace-Internal-Token": token,
        "X-Request-ID": crypto.randomUUID(),
        "Content-Type": contentType || "application/json"
      },
      body: bytes || JSON.stringify(json),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`AI_${response.status}_${String(data.detail || "FAILURE").toUpperCase()}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function reportText(report) {
  return [report.description, report.clothing, report.identifyingFeatures]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

function isEnglish(text) {
  const letters = text.match(/\p{L}/gu) || [];
  const ascii = text.match(/[A-Za-z]/g) || [];
  return letters.length >= 8 && ascii.length / letters.length >= 0.85;
}

function numberFromText(value) {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numericSignal(a, b, tolerance) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return { available: false, score: 0 };
  return { available: true, score: Math.max(0, Math.min(100, 100 - Math.abs(a - b) / tolerance * 100)) };
}

function tokens(value) {
  return new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 2));
}

function locationSignal(source, target) {
  if (!source.broadRegion || !target.broadRegion) return { available: false, score: 0 };
  if (source.broadRegion.toLowerCase() === target.broadRegion.toLowerCase()) return { available: true, score: 100 };
  const left = tokens(`${source.broadRegion} ${source.specificLocation || ""}`);
  const right = tokens(`${target.broadRegion} ${target.specificLocation || ""}`);
  const union = new Set([...left, ...right]);
  const shared = [...left].filter((item) => right.has(item)).length;
  return { available: true, score: union.size ? shared / union.size * 100 : 0 };
}

function structuredSignals(source, target) {
  const sourceGender = source.gender && source.gender !== "Not specified" ? source.gender.toLowerCase() : null;
  const targetGender = target.gender && target.gender !== "Not specified" ? target.gender.toLowerCase() : null;
  return {
    age: numericSignal(numberFromText(source.approximateAge), numberFromText(target.approximateAge), 20),
    gender: { available: Boolean(sourceGender && targetGender), score: sourceGender && targetGender && sourceGender === targetGender ? 100 : 0 },
    height: numericSignal(source.heightCm, target.heightCm, 45),
    weight: numericSignal(source.weightKg, target.weightKg, 45),
    location: locationSignal(source, target)
  };
}

async function cosineScores(source, candidates) {
  const output = new Map();
  for (let index = 0; index < candidates.length; index += 25) {
    const batch = candidates.slice(index, index + 25);
    const data = await aiRequest("/ai/cosine-similarity", { json: { source, candidates: batch } });
    const expected = new Set(batch.map((item) => item.id));
    if (!Array.isArray(data.results) || data.results.length !== batch.length || data.results.some((item) => !expected.has(item.id) || !Number.isFinite(item.similarity) || item.similarity < 0 || item.similarity > 100)) throw new Error("AI_COSINE_RESPONSE_INVALID");
    for (const result of data.results) output.set(result.id, result.similarity);
  }
  return output;
}

async function ensureModels() {
  const specifications = [
    { id: TEXT_MODEL_ID, capability: "TEXT_EMBEDDING", name: "all-MiniLM-L6-v2", version: "local-artifact-1", artifactHash: TEXT_ARTIFACT_HASH, license: "Apache-2.0", language: "en", dimensions: 384, preprocessingVersion: "english-normalized-1", purpose: "English description similarity only" },
    { id: FACE_MODEL_ID, capability: "FACE_EMBEDDING", name: "FaceNet", version: "deepface-0.0.100-facenet", artifactHash: FACE_ARTIFACT_HASH, license: "REVIEW_REQUIRED", language: "n/a", dimensions: 128, preprocessingVersion: "opencv-align-l2-1", purpose: "Possible face similarity recommendations only" }
  ];
  for (const specification of specifications) {
    const existing = await prisma.aIModel.findUnique({ where: { id: specification.id } });
    if (existing && (existing.version !== specification.version || existing.artifactHash !== specification.artifactHash || existing.preprocessingVersion !== specification.preprocessingVersion)) throw new Error("AI_MODEL_IDENTITY_MISMATCH");
    if (!existing) await prisma.aIModel.create({ data: specification });
  }
}

async function runtimePolicy() {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: ["aiAssistanceEnabled", "faceSimilarityEnabled", "textSimilarityEnabled", "recommendationDisplayThreshold"] } } });
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const face = settings.faceSimilarityEnabled === "true";
  const text = settings.textSimilarityEnabled === "true";
  const developmentMode = process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true";
  let releaseApproved = false;
  let evaluatedThreshold = 0;
  if (!developmentMode && (face || text)) {
    const evaluation = await prisma.evaluationRun.findFirst({ where: { approvalStatus: "APPROVED", scoringVersion: SCORING_VERSION }, orderBy: { executedAt: "desc" } });
    if (evaluation && Number.isInteger(evaluation.recommendedThreshold)) {
      try {
        const versions = JSON.parse(evaluation.modelVersionsJson);
        const requiredIds = [face ? FACE_MODEL_ID : null, text ? TEXT_MODEL_ID : null].filter(Boolean);
        const models = await prisma.aIModel.findMany({ where: { id: { in: requiredIds } } });
        releaseApproved = requiredIds.every((id) => {
          const model = models.find((item) => item.id === id);
          const evaluated = typeof versions?.[id] === "string" ? versions[id] : versions?.models?.find?.((item) => item?.id === id)?.version;
          return model && model.status === "RELEASE_APPROVED" && model.evaluationStatus === "APPROVED" && evaluated === model.version;
        });
        evaluatedThreshold = releaseApproved ? evaluation.recommendedThreshold : 0;
      } catch {}
    }
  }
  return {
    active: settings.aiAssistanceEnabled === "true" && (developmentMode || releaseApproved),
    face,
    text,
    threshold: Math.max(Number(settings.recommendationDisplayThreshold) || 0, evaluatedThreshold)
  };
}

async function claimJob() {
  const now = new Date();
  await prisma.aIProcessingJob.updateMany({
    where: { jobType: "PROCESS_REPORT", status: "RUNNING", leaseExpiresAt: { lte: now } },
    data: { status: "RETRYABLE", retryAt: now, safeErrorCode: "WORKER_LEASE_EXPIRED", leaseOwner: null, leaseExpiresAt: null }
  });
  const job = await prisma.aIProcessingJob.findFirst({
    where: { jobType: "PROCESS_REPORT", status: { in: ["PENDING", "RETRYABLE"] }, availableAt: { lte: now }, OR: [{ retryAt: null }, { retryAt: { lte: now } }] },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }]
  });
  if (!job) return null;
  if (job.attempts >= job.maxAttempts) {
    await prisma.aIProcessingJob.update({ where: { id: job.id }, data: { status: "FAILED", safeErrorCode: "MAX_ATTEMPTS_REACHED", completedAt: now, leaseOwner: null, leaseExpiresAt: null } });
    await prisma.report.update({ where: { id: job.reportId }, data: { aiProcessingStatus: "LIMITED" } }).catch(() => {});
    return null;
  }
  const claimed = await prisma.aIProcessingJob.updateMany({
    where: { id: job.id, status: { in: ["PENDING", "RETRYABLE"] } },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: now, leaseOwner: WORKER_ID, leaseExpiresAt: new Date(now.getTime() + 10 * 60 * 1000) }
  });
  return claimed.count ? prisma.aIProcessingJob.findUnique({ where: { id: job.id } }) : null;
}

async function processJob(job) {
  const policy = await runtimePolicy();
  if (!policy.active || (!policy.face && !policy.text)) {
    await prisma.aIProcessingJob.updateMany({ where: { id: job.id, status: "RUNNING", leaseOwner: WORKER_ID }, data: { status: "WAITING_CONFIG", safeErrorCode: "AI_ASSISTANCE_DISABLED", leaseOwner: null, leaseExpiresAt: null } });
    await prisma.report.update({ where: { id: job.reportId }, data: { aiProcessingStatus: "DISABLED" } }).catch(() => {});
    return;
  }
  await ensureModels();
  const report = await prisma.report.findUnique({ where: { id: job.reportId }, include: { photos: true } });
  if (!report || !report.aiProcessingAllowed || report.aiProcessingPolicyVersion !== "phase5-local-1" || report.aiProcessingWithdrawnAt || report.lifecycleStatus !== "ACTIVE" || report.visibility !== "PUBLIC" || !report.publicVisible) {
    await prisma.aIProcessingJob.updateMany({ where: { id: job.id, status: "RUNNING", leaseOwner: WORKER_ID }, data: { status: "CANCELLED", safeErrorCode: "REPORT_NOT_ELIGIBLE", completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null } });
    return;
  }

  const usablePhoto = (item) => !item.deletedAt && ["SELF_CONFIRMED", "ACCEPTED"].includes(item.reviewStatus);
  const photo = report.photos.find((item) => item.kind === "PRIMARY" && usablePhoto(item)) || report.photos.find(usablePhoto);
  if (!photo) {
    await prisma.aIProcessingJob.updateMany({ where: { id: job.id, status: "RUNNING", leaseOwner: WORKER_ID }, data: { status: "CANCELLED", safeErrorCode: "PHOTO_NOT_REVIEWED", completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null } });
    return;
  }
  let faceVector = null;
  let textVector = null;
  let faceModelVersion = null;
  let textModelVersion = null;
  let faceEmbeddingData = null;
  let textEmbeddingData = null;
  let faceCheckStatus = "NOT_RUN";
  let photoContentHash = null;

  if (photo && policy.face) {
    const absolute = resolvePrivateStoragePath(photo.storagePath);
    const bytes = fs.readFileSync(absolute);
    const face = await aiRequest("/ai/face-embedding", { bytes, contentType: photo.mimeType });
    faceCheckStatus = face.outcome;
    photoContentHash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (face.outcome === "AVAILABLE") {
      if (face.modelId !== FACE_MODEL_ID || !Array.isArray(face.embedding) || face.embedding.length !== face.dimensions || face.embedding.some((value) => !Number.isFinite(value))) throw new Error("AI_FACE_RESPONSE_INVALID");
      faceVector = face.embedding;
      faceModelVersion = face.modelVersion;
      const hash = inputFingerprint(bytes);
      const aad = `${report.id}|FACE|${FACE_MODEL_ID}|${report.contentVersion}`;
      const encrypted = encryptVector(faceVector, aad);
      faceEmbeddingData = { ...encrypted, reportPhotoId: photo.id, dimensions: face.dimensions, inputHash: hash, inputVersion: report.contentVersion, invalidatedAt: null, deletedAt: null };
    } else if (!["NO_FACE", "MULTIPLE_FACES", "QUALITY_LIMITED"].includes(face.outcome)) {
      throw new Error("AI_FACE_RESPONSE_INVALID");
    }
  }

  const text = reportText(report);
  if (policy.text && isEnglish(text)) {
    const embedded = await aiRequest("/ai/text-embedding", { json: { texts: [text] } });
    if (embedded.outcome === "AVAILABLE") {
      if (embedded.modelId !== TEXT_MODEL_ID || !Array.isArray(embedded.vectors) || !Array.isArray(embedded.vectors[0]) || embedded.vectors[0].length !== embedded.dimensions || embedded.vectors[0].some((value) => !Number.isFinite(value))) throw new Error("AI_TEXT_RESPONSE_INVALID");
      textVector = embedded.vectors[0];
      textModelVersion = embedded.modelVersion;
      const hash = inputFingerprint(text);
      const aad = `${report.id}|TEXT|${TEXT_MODEL_ID}|${report.contentVersion}`;
      const encrypted = encryptVector(textVector, aad);
      textEmbeddingData = { ...encrypted, dimensions: embedded.dimensions, inputHash: hash, inputVersion: report.contentVersion, invalidatedAt: null, deletedAt: null };
    } else throw new Error("AI_TEXT_RESPONSE_INVALID");
  }

  const candidates = await prisma.report.findMany({
    where: { id: { not: report.id }, lifecycleStatus: "ACTIVE", visibility: "PUBLIC", publicVisible: true, status: { notIn: ["HIDDEN", "ARCHIVED", "CLOSED_BY_REPORTER"] }, aiProcessingAllowed: true, aiProcessingPolicyVersion: "phase5-local-1", aiProcessingWithdrawnAt: null },
    include: { textEmbeddings: { where: { invalidatedAt: null, deletedAt: null, modelId: TEXT_MODEL_ID, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }, faceEmbeddings: { where: { invalidatedAt: null, deletedAt: null, modelId: FACE_MODEL_ID, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
    orderBy: { createdAt: "desc" }
  });

  const faceInputs = [];
  const textInputs = [];
  for (const candidate of candidates) {
    const face = candidate.faceEmbeddings.find((item) => item.inputVersion === candidate.contentVersion);
    if (faceVector && face) {
      try { faceInputs.push({ id: candidate.id, vector: decryptVector(face, `${candidate.id}|FACE|${FACE_MODEL_ID}|${face.inputVersion}`) }); } catch {}
    }
    const textEmbedding = candidate.textEmbeddings.find((item) => item.inputVersion === candidate.contentVersion);
    if (textVector && textEmbedding) {
      try { textInputs.push({ id: candidate.id, vector: decryptVector(textEmbedding, `${candidate.id}|TEXT|${TEXT_MODEL_ID}|${textEmbedding.inputVersion}`) }); } catch {}
    }
  }
  const faceScores = faceVector && faceInputs.length ? await cosineScores(faceVector, faceInputs) : new Map();
  const textScores = textVector && textInputs.length ? await cosineScores(textVector, textInputs) : new Map();

  const scored = [];
  for (const candidate of candidates) {
    const structured = structuredSignals(report, candidate);
    const signals = {
      face: { available: faceScores.has(candidate.id), score: faceScores.get(candidate.id) || 0 },
      age: structured.age,
      gender: structured.gender,
      height: structured.height,
      weight: structured.weight,
      location: structured.location,
      description: { available: textScores.has(candidate.id), score: textScores.get(candidate.id) || 0 }
    };
    const combined = await aiRequest("/ai/recommendation-score", { json: { policyVersion: SCORING_VERSION, signals } });
    if (!Number.isFinite(combined.score) || combined.score < 0 || combined.score > 100 || !Number.isFinite(combined.availableWeight) || !Array.isArray(combined.modalityMask) || combined.humanReviewRequired !== true) throw new Error("AI_SCORE_RESPONSE_INVALID");
    if (combined.availableWeight > 0 && combined.score > 0 && combined.score >= policy.threshold) scored.push({ candidate, signals, combined });
  }
  scored.sort((a, b) => b.combined.score - a.combined.score);
  const finalPolicy = await runtimePolicy();
  await prisma.$transaction(async (tx) => {
    const [currentJob, currentReport] = await Promise.all([
      tx.aIProcessingJob.findUnique({ where: { id: job.id } }),
      tx.report.findUnique({ where: { id: report.id } })
    ]);
    const samePolicy = finalPolicy.face === policy.face && finalPolicy.text === policy.text && finalPolicy.threshold === policy.threshold;
    const stillEligible = currentJob?.status === "RUNNING" && currentJob.leaseOwner === WORKER_ID
      && currentReport?.contentVersion === report.contentVersion && currentReport.aiProcessingAllowed
      && currentReport.aiProcessingPolicyVersion === "phase5-local-1" && !currentReport.aiProcessingWithdrawnAt
      && currentReport.lifecycleStatus === "ACTIVE" && currentReport.visibility === "PUBLIC" && currentReport.publicVisible
      && finalPolicy.active && (finalPolicy.face || finalPolicy.text) && samePolicy;
    if (!stillEligible) {
      if (currentJob?.status === "RUNNING" && currentJob.leaseOwner === WORKER_ID) {
        const reportEligible = currentReport?.contentVersion === report.contentVersion && currentReport.aiProcessingAllowed && currentReport.aiProcessingPolicyVersion === "phase5-local-1" && !currentReport.aiProcessingWithdrawnAt && currentReport.lifecycleStatus === "ACTIVE" && currentReport.visibility === "PUBLIC" && currentReport.publicVisible;
        await tx.aIProcessingJob.update({ where: { id: currentJob.id }, data: { status: reportEligible ? (finalPolicy.active ? "PENDING" : "WAITING_CONFIG") : "CANCELLED", safeErrorCode: reportEligible ? "RUNTIME_POLICY_CHANGED" : "REPORT_NOT_ELIGIBLE", availableAt: new Date(), leaseOwner: null, leaseExpiresAt: null } });
      }
      return;
    }

    const currentCandidates = await tx.report.findMany({
      where: { id: { in: scored.map((item) => item.candidate.id) }, lifecycleStatus: "ACTIVE", visibility: "PUBLIC", publicVisible: true, status: { notIn: ["HIDDEN", "ARCHIVED", "CLOSED_BY_REPORTER"] }, aiProcessingAllowed: true, aiProcessingPolicyVersion: "phase5-local-1", aiProcessingWithdrawnAt: null },
      select: { id: true }
    });
    const currentCandidateIds = new Set(currentCandidates.map((item) => item.id));
    const eligibleScored = scored.filter((item) => currentCandidateIds.has(item.candidate.id));
    const suppressions = await tx.suppressedPair.findMany({ where: { sourceReportId: report.id, targetReportId: { in: [...currentCandidateIds] }, scoringVersion: SCORING_VERSION, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
    const suppressed = new Set(suppressions.map((item) => item.targetReportId));
    const reverseSuppressions = await tx.suppressedPair.findMany({ where: { sourceReportId: { in: [...currentCandidateIds] }, targetReportId: report.id, scoringVersion: SCORING_VERSION, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { sourceReportId: true } });
    const reverseSuppressed = new Set(reverseSuppressions.map((item) => item.sourceReportId));
    const top = eligibleScored.filter((item) => !suppressed.has(item.candidate.id)).slice(0, MAX_RECOMMENDATIONS_PER_REPORT);
    const topIds = new Set(top.map((item) => item.candidate.id));

    if (policy.face) await tx.reportPhoto.update({ where: { id: photo.id }, data: { faceCheckStatus, contentHash: photoContentHash } });
    if (faceEmbeddingData) await tx.reportFaceEmbedding.upsert({ where: { reportId_modelId: { reportId: report.id, modelId: FACE_MODEL_ID } }, update: faceEmbeddingData, create: { reportId: report.id, modelId: FACE_MODEL_ID, ...faceEmbeddingData } });
    if (textEmbeddingData) await tx.reportTextEmbedding.upsert({ where: { reportId_modelId: { reportId: report.id, modelId: TEXT_MODEL_ID } }, update: textEmbeddingData, create: { reportId: report.id, modelId: TEXT_MODEL_ID, ...textEmbeddingData } });
    await tx.recommendation.updateMany({ where: { sourceReportId: report.id, invalidatedAt: null }, data: { invalidatedAt: new Date(), invalidationReason: "NEW_GENERATION" } });
    const affectedSources = new Set([report.id]);
    for (const item of eligibleScored) {
      const attributes = Object.entries(item.signals).filter(([, value]) => value.available && value.score >= 60).map(([name]) => name[0].toUpperCase() + name.slice(1));
      const breakdown = Object.entries(item.signals).map(([name, signal]) => ({ label: `${name[0].toUpperCase() + name.slice(1)} similarity`, value: Math.round(signal.score), available: signal.available }));
      const common = { score: Math.round(item.combined.score), qualityLabel: "Possible similarity", sharedAttributes: JSON.stringify(attributes), breakdownSummary: JSON.stringify(breakdown), modalityScoresJson: JSON.stringify(item.signals), modalityMask: item.combined.modalityMask.join(","), availableWeight: item.combined.availableWeight, faceModelVersion: item.signals.face.available ? faceModelVersion : null, textModelVersion: item.signals.description.available ? textModelVersion : null, scoringVersion: SCORING_VERSION, expiresAt: new Date(Date.now() + 30 * 86400000), invalidatedAt: null, invalidationReason: null, status: "PENDING_REVIEW" };
      const directions = [];
      if (topIds.has(item.candidate.id)) directions.push([report.id, item.candidate.id]);
      if (!reverseSuppressed.has(item.candidate.id)) {
        directions.push([item.candidate.id, report.id]);
        affectedSources.add(item.candidate.id);
      }
      for (const [sourceReportId, targetReportId] of directions) {
        await tx.recommendation.upsert({
          where: { sourceReportId_targetReportId: { sourceReportId, targetReportId } },
          update: common,
          create: { sourceReportId, targetReportId, ...common }
        });
      }
    }
    for (const sourceReportId of affectedSources) {
      const overflow = await tx.recommendation.findMany({
        where: { sourceReportId, scoringVersion: SCORING_VERSION, invalidatedAt: null },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip: MAX_RECOMMENDATIONS_PER_REPORT,
        select: { id: true }
      });
      if (overflow.length) {
        await tx.recommendation.updateMany({
          where: { id: { in: overflow.map((item) => item.id) } },
          data: { invalidatedAt: new Date(), invalidationReason: "OUTSIDE_TOP_TEN" }
        });
      }
    }
    await tx.report.update({ where: { id: report.id }, data: { aiProcessingStatus: top.length ? "AVAILABLE" : "LIMITED" } });
    await tx.timelineEvent.create({ data: { reportId: report.id, title: "AI-assisted suggestions processed", description: `${top.length} possible recommendations were prepared for mandatory human review. No identity was confirmed.` } });
    await tx.aIProcessingJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null, safeErrorCode: null } });
  });
}

async function failJob(job, error) {
  const safeCode = String(error.message || "AI_JOB_FAILED").replace(/[^A-Z0-9_\-]/gi, "_").slice(0, 80);
  const retry = job.attempts < job.maxAttempts;
  const updated = await prisma.aIProcessingJob.updateMany({ where: { id: job.id, status: "RUNNING", leaseOwner: WORKER_ID }, data: { status: retry ? "RETRYABLE" : "FAILED", retryAt: retry ? new Date(Date.now() + Math.min(300000, 15000 * 2 ** job.attempts)) : null, safeErrorCode: safeCode, completedAt: retry ? null : new Date(), leaseOwner: null, leaseExpiresAt: null } });
  if (updated.count) await prisma.report.update({ where: { id: job.reportId }, data: { aiProcessingStatus: retry ? "PENDING" : "LIMITED" } }).catch(() => {});
  return safeCode;
}

async function runOnce() {
  const job = await claimJob();
  if (!job) return false;
  try { await processJob(job); } catch (error) { const safeCode = await failJob(job, error); console.error("AI job failed", job.id, safeCode); }
  return true;
}

async function main() {
  const once = process.argv.includes("--once");
  do {
    const worked = await runOnce();
    if (once) break;
    if (!worked) await new Promise((resolve) => setTimeout(resolve, 3000));
  } while (true);
}

main().finally(async () => prisma.$disconnect()).catch((error) => { console.error(error); process.exit(1); });
