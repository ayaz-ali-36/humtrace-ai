import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_REQUEST_STATUS, ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const allowedActions = new Set(["view", "dismiss", "suppress", "flag", "request_contact"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.REPORTER) {
      return NextResponse.json({ error: "Reporter sign in is required." }, { status: 401 });
    }

    const body = await request.json();
    const action = clean(body.action);
    const message = clean(body.message);
    if (!allowedActions.has(action)) {
      return NextResponse.json({ error: "Invalid recommendation action." }, { status: 400 });
    }
    if (action === "request_contact" && message.length < 10) {
      return NextResponse.json({ error: "A short contact request reason is required." }, { status: 400 });
    }
    if (action === "request_contact" && body.humanReviewAcknowledged !== true) {
      return NextResponse.json({ error: "Confirm human review before requesting contact." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const recommendation = await tx.recommendation.findUnique({
        where: { id: params.id },
        include: {
          sourceReport: true,
          targetReport: {
            include: {
              reporter: true
            }
          }
        }
      });

      if (!recommendation) return { error: "Recommendation not found.", statusCode: 404 };
      if (recommendation.sourceReport.reporterId !== user.id) {
        return { error: "You can only update recommendations for your own reports.", statusCode: 403 };
      }
      if (recommendation.invalidatedAt || (recommendation.expiresAt && recommendation.expiresAt <= new Date())) {
        return { error: "This possible recommendation is no longer active.", statusCode: 409 };
      }
      if (action === "request_contact" && recommendation.status === "DISMISSED") {
        return { error: "A dismissed or suppressed recommendation cannot be used to request contact.", statusCode: 409 };
      }

      if (action === "view") {
        const updated = await tx.recommendation.update({
          where: { id: recommendation.id },
          data: { status: ["DISMISSED", "CONTACT_REQUESTED"].includes(recommendation.status) ? recommendation.status : "VIEWED" }
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            reportId: recommendation.sourceReportId,
            action: "Recommendation viewed",
            resource: recommendation.id,
            status: updated.status
          }
        });
        return { recommendation: updated };
      }

      if (action === "dismiss") {
        const updated = await tx.recommendation.update({
          where: { id: recommendation.id },
          data: { status: "DISMISSED" }
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            reportId: recommendation.sourceReportId,
            action: "Recommendation dismissed",
            resource: recommendation.id,
            status: updated.status
          }
        });
        return { recommendation: updated };
      }

      if (action === "suppress") {
        const reason = clean(body.reason) || "Not relevant to my case";
        await tx.suppressedPair.upsert({
          where: { sourceReportId_targetReportId_scoringVersion: { sourceReportId: recommendation.sourceReportId, targetReportId: recommendation.targetReportId, scoringVersion: recommendation.scoringVersion || "phase4-deterministic-1" } },
          update: { reason: reason.slice(0, 120), expiresAt: null },
          create: { sourceReportId: recommendation.sourceReportId, targetReportId: recommendation.targetReportId, scoringVersion: recommendation.scoringVersion || "phase4-deterministic-1", reason: reason.slice(0, 120) }
        });
        await tx.recommendationFeedback.create({ data: { recommendationId: recommendation.id, userId: user.id, action: "SUPPRESS", reason: reason.slice(0, 120) } });
        const updated = await tx.recommendation.update({ where: { id: recommendation.id }, data: { status: "DISMISSED" } });
        return { recommendation: updated };
      }

      if (action === "flag") {
        const reason = clean(body.reason) || "Quality concern";
        await tx.recommendationFeedback.create({ data: { recommendationId: recommendation.id, userId: user.id, action: "FLAG", reason: reason.slice(0, 120), notes: clean(body.notes).slice(0, 500) || null } });
        await tx.auditLog.create({ data: { userId: user.id, reportId: recommendation.sourceReportId, action: "Recommendation quality flagged", resource: recommendation.id, status: "Operational review only; no identity determination" } });
        return { recommendation };
      }

      if (recommendation.targetReport.status === "HIDDEN" || recommendation.targetReport.visibility !== "PUBLIC" || !recommendation.targetReport.publicVisible) {
        return { error: "Contact requests can only be created for public recommendations.", statusCode: 403 };
      }
      if (recommendation.sourceReport.lifecycleStatus !== "ACTIVE" || recommendation.sourceReport.visibility !== "PUBLIC" || !recommendation.sourceReport.publicVisible) {
        return { error: "Your linked report must be active and public before requesting contact.", statusCode: 409 };
      }
      if (recommendation.targetReport.lifecycleStatus !== "ACTIVE" || !recommendation.targetReport.consentToContact) {
        return { error: "The related report is not accepting contact requests.", statusCode: 409 };
      }
      if (!recommendation.targetReport.reporterId || !recommendation.targetReport.reporter) {
        return { error: "The related public submission has not yet been claimed. Contact remains unavailable until its reporter verifies ownership.", statusCode: 409 };
      }
      if (recommendation.targetReport.reporterId === user.id) {
        return { error: "You cannot request contact for your own report.", statusCode: 400 };
      }

      const activeKey = `${user.id}:${recommendation.targetReportId}`;
      const existing = await tx.contactRequest.findUnique({ where: { activeKey } });
      const contactRequest = existing || await tx.contactRequest.create({
        data: {
          requesterId: user.id,
          recipientId: recommendation.targetReport.reporterId,
          requesterReportId: recommendation.sourceReportId,
          targetReportId: recommendation.targetReportId,
          message,
          status: CONTACT_REQUEST_STATUS.PENDING,
          activeKey
        }
      });

      const updated = await tx.recommendation.update({
        where: { id: recommendation.id },
        data: { status: "CONTACT_REQUESTED" }
      });

      await tx.notification.create({
        data: {
          userId: recommendation.targetReport.reporterId,
          reportId: recommendation.targetReportId,
          title: "Contact request received",
          message: `A reporter requested contact about ${recommendation.targetReport.publicId}.`
        }
      });

      await tx.timelineEvent.create({
        data: {
          reportId: recommendation.sourceReportId,
          title: "Contact requested from possible recommendation",
          description: "Contact details remain hidden until the recipient accepts."
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          reportId: recommendation.sourceReportId,
          action: "Recommendation contact requested",
          resource: recommendation.id,
          status: updated.status
        }
      });

      return { recommendation: updated, contactRequest };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json({
      ok: true,
      id: result.recommendation.id,
      status: result.recommendation.status,
      requestId: result.contactRequest?.id || null,
      contact: null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update recommendation." }, { status: 500 });
  }
}
