import { prisma } from "@/lib/prisma";

export async function invalidateReportAI(reportId, reason, tx = prisma) {
  const now = new Date();
  await tx.reportTextEmbedding.updateMany({ where: { reportId, invalidatedAt: null }, data: { invalidatedAt: now } });
  await tx.reportFaceEmbedding.updateMany({ where: { reportId, invalidatedAt: null }, data: { invalidatedAt: now } });
  await tx.recommendation.updateMany({
    where: { OR: [{ sourceReportId: reportId }, { targetReportId: reportId }], invalidatedAt: null },
    data: { invalidatedAt: now, invalidationReason: String(reason || "REPORT_CHANGED").slice(0, 80) }
  });
}
