import { NextResponse } from "next/server";
import { getCurrentUser, normalizeEmail } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { hashClaimCode, normalizeClaimCode } from "@/lib/report-claims";
import { normalizeTrackingCode } from "@/lib/report-validation";
import { getSettings } from "@/lib/settings";

const genericMismatch = "The case ID, claim code, or account email did not match. Use the same email address entered during submission.";

export async function POST(request) {
  try {
    const settings = await getSettings();
    if (settings.maintenanceMode) {
      return NextResponse.json({ error: "Report claiming is temporarily unavailable. Please retry later." }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.REPORTER) {
      return NextResponse.json({ error: "Reporter sign in is required before claiming a report." }, { status: 401 });
    }

    const body = await request.json();
    const caseId = normalizeTrackingCode(body.caseId);
    const claimCode = normalizeClaimCode(body.claimCode);
    if (!caseId || !claimCode) {
      return NextResponse.json({ error: genericMismatch }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.reportClaim.findFirst({
        where: { report: { publicId: caseId } },
        include: { report: true }
      });

      if (!claim) return { error: genericMismatch, status: 400 };
      if (claim.claimedAt || claim.report.reporterId) {
        return { error: "This report has already been claimed.", status: 409 };
      }

      const now = new Date();
      if (claim.lockedUntil && claim.lockedUntil > now) {
        return { error: "Too many unsuccessful attempts. Wait 15 minutes, then retry.", status: 429 };
      }

      const codeMatches = hashClaimCode(claimCode) === claim.tokenHash;
      const emailMatches = normalizeEmail(user.email) === normalizeEmail(claim.submitterEmail);
      if (!codeMatches || !emailMatches) {
        const previousAttempts = claim.lockedUntil && claim.lockedUntil <= now ? 0 : claim.failedAttempts;
        const failedAttempts = previousAttempts + 1;
        await tx.reportClaim.update({
          where: { id: claim.id },
          data: {
            failedAttempts,
            lockedUntil: failedAttempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null
          }
        });
        return { error: genericMismatch, status: failedAttempts >= 5 ? 429 : 400 };
      }

      const updated = await tx.report.update({
        where: { id: claim.reportId },
        data: { reporterId: user.id }
      });
      await tx.reportClaim.update({
        where: { id: claim.id },
        data: {
          claimedById: user.id,
          claimedAt: now,
          failedAttempts: 0,
          lockedUntil: null
        }
      });
      await tx.timelineEvent.create({
        data: {
          reportId: updated.id,
          title: "Report ownership claimed",
          description: "The submitter verified the one-time claim code after reporter sign-in."
        }
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          reportId: updated.id,
          title: "Report added to your account",
          message: `Case ${updated.publicId} can now be managed from your reporter dashboard.`
        }
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          reportId: updated.id,
          action: "Public report claimed",
          resource: `reports:${updated.publicId}`,
          status: "Ownership verified by one-time claim code and matching account email"
        }
      });

      return { report: updated };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      caseId: result.report.publicId,
      redirectTo: "/reporter/my-reports",
      message: "Report claimed successfully. Possible recommendations remain suggestions only and require human review."
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to claim this report right now. Please retry later." }, { status: 500 });
  }
}
