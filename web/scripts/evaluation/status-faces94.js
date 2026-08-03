const path = require("path");
const {
  evaluationPrisma,
  parseArgs,
  resolveEvaluationDatabaseUrl,
  resolveWorkspace
} = require("./faces94-common");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = resolveWorkspace(args);
  const databaseUrl = resolveEvaluationDatabaseUrl(args, workspace);
  const prisma = evaluationPrisma(databaseUrl);

  try {
    const [embeddings, jobs, reports, recommendations, latestRun] = await Promise.all([
      prisma.reportFaceEmbedding.count(),
      prisma.aIProcessingJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.report.groupBy({ by: ["aiProcessingStatus"], _count: { _all: true } }),
      prisma.recommendation.count(),
      prisma.evaluationRun.findFirst({ orderBy: { executedAt: "desc" } })
    ]);

    console.log(JSON.stringify({
      workspace: path.resolve(workspace),
      embeddings,
      jobs: Object.fromEntries(jobs.map((item) => [item.status, item._count._all])),
      reports: Object.fromEntries(reports.map((item) => [item.aiProcessingStatus, item._count._all])),
      recommendations,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            datasetVersion: latestRun.datasetVersion,
            approvalStatus: latestRun.approvalStatus,
            executedAt: latestRun.executedAt
          }
        : null
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
