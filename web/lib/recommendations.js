import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { englishTextEmbeddingActive, ENGLISH_TEXT_MODEL_VERSION, ENGLISH_TEXT_SCORING_VERSION } from "@/lib/ai/config";
import { englishTextSimilarityScores } from "@/lib/ai/text-embeddings";

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
  return {
    id: report.publicId,
    type: report.type === "MISSING" ? "Missing Person" : "Unidentified Individual",
    name: report.nameUnknown ? "Unknown Person" : report.fullName,
    age: report.approximateAge,
    gender: report.gender || "Not specified",
    region: report.broadRegion || "Not specified",
    description: report.description
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
    explanation: row.textModelVersion
      ? "Development-only English text embeddings were combined with structured details. Evaluation is deferred; human review is required."
      : "Deterministic local details produced this possible recommendation. Human review is required.",
    textEmbeddingUsed: Boolean(row.textModelVersion),
    evaluationStatus: row.textModelVersion ? "Deferred" : null,
    sourceReport: safeReport(row.sourceReport),
    targetReport: safeReport(row.targetReport)
  };
}

export async function generateRecommendationsForReport(reportId, tx = prisma) {
  const settings = await getSettings();
  const source = await tx.report.findUnique({
    where: { id: reportId }
  });
  if (!source) return [];

  const targetType = source.type === "MISSING" ? "UNIDENTIFIED" : "MISSING";
  const candidates = await tx.report.findMany({
    where: {
      type: targetType,
      id: { not: source.id },
      visibility: "PUBLIC",
      publicVisible: true,
      status: { not: "HIDDEN" }
    },
    take: 50,
    orderBy: { createdAt: "desc" }
  });

  let textContext = { scores: new Map(), used: false };
  if (englishTextEmbeddingActive(settings) && source.aiProcessingAllowed && !source.aiProcessingWithdrawnAt) {
    try {
      textContext = await englishTextSimilarityScores(source, candidates);
    } catch (error) {
      console.error("English text embedding scoring unavailable", error.message);
    }
  }
  const threshold = textContext.used
    ? Math.max(settings.recommendationDisplayThreshold, settings.englishTextEmbeddingThreshold)
    : settings.recommendationDisplayThreshold;
  const scored = candidates
    .map((candidate) => ({
      candidate,
      result: scoreReportPair(source, candidate, {
        textEmbeddingScore: textContext.scores.get(candidate.id)
      })
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
        textModelVersion: item.result.textEmbeddingUsed ? ENGLISH_TEXT_MODEL_VERSION : null,
        scoringVersion: item.result.textEmbeddingUsed ? ENGLISH_TEXT_SCORING_VERSION : "phase4-deterministic-1",
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
        textModelVersion: item.result.textEmbeddingUsed ? ENGLISH_TEXT_MODEL_VERSION : null,
        scoringVersion: item.result.textEmbeddingUsed ? ENGLISH_TEXT_SCORING_VERSION : "phase4-deterministic-1",
        status: "NEW"
      },
      include: {
        sourceReport: true,
        targetReport: true
      }
    });
    saved.push(row);
  }

  if (saved.length) {
    await tx.timelineEvent.create({
      data: {
        reportId: source.id,
        title: "Possible recommendations generated",
        description: textContext.used
          ? saved.length + " public-safe possible recommendations were generated with development-only English text embeddings and structured scoring."
          : saved.length + " public-safe possible recommendations were generated with deterministic local scoring."
      }
    });
  }

  return saved.map(mapRecommendation);
}

export async function getReporterRecommendations(userId) {
  const rows = await prisma.recommendation.findMany({
    where: {
      sourceReport: {
        reporterId: userId
      },
      status: {
        not: "DISMISSED"
      },
      invalidatedAt: null
    },
    include: {
      sourceReport: true,
      targetReport: true
    },
    orderBy: [
      { score: "desc" },
      { createdAt: "desc" }
    ]
  });
  return rows.map(mapRecommendation);
}
