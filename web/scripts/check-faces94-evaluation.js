const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  chooseDevelopmentThreshold,
  classificationMetrics,
  rankSplit,
  retrievalMetrics,
  validateFaces94Dataset
} = require("../lib/evaluation/faces94-evaluation");
const { evaluationPrisma } = require("./evaluation/faces94-common");

function record(number, type) {
  const padded = String(number).padStart(4, "0");
  return {
    record_id: `HTR-${padded}-${type === "missing" ? "M" : "U"}`,
    identity_code: `HT-ID-${padded}`,
    report_type: type,
    split: "development",
    expected_match_record_id: `HTR-${padded}-${type === "missing" ? "U" : "M"}`
  };
}

async function main() {
  const records = [];
  const vectors = new Map();
  for (let identity = 1; identity <= 3; identity += 1) {
    const missing = record(identity, "missing");
    const unidentified = record(identity, "unidentified");
    records.push(missing, unidentified);
    const base = [identity === 1 ? 1 : 0, identity === 2 ? 1 : 0, identity === 3 ? 1 : 0, 0.1];
    vectors.set(missing.record_id, base);
    vectors.set(unidentified.record_id, [...base.slice(0, 3), 0.11]);
  }
  const ranked = rankSplit(records, vectors);
  const retrieval = retrievalMetrics(ranked.rankings);
  assert.strictEqual(ranked.rankings.length, 6);
  assert.strictEqual(retrieval.recallAt1, 1);
  assert.strictEqual(retrieval.recallAt5, 1);
  assert.strictEqual(retrieval.bothCollectionsSearched, true);
  assert(ranked.rankings.every((query) => query.top.some((item) => item.candidate_type === "missing")));
  assert(ranked.rankings.every((query) => query.top.some((item) => item.candidate_type === "unidentified")));
  const threshold = chooseDevelopmentThreshold(ranked.pairScores);
  const classification = classificationMetrics(ranked.pairScores, threshold.threshold);
  assert.strictEqual(classification.falseNegative, 0);
  assert.strictEqual(classification.falsePositive, 0);

  const runnerSource = fs.readFileSync(path.join(__dirname, "evaluation", "run-faces94.js"), "utf8");
  const importerSource = fs.readFileSync(path.join(__dirname, "evaluation", "import-faces94.js"), "utf8");
  assert(runnerSource.includes('approvalStatus: "NOT_APPROVED_EVALUATION_ONLY"'));
  assert(runnerSource.includes('status: "EVALUATION_ONLY"'));
  assert(importerSource.includes('publicVisible: false'));
  assert(importerSource.includes('visibility: "EVALUATION_ONLY"'));

  const datasetArgumentIndex = process.argv.indexOf("--dataset");
  let dataset = null;
  if (datasetArgumentIndex >= 0) {
    const datasetPath = process.argv[datasetArgumentIndex + 1];
    if (!datasetPath) throw new Error("--dataset requires a folder");
    dataset = await validateFaces94Dataset(datasetPath);
  }

  const workspaceArgumentIndex = process.argv.indexOf("--workspace");
  let database = null;
  if (workspaceArgumentIndex >= 0) {
    const workspace = process.argv[workspaceArgumentIndex + 1];
    if (!workspace) throw new Error("--workspace requires a folder");
    const state = JSON.parse(fs.readFileSync(path.join(workspace, "import-state.json"), "utf8"));
    const prisma = evaluationPrisma(state.databaseUrl);
    try {
      const reports = await prisma.report.findMany({
        where: { publicId: { startsWith: "EVAL-F94-" } },
        select: { type: true, visibility: true, publicVisible: true, status: true }
      });
      database = {
        reports: reports.length,
        missing: reports.filter((item) => item.type === "MISSING").length,
        unidentified: reports.filter((item) => item.type === "UNIDENTIFIED").length,
        publicVisible: reports.filter((item) => item.publicVisible).length,
        evaluationOnly: reports.filter((item) => item.visibility === "EVALUATION_ONLY" && item.status === "EVALUATION_ONLY").length,
        pendingJobs: await prisma.aIProcessingJob.count({ where: { jobType: "EVALUATION_FACE_EMBEDDING", status: "PENDING" } })
      };
      assert.deepStrictEqual(database, { reports: 200, missing: 100, unidentified: 100, publicVisible: 0, evaluationOnly: 200, pendingJobs: 200 });
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mechanics: {
      queries: ranked.rankings.length,
      recallAt1: retrieval.recallAt1,
      bothCollectionsSearched: retrieval.bothCollectionsSearched,
      selectedThreshold: threshold.threshold,
      falsePositive: classification.falsePositive,
      falseNegative: classification.falseNegative
    },
    dataset: dataset ? { datasetRoot: dataset.datasetRoot, ...dataset.summary } : "not requested",
    database: database || "not requested"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
