const fs = require("fs/promises");
const path = require("path");
const {
  DATASET_VERSION,
  SCORING_VERSION,
  SPLITS,
  chooseDevelopmentThreshold,
  classificationMetrics,
  rankSplit,
  retrievalMetrics,
  toCsv,
  validateFaces94Dataset
} = require("../../lib/evaluation/faces94-evaluation");
const {
  aiRequest,
  decryptVector,
  encryptVector,
  evaluationPrisma,
  loadLocalEnv,
  parseArgs,
  resolveEvaluationDatabaseUrl,
  resolveWorkspace,
  writeJson
} = require("./faces94-common");

function percentage(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function metricBlock(name, metrics) {
  return [
    `### ${name}`,
    "",
    `- Queries evaluated: ${metrics.retrieval.evaluatedQueries}`,
    `- Recall@1: ${percentage(metrics.retrieval.recallAt1)}`,
    `- Recall@5: ${percentage(metrics.retrieval.recallAt5)}`,
    `- Recall@10: ${percentage(metrics.retrieval.recallAt10)}`,
    `- Mean reciprocal rank: ${metrics.retrieval.meanReciprocalRank.toFixed(4)}`,
    `- Both missing and unidentified collections searched: ${metrics.retrieval.bothCollectionsSearched ? "yes" : "no"}`,
    `- Threshold: ${metrics.classification.threshold}`,
    `- Precision: ${percentage(metrics.classification.precision)}`,
    `- Recall at threshold: ${percentage(metrics.classification.recall)}`,
    `- False-match rate: ${percentage(metrics.classification.falseMatchRate)}`,
    `- False-non-match rate: ${percentage(metrics.classification.falseNonMatchRate)}`,
    ""
  ].join("\n");
}

async function persistEmbedding(prisma, record, model, result) {
  const aad = `${record.databaseReportId}|FACE|${model.id}|1`;
  const encrypted = encryptVector(result.embedding, aad);
  await prisma.$transaction([
    prisma.reportFaceEmbedding.upsert({
      where: { reportId_modelId: { reportId: record.databaseReportId, modelId: model.id } },
      update: {
        reportPhotoId: record.databasePhotoId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        dimensions: result.dimensions,
        inputHash: record.imageSha256,
        inputVersion: 1,
        invalidatedAt: null,
        deletedAt: null
      },
      create: {
        reportId: record.databaseReportId,
        reportPhotoId: record.databasePhotoId,
        modelId: model.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        dimensions: result.dimensions,
        inputHash: record.imageSha256,
        inputVersion: 1
      }
    }),
    prisma.reportPhoto.update({ where: { id: record.databasePhotoId }, data: { faceCheckStatus: "AVAILABLE" } }),
    prisma.report.update({ where: { id: record.databaseReportId }, data: { aiProcessingStatus: "EMBEDDED" } }),
    prisma.aIProcessingJob.update({
      where: { idempotencyKey: `EVALUATION_FACE:${record.databaseReportId}:1` },
      data: { status: "SUCCEEDED", completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null, safeErrorCode: null }
    })
  ]);
}

async function markLimited(prisma, record, outcome) {
  await prisma.$transaction([
    prisma.reportPhoto.update({ where: { id: record.databasePhotoId }, data: { faceCheckStatus: outcome } }),
    prisma.report.update({ where: { id: record.databaseReportId }, data: { aiProcessingStatus: "LIMITED" } }),
    prisma.aIProcessingJob.update({
      where: { idempotencyKey: `EVALUATION_FACE:${record.databaseReportId}:1` },
      data: { status: "SUCCEEDED", completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null, safeErrorCode: outcome }
    })
  ]);
}

async function ensureFaceEmbeddings(prisma, state) {
  const outcomes = { AVAILABLE: 0, NO_FACE: 0, MULTIPLE_FACES: 0, QUALITY_LIMITED: 0 };
  for (let index = 0; index < state.records.length; index += 1) {
    const record = state.records[index];
    const existing = await prisma.reportFaceEmbedding.findUnique({
      where: { reportId_modelId: { reportId: record.databaseReportId, modelId: state.model.id } }
    });
    if (existing && existing.inputHash === record.imageSha256 && existing.inputVersion === 1 && !existing.invalidatedAt && !existing.deletedAt) {
      outcomes.AVAILABLE += 1;
      continue;
    }
    await prisma.aIProcessingJob.update({
      where: { idempotencyKey: `EVALUATION_FACE:${record.databaseReportId}:1` },
      data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), completedAt: null, safeErrorCode: null }
    });
    try {
      const bytes = await fs.readFile(record.imagePath);
      const result = await aiRequest("/ai/face-embedding", { bytes, contentType: "image/jpeg" });
      if (result.outcome === "AVAILABLE") {
        if (result.modelId !== state.model.id || result.modelVersion !== state.model.version || result.dimensions !== state.model.dimensions || !Array.isArray(result.embedding) || result.embedding.length !== result.dimensions || result.embedding.some((value) => !Number.isFinite(value))) throw new Error(`EVALUATION_FACE_RESPONSE_INVALID_${record.recordId}`);
        await persistEmbedding(prisma, record, state.model, result);
      } else if (["NO_FACE", "MULTIPLE_FACES", "QUALITY_LIMITED"].includes(result.outcome)) {
        await markLimited(prisma, record, result.outcome);
      } else {
        throw new Error(`EVALUATION_FACE_OUTCOME_INVALID_${record.recordId}`);
      }
      outcomes[result.outcome] += 1;
    } catch (error) {
      await prisma.$transaction([
        prisma.report.update({ where: { id: record.databaseReportId }, data: { aiProcessingStatus: "LIMITED" } }),
        prisma.aIProcessingJob.update({
          where: { idempotencyKey: `EVALUATION_FACE:${record.databaseReportId}:1` },
          data: { status: "FAILED", completedAt: new Date(), safeErrorCode: String(error.message || "EVALUATION_AI_FAILED").replace(/[^A-Z0-9_\-]/gi, "_").slice(0, 80) }
        })
      ]).catch(() => {});
      throw error;
    }
    if ((index + 1) % 10 === 0 || index + 1 === state.records.length) console.log(`Face embeddings: ${index + 1}/${state.records.length}`);
  }
  return outcomes;
}

