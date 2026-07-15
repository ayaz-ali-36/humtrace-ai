import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  ENGLISH_TEXT_DIMENSIONS,
  ENGLISH_TEXT_MODEL_ID,
  ENGLISH_TEXT_MODEL_VERSION
} from "@/lib/ai/config";
import { decryptVector, encryptVector } from "@/lib/ai/encryption";
import { embedEnglishTexts } from "@/lib/ai/inference-client";

const artifactHash = "1377e9af0ca0b016a9f2aa584d6fc71ab3ea6804fae21ef9fb1416e2944057ac";

export function reportEnglishText(report) {
  return [
    report.description ? "Description: " + report.description : "",
    report.clothing ? "Clothing: " + report.clothing : "",
    report.identifyingFeatures ? "Visible features: " + report.identifyingFeatures : ""
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function isEnglishEmbeddingInput(text) {
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length < 8) return false;
  const asciiLetters = text.match(/[A-Za-z]/g) || [];
  return asciiLetters.length / letters.length >= 0.85;
}

function inputHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function cosineScore(source, target) {
  if (source.length !== target.length) return 0;
  let dot = 0;
  let sourceNorm = 0;
  let targetNorm = 0;
  for (let index = 0; index < source.length; index += 1) {
    dot += source[index] * target[index];
    sourceNorm += source[index] ** 2;
    targetNorm += target[index] ** 2;
  }
  if (!sourceNorm || !targetNorm) return 0;
  return Math.max(0, Math.min(100, Math.round((dot / Math.sqrt(sourceNorm * targetNorm)) * 100)));
}

async function ensureModelRecord() {
  return prisma.aIModel.upsert({
    where: { id: ENGLISH_TEXT_MODEL_ID },
    update: {
      version: ENGLISH_TEXT_MODEL_VERSION,
      artifactHash,
      status: "DEVELOPMENT_ONLY"
    },
    create: {
      id: ENGLISH_TEXT_MODEL_ID,
      capability: "TEXT_EMBEDDING",
      name: "all-MiniLM-L6-v2",
      version: ENGLISH_TEXT_MODEL_VERSION,
      artifactHash,
      license: "Apache-2.0",
      language: "en",
      dimensions: ENGLISH_TEXT_DIMENSIONS,
      status: "DEVELOPMENT_ONLY"
    }
  });
}

export async function ensureReportTextEmbeddings(reports) {
  const eligible = reports
    .map((report) => ({ report, text: reportEnglishText(report) }))
    .filter(({ report, text }) => report.aiProcessingAllowed && !report.aiProcessingWithdrawnAt && isEnglishEmbeddingInput(text));
  if (!eligible.length) return new Map();

  await ensureModelRecord();
  const existing = await prisma.reportTextEmbedding.findMany({
    where: {
      modelId: ENGLISH_TEXT_MODEL_ID,
      reportId: { in: eligible.map(({ report }) => report.id) },
      invalidatedAt: null
    }
  });
  const existingByReport = new Map(existing.map((record) => [record.reportId, record]));
  const vectors = new Map();
  const missing = [];

  for (const item of eligible) {
    const record = existingByReport.get(item.report.id);
    if (record && record.inputHash === inputHash(item.text)) {
      try {
        vectors.set(item.report.id, decryptVector(record));
        continue;
      } catch {
        await prisma.reportTextEmbedding.update({
          where: { id: record.id },
          data: { invalidatedAt: new Date() }
        });
      }
    }
    missing.push(item);
  }

  if (missing.length) {
    const startedAt = new Date();
    try {
      const generated = await embedEnglishTexts(missing.map((item) => item.text));
      for (let index = 0; index < missing.length; index += 1) {
        const item = missing[index];
        const vector = generated[index];
        const encrypted = encryptVector(vector);
        await prisma.reportTextEmbedding.upsert({
          where: {
            reportId_modelId: {
              reportId: item.report.id,
              modelId: ENGLISH_TEXT_MODEL_ID
            }
          },
          update: {
            ...encrypted,
            dimensions: ENGLISH_TEXT_DIMENSIONS,
            inputHash: inputHash(item.text),
            invalidatedAt: null,
            expiresAt: null
          },
          create: {
            reportId: item.report.id,
            modelId: ENGLISH_TEXT_MODEL_ID,
            ...encrypted,
            dimensions: ENGLISH_TEXT_DIMENSIONS,
            inputHash: inputHash(item.text)
          }
        });
        await prisma.aIProcessingJob.create({
          data: {
            reportId: item.report.id,
            modelId: ENGLISH_TEXT_MODEL_ID,
            jobType: "EMBED_ENGLISH_TEXT",
            status: "SUCCEEDED",
            attempts: 1,
            startedAt,
            completedAt: new Date()
          }
        });
        vectors.set(item.report.id, vector);
      }
    } catch (error) {
      for (const item of missing) {
        await prisma.aIProcessingJob.create({
          data: {
            reportId: item.report.id,
            modelId: ENGLISH_TEXT_MODEL_ID,
            jobType: "EMBED_ENGLISH_TEXT",
            status: "RETRYABLE",
            attempts: 1,
            safeErrorCode: String(error.message || "AI_TEXT_FAILURE").slice(0, 80),
            startedAt,
            completedAt: new Date()
          }
        }).catch(() => {});
      }
      throw error;
    }
  }

  return vectors;
}

export async function englishTextSimilarityScores(source, candidates) {
  const sourceText = reportEnglishText(source);
  if (!isEnglishEmbeddingInput(sourceText)) {
    return { scores: new Map(), used: false, reason: "English descriptive text is required." };
  }

  let sourceVector;
  if (source.id && source.aiProcessingAllowed && !source.aiProcessingWithdrawnAt) {
    const sourceVectors = await ensureReportTextEmbeddings([source]);
    sourceVector = sourceVectors.get(source.id);
  } else {
    [sourceVector] = await embedEnglishTexts([sourceText]);
  }
  if (!sourceVector) {
    return { scores: new Map(), used: false, reason: "English text processing is not authorized for the source report." };
  }

  const candidateVectors = await ensureReportTextEmbeddings(candidates);
  const scores = new Map();
  for (const candidate of candidates) {
    const vector = candidateVectors.get(candidate.id);
    if (vector) scores.set(candidate.id, cosineScore(sourceVector, vector));
  }
  return {
    scores,
    used: scores.size > 0,
    reason: scores.size ? "" : "No eligible reports currently have approved English text processing.",
    modelId: ENGLISH_TEXT_MODEL_ID
  };
}

export async function invalidateReportAI(reportId, reason, tx = prisma) {
  const now = new Date();
  await tx.reportTextEmbedding.updateMany({
    where: { reportId, invalidatedAt: null },
    data: { invalidatedAt: now }
  });
  await tx.recommendation.updateMany({
    where: {
      OR: [{ sourceReportId: reportId }, { targetReportId: reportId }],
      invalidatedAt: null
    },
    data: {
      invalidatedAt: now,
      invalidationReason: String(reason || "REPORT_CHANGED").slice(0, 80)
    }
  });
}
