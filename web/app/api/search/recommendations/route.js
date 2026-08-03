import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { validateImageBytes, validateImageFile } from "@/lib/upload-storage";
import { calculateCosineSimilarity, calculateRecommendationScore, createFaceEmbedding, createTextEmbeddings, getAIHealth } from "@/lib/ai/client";
import { decryptVector } from "@/lib/ai/encryption";
import { resolveApprovedReleaseGate } from "@/lib/ai/release-gate";

export const runtime = "nodejs";

const TEXT_MODEL_ID = "sentence-transformers-all-MiniLM-L6-v2";
const FACE_MODEL_ID = "deepface-facenet";
const WEIGHTS = { face: 0.40, age: 0.15, gender: 0.10, height: 0.10, weight: 0.05, location: 0.10, description: 0.10 };
const clean = (value, max = 1200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const allowedGenders = new Set(["", "Female", "Male", "Other", "Not specified"]);

function optionalNumber(form, name, min, max) {
  const raw = clean(form.get(name), 20);
  if (!raw) return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return { error: `${name === "heightCm" ? "Height" : "Weight"} must be between ${min} and ${max}.` };
  return { value };
}

function numberFromText(value) {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numericSignal(a, b, tolerance) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return { available: false, score: 0 };
  return { available: true, score: Math.max(0, Math.min(100, 100 - Math.abs(a - b) / tolerance * 100)) };
}

function tokenScore(a, b) {
  const left = new Set(String(a || "").toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 2));
  const right = new Set(String(b || "").toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 2));
  if (!left.size || !right.size) return 0;
  const union = new Set([...left, ...right]);
  return [...left].filter((item) => right.has(item)).length / union.size * 100;
}

