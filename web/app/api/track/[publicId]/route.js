import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTrackingCode } from "@/lib/report-validation";
import { getSettings } from "@/lib/settings";

const typeLabels = {
  MISSING: "Missing Person",
  UNIDENTIFIED: "Unidentified Person"
};

const statusLabels = {
  SUBMITTED: "Report Submitted",
  UNDER_REVIEW: "Report Under Review",
  PUBLIC: "Content Review Completed",
  POTENTIAL_MATCHES_AVAILABLE: "Possible Matches Available",
  ACTIVE: "Active",
  ARCHIVED: "Archived"
};

function formatDate(value) {
  if (!value) return "Date not specified";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(value);
}

function safeTimeline(events) {
  return events.map((event) => ({
    title: event.title,
    date: formatDate(event.eventDate),
    summary: "Status update recorded."
  }));
}

export async function GET(_request, { params }) {
  const settings = await getSettings();
  if (!settings.publicSearchEnabled || settings.maintenanceMode) {
    return NextResponse.json({ error: "Public tracking is temporarily unavailable." }, { status: 503 });
  }

  const publicId = normalizeTrackingCode(params.publicId);
  if (!publicId) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const report = await prisma.report.findFirst({
    where: {
      publicId,
      visibility: "PUBLIC",
      publicVisible: true,
      status: { not: "HIDDEN" }
    },
    select: {
      publicId: true,
      type: true,
      status: true,
      lifecycleStatus: true,
      createdAt: true,
      updatedAt: true,
      timelineEvents: {
        orderBy: { eventDate: "asc" },
        select: {
          title: true,
          eventDate: true
        }
      }
    }
  });

  if (!report) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  return NextResponse.json({
    report: {
      id: report.publicId,
      type: typeLabels[report.type] || report.type,
      status: statusLabels[report.status] || statusLabels[report.lifecycleStatus] || "Active",
      date: formatDate(report.createdAt),
      lastUpdate: formatDate(report.updatedAt),
      timeline: safeTimeline(report.timelineEvents)
    }
  });
}
