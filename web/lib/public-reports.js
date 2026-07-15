import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const typeLabels = {
  MISSING: "Missing Person",
  UNIDENTIFIED: "Unidentified Individual"
};

const statusLabels = {
  SUBMITTED: "Report Submitted",
  UNDER_REVIEW: "Report Under Review",
  PUBLIC: "Content Review Completed",
  POTENTIAL_MATCHES_AVAILABLE: "Possible Recommendations Available",
  CLOSED_BY_REPORTER: "Closed by Reporter",
  ARCHIVED: "Archived",
  HIDDEN: "Hidden"
};

function formatDate(value) {
  if (!value) return "Date not specified";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(value);
}

export async function getPublicReports() {
  const settings = await getSettings();
  if (!settings.publicSearchEnabled || settings.maintenanceMode) return [];

  const rows = await prisma.report.findMany({
    where: {
      visibility: "PUBLIC",
      publicVisible: true,
      status: {
        not: "HIDDEN"
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      publicId: true,
      type: true,
      fullName: true,
      nameUnknown: true,
      approximateAge: true,
      gender: true,
      broadRegion: true,
      eventDate: true,
      status: true,
      visibility: true,
      publicVisible: true,
      description: true
    }
  });

  return rows.map((report) => ({
    id: report.publicId,
    type: typeLabels[report.type] || report.type,
    name: report.nameUnknown ? "Unknown Person" : report.fullName,
    age: report.approximateAge,
    gender: report.gender || "Not specified",
    region: report.broadRegion,
    date: formatDate(report.eventDate),
    status: statusLabels[report.status] || report.status,
    visibility: report.visibility === "PUBLIC" ? "Public" : report.visibility,
    description: report.description,
    recommendations: 0,
    score: 0
  }));
}
