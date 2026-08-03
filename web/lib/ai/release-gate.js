import { prisma } from "@/lib/prisma";

export const PHASE5_SCORING_VERSION = "phase5-additive-1";
export const PHASE5_FACE_MODEL_ID = "deepface-facenet";
export const PHASE5_TEXT_MODEL_ID = "sentence-transformers-all-MiniLM-L6-v2";

function evaluatedVersion(versions, modelId) {
  if (typeof versions?.[modelId] === "string") return versions[modelId];
  const item = Array.isArray(versions?.models) ? versions.models.find((model) => model?.id === modelId) : null;
  return item?.version || "";
}

export async function resolveApprovedReleaseGate({ faceEnabled, textEnabled }, tx = prisma) {
  const requiredIds = [faceEnabled ? PHASE5_FACE_MODEL_ID : null, textEnabled ? PHASE5_TEXT_MODEL_ID : null].filter(Boolean);
  if (!requiredIds.length) return { approved: false, reason: "NO_MODALITY_ENABLED", threshold: null };

  const evaluation = await tx.evaluationRun.findFirst({
    where: { approvalStatus: "APPROVED", scoringVersion: PHASE5_SCORING_VERSION },
    orderBy: { executedAt: "desc" }
  });
  if (!evaluation || !Number.isInteger(evaluation.recommendedThreshold)) return { approved: false, reason: "APPROVED_EVALUATION_REQUIRED", threshold: null };

  let versions;
  try {
    versions = JSON.parse(evaluation.modelVersionsJson);
  } catch {
    return { approved: false, reason: "EVALUATION_VERSIONS_INVALID", threshold: null };
  }
  const models = await tx.aIModel.findMany({ where: { id: { in: requiredIds } } });
  const approved = requiredIds.every((id) => {
    const model = models.find((item) => item.id === id);
    return model && model.status === "RELEASE_APPROVED" && model.evaluationStatus === "APPROVED" && evaluatedVersion(versions, id) === model.version;
  });
  return approved
    ? { approved: true, reason: "APPROVED", threshold: evaluation.recommendedThreshold }
    : { approved: false, reason: "MODEL_VERSION_NOT_APPROVED", threshold: null };
}
