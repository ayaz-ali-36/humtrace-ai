import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { invalidateReportAI } from "@/lib/ai/invalidation";
import { cancelReportAIJobs, enqueueReportAI } from "@/lib/ai/jobs";

export async function PATCH(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.REPORTER) return NextResponse.json({ error: "Reporter sign in is required." }, { status: 401 });
    const body = await request.json();
    const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
    const action = body.action === "enable" ? "enable" : body.action === "withdraw" ? "withdraw" : "";
    if (!publicId || !action) return NextResponse.json({ error: "Invalid processing-basis request." }, { status: 400 });
    if (action === "enable" && body.acknowledged !== true) return NextResponse.json({ error: "Processing permission acknowledgment is required." }, { status: 400 });
    const existing = await prisma.report.findUnique({ where: { publicId } });
    if (!existing) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (existing.reporterId !== user.id) return NextResponse.json({ error: "You can only manage your own report permission." }, { status: 403 });
    if (action === "enable" && existing.lifecycleStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Reopen this report before enabling AI assistance." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "withdraw") {
        const report = await tx.report.update({ where: { id: existing.id }, data: { aiProcessingAllowed: false, aiProcessingWithdrawnAt: new Date(), aiProcessingStatus: "DISABLED" } });
        await invalidateReportAI(report.id, "PROCESSING_PERMISSION_WITHDRAWN", tx);
        await cancelReportAIJobs(tx, report.id, "PROCESSING_PERMISSION_WITHDRAWN");
        const textDeleted = await tx.reportTextEmbedding.deleteMany({ where: { reportId: report.id } });
        const faceDeleted = await tx.reportFaceEmbedding.deleteMany({ where: { reportId: report.id } });
        await tx.retentionEvent.create({ data: { resourceType: "REPORT_EMBEDDINGS", resourceId: report.publicId, action: "DELETE_AFTER_PERMISSION_WITHDRAWAL", outcome: `Deleted ${textDeleted.count + faceDeleted.count} encrypted embeddings`, completedAt: new Date() } });
        await tx.auditLog.create({ data: { userId: user.id, reportId: report.id, action: "AI processing permission withdrawn", resource: report.publicId, status: "Derived vectors deleted; recommendations invalidated" } });
        return report;
      }
      const status = existing.visibility === "PUBLIC" && existing.publicVisible ? "PENDING" : "WAITING_VISIBILITY";
      const report = await tx.report.update({ where: { id: existing.id }, data: { aiProcessingAllowed: true, aiProcessingPolicyVersion: "phase5-local-1", aiProcessingAllowedAt: new Date(), aiProcessingWithdrawnAt: null, aiProcessingStatus: status } });
      await enqueueReportAI(tx, report, status);
      await tx.auditLog.create({ data: { userId: user.id, reportId: report.id, action: "AI processing permission granted", resource: report.publicId, status: "Possible similarity only; human review required" } });
      return report;
    });
    return NextResponse.json({ ok: true, publicId: result.publicId, aiProcessingAllowed: result.aiProcessingAllowed, aiProcessingStatus: result.aiProcessingStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update AI processing permission." }, { status: 500 });
  }
}
