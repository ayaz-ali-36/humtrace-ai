export async function enqueueReportAI(tx, report, status = "PENDING") {
  if (!report.aiProcessingAllowed || report.aiProcessingWithdrawnAt) return null;
  const idempotencyKey = `PROCESS_REPORT:${report.id}:${report.contentVersion || 1}`;
  return tx.aIProcessingJob.upsert({
    where: { idempotencyKey },
    update: {
      status,
      attempts: 0,
      availableAt: new Date(),
      retryAt: null,
      safeErrorCode: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: null,
      completedAt: null
    },
    create: {
      reportId: report.id,
      jobType: "PROCESS_REPORT",
      status,
      idempotencyKey,
      availableAt: new Date()
    }
  });
}

export async function cancelReportAIJobs(tx, reportId, reason = "REPORT_INELIGIBLE") {
  return tx.aIProcessingJob.updateMany({
    where: {
      reportId,
      status: { in: ["PENDING", "RETRYABLE", "WAITING_REVIEW", "WAITING_VISIBILITY", "WAITING_CONFIG", "RUNNING"] }
    },
    data: {
      status: "CANCELLED",
      safeErrorCode: reason.slice(0, 80),
      completedAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null
    }
  });
}
