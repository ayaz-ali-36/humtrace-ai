import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { resolveApprovedReleaseGate } from "@/lib/ai/release-gate";

const statusLabels = {
  NEW: "New",
  VIEWED: "Viewed",
  DISMISSED: "Dismissed",
  CONTACT_REQUESTED: "Contact Requested",
  PENDING_REVIEW: "New",
  VISIBLE_TO_REPORTER: "New"
};

function numberFromText(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function numericSimilarity(a, b, tolerance) {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  return clamp(100 - (diff / tolerance) * 100);
}

function tokenSet(...values) {
  const stop = new Set(["the", "and", "with", "near", "from", "person", "individual", "missing", "found"]);
  return new Set(values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stop.has(token)));
}

function textSimilarity(a, b) {
  const source = tokenSet(a);
  const target = tokenSet(b);
  if (!source.size || !target.size) return 0;
  const shared = [...source].filter((token) => target.has(token)).length;
  return clamp((shared / Math.max(source.size, target.size)) * 100);
}

function locationSimilarity(source, target) {
  const sourceText = `${source.broadRegion || ""} ${source.specificLocation || ""}`;
  const targetText = `${target.broadRegion || ""} ${target.specificLocation || ""}`;
  if (!sourceText.trim() || !targetText.trim()) return 0;
  if (source.broadRegion && target.broadRegion && source.broadRegion.toLowerCase() === target.broadRegion.toLowerCase()) return 100;
  return textSimilarity(sourceText, targetText);
}

function genderSimilarity(source, target) {
  if (!source.gender || !target.gender) return 0;
  if (source.gender === "Not specified" || target.gender === "Not specified") return 40;
  return source.gender.toLowerCase() === target.gender.toLowerCase() ? 100 : 0;
}

function normalizedWeightedScore(signals) {
  const available = signals.filter((signal) => signal.available);
  const weight = available.reduce((sum, signal) => sum + signal.weight, 0);
  if (!weight) return 0;
  return clamp(available.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / weight);
}

export function scoreReportPair(source, target, options = {}) {
  const ageScore = numericSimilarity(numberFromText(source.approximateAge), numberFromText(target.approximateAge), 20);
  const genderScore = genderSimilarity(source, target);
  const heightScore = numericSimilarity(source.heightCm, target.heightCm, 45);
  const weightScore = numericSimilarity(source.weightKg, target.weightKg, 45);
  const locationScore = locationSimilarity(source, target);
  const deterministicDescriptionScore = textSimilarity(
    `${source.description || ""} ${source.clothing || ""} ${source.identifyingFeatures || ""}`,
    `${target.description || ""} ${target.clothing || ""} ${target.identifyingFeatures || ""}`
  );
  const hasEnglishEmbedding = Number.isFinite(options.textEmbeddingScore);
  const descriptionScore = hasEnglishEmbedding ? options.textEmbeddingScore : deterministicDescriptionScore;
  const faceScore = 0;
  const finalScore = hasEnglishEmbedding
    ? normalizedWeightedScore([
        { value: ageScore, weight: 0.2, available: numberFromText(source.approximateAge) !== null && numberFromText(target.approximateAge) !== null },
        { value: genderScore, weight: 0.1, available: Boolean(source.gender && target.gender) },
        { value: heightScore, weight: 0.15, available: Boolean(source.heightCm && target.heightCm) },
        { value: weightScore, weight: 0.05, available: Boolean(source.weightKg && target.weightKg) },
        { value: locationScore, weight: 0.15, available: Boolean(source.broadRegion && target.broadRegion) },
        { value: descriptionScore, weight: 0.35, available: true }
      ])
    : clamp(
        faceScore * 0.4 +
        ageScore * 0.15 +
        genderScore * 0.1 +
        heightScore * 0.1 +
        weightScore * 0.05 +
        locationScore * 0.1 +
        descriptionScore * 0.1
      );
  const attributes = [];
  if (ageScore >= 60) attributes.push("Age range");
  if (genderScore >= 60) attributes.push("Gender");
  if (heightScore >= 60) attributes.push("Height");
  if (weightScore >= 60) attributes.push("Weight");
  if (locationScore >= 60) attributes.push("Location");
  if (descriptionScore >= 20) attributes.push(hasEnglishEmbedding ? "English description" : "Description");
  if (!attributes.length) attributes.push("Limited similarity signals");

  return {
    score: finalScore,
    qualityLabel: finalScore >= 75 ? "Strong possible similarity" : finalScore >= 45 ? "Moderate possible similarity" : "Low possible similarity",
    sharedAttributes: attributes,
    breakdown: [
      { label: "Face similarity", value: faceScore },
      { label: "Age similarity", value: ageScore },
      { label: "Gender similarity", value: genderScore },
      { label: "Height similarity", value: heightScore },
      { label: "Weight similarity", value: weightScore },
      { label: "Location similarity", value: locationScore },
      { label: hasEnglishEmbedding ? "English text embedding similarity" : "Description similarity", value: descriptionScore }
    ],
    explanation: hasEnglishEmbedding
      ? "Development-only English text embeddings were combined with available structured details. Evaluation is deferred, so this score is not calibrated for release. Human review is required."
      : "Deterministic local scoring compared available age, gender, height, weight, location, and description details. Image similarity is not available in this development slice.",
    textEmbeddingUsed: hasEnglishEmbedding
  };
}

function safeReport(report) {
  const showDemoPhotos = process.env.HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS === "true";
  return {
    id: report.publicId,
    type: report.type === "MISSING" ? "Missing Person" : "Unidentified Person",
    name: report.nameUnknown ? "Unknown Person" : report.fullName,
    age: report.approximateAge,
    gender: report.gender || "Not specified",
    region: report.broadRegion || "Not specified",
    description: report.description,
    photoUrl: showDemoPhotos && report.photos?.length ? `/api/reports/${report.publicId}/photo` : null
  };
}