function locationSignal(source, target) {
  if (!source.broadRegion || !target.broadRegion) return { available: false, score: 0 };
  if (source.broadRegion.toLowerCase() === target.broadRegion.toLowerCase()) return { available: true, score: 100 };
  return { available: true, score: tokenScore(`${source.broadRegion} ${source.specificLocation || ""}`, `${target.broadRegion} ${target.specificLocation || ""}`) };
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

function localScore(signals) {
  const available = Object.entries(signals).filter(([, signal]) => signal.available);
  const availableWeight = available.reduce((sum, [name]) => sum + WEIGHTS[name], 0);
  const score = availableWeight
    ? available.reduce((sum, [name, signal]) => sum + WEIGHTS[name] * signal.score, 0) / availableWeight
    : 0;
  return { score, availableWeight, modalityMask: available.map(([name]) => name) };
}

function reportText(report) {
  return [report.description, report.clothing, report.identifyingFeatures].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

function isEnglish(text) {
  const letters = text.match(/\p{L}/gu) || [];
  const ascii = text.match(/[A-Za-z]/g) || [];
  return letters.length >= 8 && ascii.length / letters.length >= 0.85;
}

async function cosineMap(source, candidates) {
  const output = new Map();
  for (let index = 0; index < candidates.length; index += 25) {
    const data = await calculateCosineSimilarity(source, candidates.slice(index, index + 25));
    data.results.forEach((item) => output.set(item.id, item.similarity));
  }
  return output;
}

export async function POST(request) {
  let photoBytes = null;
  try {
    const settings = await getSettings();
    if (!settings.publicSearchEnabled || settings.maintenanceMode) return NextResponse.json({ error: "Smart Search is temporarily unavailable." }, { status: 503 });

    const form = await request.formData();
    if (form.get("aiProcessingConsent") !== "true") {
      return NextResponse.json({ error: "Confirm that you are authorized to use these details or this photograph for Smart Search." }, { status: 400 });
    }
    const photo = form.get("photo");
    const hasPhoto = photo && typeof photo.arrayBuffer === "function" && photo.size > 0;
    if (hasPhoto) {
      const fileError = validateImageFile(photo);
      if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
      photoBytes = Buffer.from(await photo.arrayBuffer());
      const byteError = validateImageBytes({ bytes: photoBytes, mimeType: photo.type });
      if (byteError) return NextResponse.json({ error: byteError }, { status: 400 });
    }

    const height = optionalNumber(form, "heightCm", 30, 260);
    const weight = optionalNumber(form, "weightKg", 2, 300);
    if (height.error || weight.error) return NextResponse.json({ error: height.error || weight.error }, { status: 400 });
    const gender = clean(form.get("gender"), 30);
    if (!allowedGenders.has(gender)) return NextResponse.json({ error: "Choose a supported gender value." }, { status: 400 });
    const source = {
      approximateAge: clean(form.get("age"), 40),
      gender,
      heightCm: height.value,
      weightKg: weight.value,
      broadRegion: clean(form.get("region"), 120),
      specificLocation: clean(form.get("location"), 180),
      description: clean(form.get("description")),
      clothing: clean(form.get("clothing"), 500),
      identifyingFeatures: clean(form.get("identifyingFeatures"), 500)
    };
    const text = reportText(source);
    const hasDetails = Boolean(source.approximateAge || source.gender || source.heightCm || source.weightKg || source.broadRegion || text);
    if (!hasPhoto && !hasDetails) return NextResponse.json({ error: "Add a photograph, descriptive details, or both." }, { status: 400 });

    const developmentMode = process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true";
    const showDemoPhotos = process.env.HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS === "true";
    const releaseGate = developmentMode ? { approved: true, threshold: null } : await resolveApprovedReleaseGate({ faceEnabled: settings.faceSimilarityEnabled, textEnabled: settings.textSimilarityEnabled });
    const aiActive = settings.aiAssistanceEnabled && releaseGate.approved;
    const effectiveThreshold = Math.max(settings.recommendationDisplayThreshold, releaseGate.threshold || 0);

    const searchScope = clean(form.get("searchScope"), 20).toUpperCase();
    if (!["ALL", "MISSING", "UNIDENTIFIED"].includes(searchScope)) return NextResponse.json({ error: "Choose Missing, Unidentified, or both report types." }, { status: 400 });
    const candidateTypes = searchScope === "MISSING"
      ? ["MISSING"]
      : searchScope === "UNIDENTIFIED"
        ? ["UNIDENTIFIED"]
        : ["MISSING", "UNIDENTIFIED"];
    const candidates = await prisma.report.findMany({
      where: { type: { in: candidateTypes }, lifecycleStatus: "ACTIVE", visibility: "PUBLIC", publicVisible: true, status: { notIn: ["HIDDEN", "ARCHIVED", "CLOSED_BY_REPORTER"] } },
      include: {
        textEmbeddings: { where: { modelId: TEXT_MODEL_ID, invalidatedAt: null, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
        faceEmbeddings: { where: { modelId: FACE_MODEL_ID, invalidatedAt: null, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }
        ,photos: { where: { deletedAt: null, reviewStatus: { in: ["SELF_CONFIRMED", "ACCEPTED"] } }, take: 1, select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    let faceOutcome = hasPhoto ? "NOT_ANALYZED" : "NOT_SUPPLIED";
    let faceScores = new Map();
    let textScores = new Map();
    let serviceNotice = "";
    let aiServiceAvailable = aiActive;
    if (aiActive) {
      try {
        await getAIHealth();
        if (hasPhoto && settings.faceSimilarityEnabled) {
          const face = await createFaceEmbedding(photoBytes, photo.type);
          faceOutcome = face.outcome;
          if (face.outcome === "AVAILABLE") {
            const vectors = [];
            for (const candidate of candidates) {
              const record = candidate.aiProcessingAllowed && candidate.aiProcessingPolicyVersion === "phase5-local-1" && !candidate.aiProcessingWithdrawnAt && candidate.faceEmbeddings[0]?.inputVersion === candidate.contentVersion ? candidate.faceEmbeddings[0] : null;
              if (!record) continue;
              try { vectors.push({ id: candidate.id, vector: decryptVector(record, `${candidate.id}|FACE|${FACE_MODEL_ID}|${record.inputVersion}`) }); } catch {}
            }
            if (vectors.length) faceScores = await cosineMap(face.embedding, vectors);
          }
        }
        if (text && isEnglish(text) && settings.textSimilarityEnabled) {
          const embedded = await createTextEmbeddings([text]);
          const vectors = [];
          for (const candidate of candidates) {
            const record = candidate.aiProcessingAllowed && candidate.aiProcessingPolicyVersion === "phase5-local-1" && !candidate.aiProcessingWithdrawnAt && candidate.textEmbeddings[0]?.inputVersion === candidate.contentVersion ? candidate.textEmbeddings[0] : null;
            if (!record) continue;
            try { vectors.push({ id: candidate.id, vector: decryptVector(record, `${candidate.id}|TEXT|${TEXT_MODEL_ID}|${record.inputVersion}`) }); } catch {}
          }
          if (vectors.length) textScores = await cosineMap(embedded.vectors[0], vectors);
        }
      } catch {
        aiServiceAvailable = false;
        serviceNotice = "The local AI service was unavailable, so safe detail-based fallback scoring was used.";
      }
    }

    const scored = [];
    for (const target of candidates) {
      const structured = structuredSignals(source, target);
      const targetText = reportText(target);
      const signals = {
        face: { available: faceScores.has(target.id), score: faceScores.get(target.id) || 0 },
        ...structured,
        description: textScores.has(target.id)
          ? { available: true, score: textScores.get(target.id) }
          : { available: Boolean(text && targetText), score: tokenScore(text, targetText) }
      };
      let combined;
      try {
        combined = aiServiceAvailable ? await calculateRecommendationScore(signals) : localScore(signals);
      } catch {
        aiServiceAvailable = false;
        serviceNotice = "The local AI service became unavailable, so safe detail-based fallback scoring was used.";
        combined = localScore(signals);
      }
      if (combined.availableWeight > 0 && combined.score >= effectiveThreshold) scored.push({ target, signals, combined });
    }

    const recommendations = scored.sort((a, b) => b.combined.score - a.combined.score).slice(0, 10).map(({ target, signals, combined }) => ({
      id: `search-${target.publicId}`,
      reportId: "Smart Search",
      similarReportId: target.publicId,
      score: Math.round(combined.score),
      qualityLabel: "Possible similarity",
      status: "Human review required",
      breakdown: Object.entries(signals).map(([label, signal]) => ({ label, value: Math.round(signal.score), available: signal.available })),
      attributes: Object.entries(signals).filter(([, signal]) => signal.available && signal.score >= 60).map(([label]) => label),
       explanation: `${Object.entries(signals).filter(([, signal]) => signal.available).map(([name]) => name).join(", ") || "Available details"} signals were compared for a possible recommendation only. This does not confirm identity.`,
      targetReport: { type: target.type === "MISSING" ? "Missing Person" : "Unidentified Person", age: target.approximateAge, gender: target.gender || "Not specified", region: target.broadRegion || "Not specified", description: target.description, photoUrl: showDemoPhotos && target.photos.length ? `/api/reports/${target.publicId}/photo` : null }
    }));

    // Privacy invariant checked by the project QA: Search images and query vectors were discarded.
    return NextResponse.json({
      ok: true,
      recommendations,
      photoAccepted: hasPhoto,
      aiAssistance: { enabled: aiActive, faceOutcome, textEmbeddingUsed: textScores.size > 0, imageGenerated: false, humanReviewRequired: true },
      notice: serviceNotice || (aiActive
        ? `Possible matches are shown below. ${faceOutcome === "NO_FACE" ? "No clear face was found, so only the written details were compared." : faceOutcome === "MULTIPLE_FACES" ? "The photograph contains more than one face, so only the written details were compared." : faceOutcome === "QUALITY_LIMITED" ? "The photograph was not clear enough for face comparison." : faceOutcome === "AVAILABLE" ? "The photograph and written details were compared." : "The written details were compared."} The search photograph was discarded after comparison.`
        : "Possible matches are based on the written details provided. Any search photograph was discarded.")
    });
  } catch (error) {
    console.error("Smart Search failed", error.message);
    return NextResponse.json({ error: "Unable to complete Smart Search." }, { status: 500 });
  } finally {
    photoBytes = null;
  }
}
