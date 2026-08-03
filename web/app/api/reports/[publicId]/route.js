import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { invalidateReportAI } from "@/lib/ai/invalidation";
import { cancelReportAIJobs, enqueueReportAI } from "@/lib/ai/jobs";
import { cancelPendingContactRequests } from "@/lib/contact-requests";

const adminStatuses = new Set(["UNDER_REVIEW", "PUBLIC", "HIDDEN", "ARCHIVED"]);
const reporterActions = new Set(["edit", "close", "reopen", "archive"]);
const clean = (value, max = 1200) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json();
    const existing = await prisma.report.findUnique({ where: { publicId: params.publicId } });
    if (!existing) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    if (user.role === ROLES.ADMIN) {
      const status = body.status;
      if (!adminStatuses.has(status)) return NextResponse.json({ error: "Invalid moderation status." }, { status: 400 });
      if (existing.status === "ARCHIVED" && status === "PUBLIC") return NextResponse.json({ error: "Archived reports must be restored to review before public visibility." }, { status: 400 });
      if (existing.lifecycleStatus === "CLOSED" && ["UNDER_REVIEW", "PUBLIC"].includes(status)) return NextResponse.json({ error: "Only the reporter can reopen a closed report." }, { status: 409 });
      if (status === "PUBLIC" && !existing.publicVisible) return NextResponse.json({ error: "The reporter did not request public visibility for this report." }, { status: 409 });
      if (status === "PUBLIC" && body.humanReviewAcknowledged !== true) return NextResponse.json({ error: "Confirm human content and private-photo review before making this report public." }, { status: 400 });
      const visibility = status === "PUBLIC" ? "PUBLIC" : status === "HIDDEN" || status === "ARCHIVED" ? "HIDDEN" : "LIMITED";
      const report = await prisma.$transaction(async (tx) => {
        const updated = await tx.report.update({
          where: { id: existing.id },
          data: {
            status,
            visibility,
            lifecycleStatus: status === "ARCHIVED" ? "ARCHIVED" : existing.lifecycleStatus === "CLOSED" ? "CLOSED" : "ACTIVE",
            aiProcessingStatus: existing.aiProcessingAllowed ? (status === "PUBLIC" ? "PENDING" : "WAITING_REVIEW") : "DISABLED"
          }
        });
        if (status === "PUBLIC") {
          await tx.reportPhoto.updateMany({ where: { reportId: updated.id, deletedAt: null }, data: { reviewStatus: "ACCEPTED" } });
        }
        await invalidateReportAI(updated.id, "ADMIN_STATUS_CHANGE", tx);
        if (status === "PUBLIC" && updated.aiProcessingAllowed && !updated.aiProcessingWithdrawnAt) await enqueueReportAI(tx, updated, "PENDING");
        else await cancelReportAIJobs(tx, updated.id, "ADMIN_STATUS_CHANGE");
        if (status !== "PUBLIC") await cancelPendingContactRequests(tx, updated.id, "Report left public review");
        await tx.timelineEvent.create({ data: { reportId: updated.id, title: "Moderation status updated", description: `Report moved to ${status}.` } });
        if (updated.reporterId) {
          await tx.notification.create({ data: { userId: updated.reporterId, reportId: updated.id, title: "Report status updated", message: `Case ${updated.publicId} status changed to ${status}.` } });
        }
        await tx.auditLog.create({ data: { userId: user.id, reportId: updated.id, action: "Report moderation updated", resource: `reports:${updated.publicId}`, status: `Admin moderation changed ${existing.status} to ${status}` } });
        return updated;
      });
      return NextResponse.json({ ok: true, publicId: report.publicId, status: report.status, visibility: report.visibility });
    }

    if (user.role !== ROLES.REPORTER || existing.reporterId !== user.id) return NextResponse.json({ error: "You can only manage your own reports." }, { status: 403 });
    const action = clean(body.action, 20).toLowerCase();
    if (!reporterActions.has(action)) return NextResponse.json({ error: "Invalid reporter action." }, { status: 400 });
    let data = {};
    if (action === "edit") {
      if (!["SUBMITTED", "UNDER_REVIEW", "PUBLIC"].includes(existing.status)) return NextResponse.json({ error: "This report must be reopened before editing." }, { status: 409 });
      const fullName = clean(body.fullName ?? body.name, 120); const age = clean(body.approximateAge ?? body.age, 40); const description = clean(body.description, 1200);
      const heightCm = Number(body.heightCm); const weightKg = Number(body.weightKg);
      if (existing.type === "MISSING" && fullName.length < 2) return NextResponse.json({ error: "Missing-person name is required." }, { status: 400 });
      if (!age || description.length < 10 || !Number.isInteger(heightCm) || heightCm < 30 || heightCm > 260 || !Number.isInteger(weightKg) || weightKg < 2 || weightKg > 300) return NextResponse.json({ error: "Age, realistic height/weight, and a 10+ character description are required." }, { status: 400 });
      const visibility = existing.publicVisible ? "PUBLIC" : "LIMITED";
      data = { fullName: fullName || null, nameUnknown: existing.type === "UNIDENTIFIED" && !fullName, approximateAge: age, gender: clean(body.gender, 30) || null, heightCm, weightKg, broadRegion: clean(body.broadRegion ?? body.region, 120) || "Not specified", description, clothing: clean(body.clothing, 500) || null, identifyingFeatures: clean(body.identifyingFeatures, 500) || null, status: existing.publicVisible ? "PUBLIC" : "SUBMITTED", visibility, lifecycleStatus: "ACTIVE", contentVersion: { increment: 1 }, aiProcessingStatus: existing.aiProcessingAllowed ? existing.publicVisible ? "PENDING" : "WAITING_VISIBILITY" : "DISABLED" };
    }
    if (action === "close") data = { status: "CLOSED_BY_REPORTER", visibility: "HIDDEN", lifecycleStatus: "CLOSED", aiProcessingStatus: "DISABLED" };
    if (action === "archive") data = { status: "ARCHIVED", visibility: "HIDDEN", lifecycleStatus: "ARCHIVED", aiProcessingStatus: "DISABLED" };
    if (action === "reopen") data = { status: existing.publicVisible ? "PUBLIC" : "SUBMITTED", visibility: existing.publicVisible ? "PUBLIC" : "LIMITED", lifecycleStatus: "ACTIVE", aiProcessingStatus: existing.aiProcessingAllowed ? existing.publicVisible ? "PENDING" : "WAITING_VISIBILITY" : "DISABLED" };
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.report.update({ where: { id: existing.id }, data });
      const lifecycleTitles = {
        close: "Report closed by reporter",
        reopen: "Report reopened by reporter",
        archive: "Report archived by reporter"
      };
      await tx.timelineEvent.create({ data: { reportId: report.id, title: action === "edit" ? "Report details updated" : lifecycleTitles[action], description: action === "edit" ? "Edited details re-entered the reporter-led recommendation workflow; Admin may moderate afterward." : "Reporter-owned lifecycle action completed without confirming identity." } });
      await tx.auditLog.create({ data: { userId: user.id, reportId: report.id, action: `Reporter report ${action}`, resource: `reports:${report.publicId}`, status: `${existing.status} to ${report.status}` } });
      await invalidateReportAI(report.id, "REPORT_" + action.toUpperCase(), tx);
      if (["edit", "reopen"].includes(action) && report.aiProcessingAllowed && !report.aiProcessingWithdrawnAt) await enqueueReportAI(tx, report, report.visibility === "PUBLIC" ? "PENDING" : "WAITING_VISIBILITY");
      if (["close", "archive"].includes(action)) await cancelReportAIJobs(tx, report.id, "REPORT_" + action.toUpperCase());
      await cancelPendingContactRequests(tx, report.id, `Reporter action: ${action}`);
      return report;
    });
    return NextResponse.json({ ok: true, report: { id: updated.publicId, status: updated.status, visibility: updated.visibility, rawStatus: updated.status, name: updated.nameUnknown ? "Unknown Person" : updated.fullName, age: updated.approximateAge, gender: updated.gender || "Not specified", region: updated.broadRegion, description: updated.description, heightCm: updated.heightCm, weightKg: updated.weightKg, clothing: updated.clothing || "", identifyingFeatures: updated.identifyingFeatures || "", aiProcessingStatus: updated.aiProcessingStatus } });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}
