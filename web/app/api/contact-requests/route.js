import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_REQUEST_STATUS, ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  try {
    const settings = await getSettings();
    if (settings.maintenanceMode) {
      return NextResponse.json({ error: "Contact requests are temporarily unavailable." }, { status: 503 });
    }

    const body = await request.json();
    const reportId = clean(body.reportId);
    const message = clean(body.message);
    const currentUser = await getCurrentUser();

    if (!reportId || message.length < 10) {
      return NextResponse.json({ error: "A case ID and short reason are required." }, { status: 400 });
    }
    if (!currentUser) {
      return NextResponse.json({ error: "Reporter sign in is required." }, { status: 401 });
    }
    if (currentUser.role !== ROLES.REPORTER) {
      return NextResponse.json({ error: "Only reporters can create contact requests." }, { status: 403 });
    }

    const targetReport = await prisma.report.findUnique({
      where: { publicId: reportId },
      select: {
        id: true,
        publicId: true,
        status: true,
        visibility: true,
        publicVisible: true,
        reporterId: true,
        reporter: {
          select: {
            id: true
          }
        }
      }
    });

    if (!targetReport) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    if (targetReport.status === "HIDDEN" || targetReport.visibility !== "PUBLIC" || !targetReport.publicVisible) {
      return NextResponse.json({ error: "Contact requests can only be created for public reports." }, { status: 403 });
    }

    if (currentUser?.id === targetReport.reporter.id) {
      return NextResponse.json({ error: "You cannot request contact for your own report." }, { status: 400 });
    }

    const contactRequest = await prisma.$transaction(async (tx) => {
      const requester = await tx.user.findUnique({ where: { id: currentUser.id } });
      if (!requester) {
        throw new Error("Authenticated reporter account was not found.");
      }

      const activeKey = `${requester.id}:${targetReport.id}`;
      const existing = await tx.contactRequest.findUnique({ where: { activeKey } });
      if (existing) {
        return existing;
      }

      const created = await tx.contactRequest.create({
        data: {
          requesterId: requester.id,
          recipientId: targetReport.reporter.id,
          targetReportId: targetReport.id,
          message,
          status: CONTACT_REQUEST_STATUS.PENDING,
          activeKey
        }
      });

      await tx.notification.create({
        data: {
          userId: targetReport.reporter.id,
          reportId: targetReport.id,
          title: "Contact request received",
          message: `A reporter asked to connect about ${targetReport.publicId}.`
        }
      });

      await tx.timelineEvent.create({
        data: {
          reportId: targetReport.id,
          title: "Contact request received",
          description: "A consent-based contact request was sent to the reporter."
        }
      });

      await tx.auditLog.create({
        data: {
          userId: requester.id,
          reportId: targetReport.id,
          action: "Contact request created",
          resource: created.id,
          status: "Pending"
        }
      });

      return created;
    });

    return NextResponse.json({
      ok: true,
      requestId: contactRequest.id,
      message: "Contact request saved for reporter review."
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create contact request." }, { status: 500 });
  }
}
