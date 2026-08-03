export async function cancelPendingContactRequests(tx, reportId, reason = "Linked report is no longer available.") {
  const pending = await tx.contactRequest.findMany({
    where: {
      status: "PENDING",
      OR: [{ requesterReportId: reportId }, { targetReportId: reportId }]
    },
    select: { id: true }
  });
  if (!pending.length) return 0;

  await tx.contactRequest.updateMany({
    where: { id: { in: pending.map((item) => item.id) } },
    data: { status: "CANCELLED", activeKey: null }
  });
  await tx.auditLog.create({
    data: {
      reportId,
      action: "Pending contact requests cancelled",
      resource: `reports:${reportId}`,
      status: `${pending.length} request(s) cancelled: ${String(reason).slice(0, 100)}`
    }
  });
  return pending.length;
}
