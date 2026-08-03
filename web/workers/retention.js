const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  const now = new Date();
  const invalidatedBefore = new Date(now.getTime() - 30 * 86400000);
  const [textRecords, faceRecords, recommendations] = await Promise.all([
    prisma.reportTextEmbedding.findMany({ where: { OR: [{ expiresAt: { lte: now } }, { invalidatedAt: { lte: invalidatedBefore } }] }, select: { id: true, reportId: true } }),
    prisma.reportFaceEmbedding.findMany({ where: { OR: [{ expiresAt: { lte: now } }, { invalidatedAt: { lte: invalidatedBefore } }] }, select: { id: true, reportId: true } }),
    prisma.recommendation.findMany({ where: { OR: [{ expiresAt: { lte: now } }, { invalidatedAt: { lte: invalidatedBefore } }] }, select: { id: true, sourceReportId: true } })
  ]);
  await prisma.$transaction(async (tx) => {
    if (textRecords.length) await tx.reportTextEmbedding.deleteMany({ where: { id: { in: textRecords.map((item) => item.id) } } });
    if (faceRecords.length) await tx.reportFaceEmbedding.deleteMany({ where: { id: { in: faceRecords.map((item) => item.id) } } });
    if (recommendations.length) await tx.recommendation.deleteMany({ where: { id: { in: recommendations.map((item) => item.id) } } });
    for (const [resourceType, records] of [["TEXT_EMBEDDING", textRecords], ["FACE_EMBEDDING", faceRecords], ["RECOMMENDATION", recommendations]]) {
      if (records.length) await tx.retentionEvent.create({ data: { resourceType, resourceId: "batch", action: "DELETE_EXPIRED_OR_INVALIDATED", outcome: `Deleted ${records.length} records`, completedAt: now } });
    }
  });
  console.log(`Retention complete: ${textRecords.length} text, ${faceRecords.length} face, ${recommendations.length} recommendations deleted.`);
}

run().finally(async () => prisma.$disconnect()).catch((error) => { console.error(error); process.exit(1); });