export function mapRecommendation(row) {
  let breakdown = [];
  let attributes = [];
  try {
    breakdown = JSON.parse(row.breakdownSummary || "[]");
  } catch {
    breakdown = [];
  }
  if (!Array.isArray(breakdown)) {
    breakdown = breakdown && typeof breakdown === "object"
      ? Object.entries(breakdown).map(([label, signal]) => ({
          label: label.replace(/(^|_)([a-z])/g, (_match, _prefix, letter) => ` ${letter.toUpperCase()}`).trim(),
          value: Number(signal?.score) || 0,
          available: signal?.available === true
        }))
      : [];
  }
  try {
    attributes = JSON.parse(row.sharedAttributes || "[]");
  } catch {
    attributes = row.sharedAttributes ? row.sharedAttributes.split(",").map((item) => item.trim()).filter(Boolean) : [];
  }

  return {
    id: row.id,
    reportId: row.sourceReport.publicId,
    similarReportId: row.targetReport.publicId,
    score: row.score,
    qualityLabel: row.qualityLabel,
    status: statusLabels[row.status] || row.status,
    rawStatus: row.status,
    breakdown,
    attributes,
    explanation: row.faceModelVersion || row.textModelVersion
      ? "Available AI-assisted and structured signals produced a possible recommendation. Unavailable signals were not scored. This never confirms identity; human review is required."
      : "Deterministic local details produced this possible recommendation. Human review is required.",
    textEmbeddingUsed: Boolean(row.textModelVersion),
    evaluationStatus: row.textModelVersion ? "Deferred" : null,
    sourceReport: safeReport(row.sourceReport),
    targetReport: safeReport(row.targetReport)
  };
}

export async function generateRecommendationsForReport(reportId, tx = prisma) {
  const settings = await getSettings(tx);
  const source = await tx.report.findUnique({
    where: { id: reportId }
  });
  if (!source) return [];

  const candidates = await tx.report.findMany({
    where: {
      id: { not: source.id },
      lifecycleStatus: "ACTIVE",
      visibility: "PUBLIC",
      publicVisible: true,
      status: { notIn: ["HIDDEN", "ARCHIVED", "CLOSED_BY_REPORTER"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const threshold = settings.recommendationDisplayThreshold;
  const scored = candidates
    .map((candidate) => ({
      candidate,
      result: scoreReportPair(source, candidate)
    }))
    .filter((item) => item.result.score >= threshold)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 10);

  const saved = [];
  for (const item of scored) {
    const row = await tx.recommendation.upsert({
      where: {
        sourceReportId_targetReportId: {
          sourceReportId: source.id,
          targetReportId: item.candidate.id
        }
      },
      update: {
        score: item.result.score,
        qualityLabel: item.result.qualityLabel,
        sharedAttributes: JSON.stringify(item.result.sharedAttributes),
        breakdownSummary: JSON.stringify(item.result.breakdown),
        textModelVersion: null,
        scoringVersion: "phase4-deterministic-1",
        invalidatedAt: null,
        invalidationReason: null,
        status: "NEW"
      },
      create: {
        sourceReportId: source.id,
        targetReportId: item.candidate.id,
        score: item.result.score,
        qualityLabel: item.result.qualityLabel,
        sharedAttributes: JSON.stringify(item.result.sharedAttributes),
        breakdownSummary: JSON.stringify(item.result.breakdown),
        textModelVersion: null,
        scoringVersion: "phase4-deterministic-1",
        status: "NEW"
      },
      include: {
        sourceReport: { include: { photos: { where: { deletedAt: null }, take: 1, select: { id: true } } } },
        targetReport: { include: { photos: { where: { deletedAt: null }, take: 1, select: { id: true } } } }
      }
    });
    saved.push(row);
  }

  if (saved.length) {
    await tx.timelineEvent.create({
      data: {
        reportId: source.id,
        title: "Possible recommendations generated",
        description: saved.length + " public-safe possible recommendations were generated with deterministic local fallback scoring."
      }
    });
  }

  return saved.map(mapRecommendation);
}

export async function getReporterRecommendations(userId) {
  const settings = await getSettings();
  const developmentMode = process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true";
  const releaseGate = developmentMode ? { approved: true } : await resolveApprovedReleaseGate({ faceEnabled: settings.faceSimilarityEnabled, textEnabled: settings.textSimilarityEnabled });
  const phase5Visible = settings.aiAssistanceEnabled && releaseGate.approved;
  const rows = await prisma.recommendation.findMany({
    where: {
      sourceReport: {
        reporterId: userId
      },
      status: {
        not: "DISMISSED"
      },
      invalidatedAt: null
      ,...(phase5Visible ? {} : { OR: [{ scoringVersion: null }, { scoringVersion: { startsWith: "phase4" } }] })
    },
    include: {
      sourceReport: { include: { photos: { where: { deletedAt: null }, take: 1, select: { id: true } } } },
      targetReport: { include: { photos: { where: { deletedAt: null }, take: 1, select: { id: true } } } }
    },
    orderBy: [
      { score: "desc" },
      { createdAt: "desc" }
    ]
  });
  return rows
    .filter((row) => {
      if (!row.scoringVersion?.startsWith("phase5")) return true;
      const modalities = new Set(String(row.modalityMask || "").split(",").filter(Boolean));
      return (!modalities.has("face") || settings.faceSimilarityEnabled) && (!modalities.has("description") || settings.textSimilarityEnabled);
    })
    .map(mapRecommendation);
}