async function loadVectors(prisma, state) {
  const embeddings = await prisma.reportFaceEmbedding.findMany({
    where: { reportId: { in: state.records.map((record) => record.databaseReportId) }, modelId: state.model.id, invalidatedAt: null, deletedAt: null }
  });
  const recordByDatabaseId = new Map(state.records.map((record) => [record.databaseReportId, record]));
  const vectors = new Map();
  for (const embedding of embeddings) {
    const record = recordByDatabaseId.get(embedding.reportId);
    if (!record || embedding.inputHash !== record.imageSha256 || embedding.inputVersion !== 1) continue;
    const aad = `${record.databaseReportId}|FACE|${state.model.id}|1`;
    vectors.set(record.recordId, decryptVector(embedding, aad));
  }
  return vectors;
}

async function verifyCosineParity(vectors) {
  const entries = [...vectors.entries()].slice(0, 4);
  if (entries.length < 3) return { checked: false, reason: "INSUFFICIENT_VECTORS" };
  const [sourceId, source] = entries[0];
  const candidates = entries.slice(1).map(([id, vector]) => ({ id, vector }));
  const remote = await aiRequest("/ai/cosine-similarity", { json: { source, candidates }, timeoutMs: 15000 });
  if (!Array.isArray(remote.results) || remote.results.length !== candidates.length) throw new Error("EVALUATION_COSINE_PARITY_RESPONSE_INVALID");
  const localModule = require("../../lib/evaluation/faces94-evaluation");
  let maximumDifference = 0;
  for (const item of remote.results) {
    const candidate = candidates.find((entry) => entry.id === item.id);
    const local = localModule.cosineSimilarity(source, candidate.vector);
    maximumDifference = Math.max(maximumDifference, Math.abs(local - item.similarity));
  }
  if (maximumDifference > 0.01) throw new Error("EVALUATION_COSINE_PARITY_FAILED");
  return { checked: true, sourceId, candidates: candidates.length, maximumDifference };
}

