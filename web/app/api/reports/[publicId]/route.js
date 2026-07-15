import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { invalidateReportAI } from "@/lib/ai/text-embeddings";

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
      const visibility = status === "PUBLIC" ? "PUBLIC" : status === "HIDDEN" || status === "ARCHIVED" ? "HIDDEN" : "LIMITED";
      const report = await prisma.$transaction(async (tx) => {
        const updated = await tx.report.update({ where: { id: existing.id }, data: { status, visibility, publicVisible: status === "PUBLIC", lifecycleStatus: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE" } });
        await tx.timelineEvent.create({ data: { reportId: updated.id, title: "Moderation status updated", description: `Report moved to ${status}.` } });
        await tx.notification.create({ data: { userId: updated.reporterId, reportId: updated.id, title: "Report status updated", message: `Case ${updated.publicId} status changed to ${status}.` } });
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
      data = { fullName: fullName || null, nameUnknown: existing.type === "UNIDENTIFIED" && !fullName, approximateAge: age, gender: clean(body.gender, 30) || null, heightCm, weightKg, broadRegion: clean(body.broadRegion ?? body.region, 120) || "Not specified", description, clothing: clean(body.clothing, 500) || null, identifyingFeatures: clean(body.identifyingFeatures, 500) || null, status: "UNDER_REVIEW", visibility: "LIMITED", publicVisible: false, lifecycleStatus: "ACTIVE" };
    }
    if (action === "close") data = { status: "CLOSED_BY_REPORTER", visibility: "HIDDEN", publicVisible: false, lifecycleStatus: "CLOSED" };
    if (action === "archive") data = { status: "ARCHIVED", visibility: "HIDDEN", publicVisible: false, lifecycleStatus: "ARCHIVED" };
    if (action === "reopen") data = { status: "UNDER_REVIEW", visibility: "LIMITED", publicVisible: false, lifecycleStatus: "ACTIVE" };
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.report.update({ where: { id: existing.id }, data });
      const lifecycleTitles = {
        close: "Report closed by reporter",
        reopen: "Report reopened by reporter",
        archive: "Report archived by reporter"
      };
      await tx.timelineEvent.create({ data: { reportId: report.id, title: action === "edit" ? "Report details updated" : lifecycleTitles[action], description: action === "edit" ? "Edited details returned to human review." : "Reporter-owned lifecycle action completed without confirming identity." } });
      await tx.auditLog.create({ data: { userId: user.id, reportId: report.id, action: `Reporter report ${action}`, resource: `reports:${report.publicId}`, status: `${existing.status} to ${report.status}` } });
      if (["edit", "close", "archive"].includes(action)) {
        await invalidateReportAI(report.id, "REPORT_" + action.toUpperCase(), tx);
      }
      return report;
    });
    return NextResponse.json({ ok: true, report: { id: updated.publicId, status: updated.status, visibility: updated.visibility, rawStatus: updated.status, name: updated.nameUnknown ? "Unknown Person" : updated.fullName, age: updated.approximateAge, gender: updated.gender || "Not specified", region: updated.broadRegion, description: updated.description, heightCm: updated.heightCm, weightKg: updated.weightKg, clothing: updated.clothing || "", identifyingFeatures: updated.identifyingFeatures || "" } });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}