async function storeRecommendations(prisma, state, splitResults) {
  const databaseIdByRecordId = new Map(state.records.map((record) => [record.recordId, record.databaseReportId]));
  const reportIds = state.records.map((record) => record.databaseReportId);
  await prisma.recommendation.deleteMany({ where: { OR: [{ sourceReportId: { in: reportIds } }, { targetReportId: { in: reportIds } }] } });
  let stored = 0;
  for (const split of SPLITS) {
    for (const query of splitResults[split].rankings) {
      for (const item of query.top) {
        await prisma.recommendation.create({
          data: {
            sourceReportId: databaseIdByRecordId.get(query.source_record_id),
            targetReportId: databaseIdByRecordId.get(item.candidate_record_id),
            score: Math.round(item.score),
            qualityLabel: "Evaluation-only possible face similarity",
            sharedAttributes: JSON.stringify(["Face similarity only", "Mandatory human review"]),
            breakdownSummary: JSON.stringify([{ label: "Face similarity", value: Number(item.score.toFixed(4)), available: true }]),
            status: "EVALUATION_ONLY",
            faceModelVersion: state.model.version,
            textModelVersion: null,
            scoringVersion: SCORING_VERSION,
            modalityScoresJson: JSON.stringify({ face: { available: true, score: Number(item.score.toFixed(4)) } }),
            modalityMask: "face",
            availableWeight: 0.4
          }
        });
        stored += 1;
      }
    }
  }
  return stored;
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  const workspace = resolveWorkspace(options);
  const statePath = path.join(workspace, "import-state.json");
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  if (state.datasetVersion !== DATASET_VERSION || state.scoringVersion !== SCORING_VERSION || state.safety?.evaluationOnly !== true || state.safety?.publicDeploymentAllowed !== false) throw new Error("EVALUATION_IMPORT_STATE_INVALID");
  const validated = await validateFaces94Dataset(state.datasetRoot);
  if (validated.rows.some((row) => state.records.find((item) => item.recordId === row.record_id)?.imageSha256 !== row.image_sha256)) throw new Error("EVALUATION_DATASET_CHANGED_AFTER_IMPORT");
  const databaseUrl = resolveEvaluationDatabaseUrl(options, workspace);
  if (databaseUrl !== state.databaseUrl) throw new Error("EVALUATION_DATABASE_URL_DOES_NOT_MATCH_IMPORT");
  const health = await aiRequest("/health", { timeoutMs: 5000 });
  if (health.status !== "ok" || health.generativeImages !== false || health.models?.face?.id !== state.model.id) throw new Error("EVALUATION_AI_HEALTH_INVALID");

  const prisma = evaluationPrisma(databaseUrl);
  const startedAt = new Date();
  try {
    const outcomes = await ensureFaceEmbeddings(prisma, state);
    const vectors = await loadVectors(prisma, state);
    const cosineParity = await verifyCosineParity(vectors);
    const splitResults = {};
    for (const split of SPLITS) {
      const records = validated.rows.filter((record) => record.split === split);
      splitResults[split] = rankSplit(records, vectors);
    }
    const developmentThreshold = chooseDevelopmentThreshold(splitResults.development.pairScores);
    const threshold = developmentThreshold.threshold;
    const metrics = {};
    for (const split of SPLITS) {
      metrics[split] = {
        retrieval: retrievalMetrics(splitResults[split].rankings),
        classification: classificationMetrics(splitResults[split].pairScores, threshold),
        directionalPairs: splitResults[split].pairScores.length,
        positivePairs: splitResults[split].pairScores.filter((pair) => pair.identity_match).length,
        negativePairs: splitResults[split].pairScores.filter((pair) => !pair.identity_match).length
      };
    }
    const storedRecommendations = await storeRecommendations(prisma, state, splitResults);
    const completedAt = new Date();
    const run = {
      evaluationOnly: true,
      approvalStatus: "NOT_APPROVED_EVALUATION_ONLY",
      datasetVersion: DATASET_VERSION,
      scoringVersion: SCORING_VERSION,
      model: state.model,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationSeconds: (completedAt.getTime() - startedAt.getTime()) / 1000,
      embeddingOutcomes: outcomes,
      embeddingCoverage: vectors.size / state.records.length,
      cosineParity,
      selectedDevelopmentThreshold: threshold,
      metrics,
      recommendationsStored: storedRecommendations,
      limitations: [
        "Faces94 contains photographs of real research participants; HumTrace case metadata is wholly synthetic.",
        "The dataset is controlled and not representative of real missing-person imagery or Pakistan deployment conditions.",
        "No evidence in this package establishes participant consent for this specific missing-person use case.",
        "Face-only evaluation does not validate synthetic text, locations, ages, or other metadata signals.",
        "Results cannot approve public deployment, identity confirmation, or normal user-visible model activation."
      ]
    };
    await prisma.evaluationRun.create({
      data: {
        modelVersionsJson: JSON.stringify({ [state.model.id]: state.model.version }),
        datasetVersion: DATASET_VERSION,
        scoringVersion: SCORING_VERSION,
        metricsJson: JSON.stringify(run.metrics),
        limitationsJson: JSON.stringify(run.limitations),
        approvalStatus: run.approvalStatus,
        recommendedThreshold: threshold,
        executedAt: completedAt
      }
    });

    const recommendationRows = [];
    const queryRows = [];
    for (const split of SPLITS) {
      for (const query of splitResults[split].rankings) {
        queryRows.push({ split, ...query, top: undefined });
        for (const item of query.top) recommendationRows.push({ split, ...item });
      }
    }
    await writeJson(path.join(workspace, "metrics.json"), run);
    await fs.writeFile(path.join(workspace, "query-ranks.csv"), toCsv(queryRows, ["split", "source_record_id", "source_type", "expected_match_record_id", "expected_match_rank", "expected_match_score", "candidate_count", "searched_missing_collection", "searched_unidentified_collection"]), "utf8");
    await fs.writeFile(path.join(workspace, "ranked-recommendations.csv"), toCsv(recommendationRows, ["split", "source_record_id", "source_type", "candidate_record_id", "candidate_type", "identity_match", "score", "rank"]), "utf8");
    const report = [
      "# HumanTrace Faces94 evaluation",
      "",
      `Date: ${completedAt.toISOString().slice(0, 10)}`,
      "",
      "Decision: **NOT APPROVED FOR PUBLIC OR NORMAL USER-VISIBLE ACTIVATION**",
      "",
      `Embedding coverage: ${percentage(run.embeddingCoverage)} (${vectors.size}/${state.records.length})`,
      `Stored evaluation-only ranked recommendations: ${storedRecommendations}`,
      `Development-selected face threshold: ${threshold}`,
      "",
      metricBlock("Development", metrics.development),
      metricBlock("Validation", metrics.validation),
      metricBlock("Final evaluation", metrics.final_evaluation),
      "## Limitations",
      "",
      ...run.limitations.map((item) => `- ${item}`),
      "",
      "The release gate remains closed regardless of measured scores."
    ].join("\n");
    await fs.writeFile(path.join(workspace, "EVALUATION_REPORT.md"), report + "\n", "utf8");
    console.log(JSON.stringify({ ok: true, workspace, embeddingCoverage: run.embeddingCoverage, threshold, metrics, recommendationsStored: storedRecommendations, approvalStatus: run.approvalStatus }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
