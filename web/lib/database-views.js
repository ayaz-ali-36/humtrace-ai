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
  HIDDEN: "Hidden",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled"
};

function titleCaseStatus(status) {
  return statusLabels[status] || status;
}

function formatDate(value) {
  if (!value) return "Date not specified";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(value);
}

function monthKey(value) {
  const date = value || new Date();
  return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

function mapReport(report) {
  return {
    id: report.publicId,
    type: typeLabels[report.type] || report.type,
    name: report.nameUnknown ? "Unknown Person" : report.fullName,
    age: report.approximateAge,
    gender: report.gender || "Not specified",
    region: report.broadRegion,
    date: formatDate(report.eventDate || report.createdAt),
    status: titleCaseStatus(report.status),
    visibility: report.visibility === "PUBLIC" ? "Public" : report.visibility === "LIMITED" ? "Limited" : report.visibility,
    description: report.description,
    rawStatus: report.status,
    heightCm: report.heightCm,
    weightKg: report.weightKg,
    clothing: report.clothing || "",
    identifyingFeatures: report.identifyingFeatures || "",
    recommendations: report._count?.sourceRecommendations || 0,
    timeline: report.timelineEvents?.map((event) => ({
      title: event.title,
      date: formatDate(event.eventDate),
      description: event.description || "No additional detail."
    })) || []
  };
}

export async function getTrackReports() {
  const reports = await prisma.report.findMany({
    where: {
      visibility: "PUBLIC",
      publicVisible: true,
      status: { not: "HIDDEN" }
    },
    orderBy: { createdAt: "desc" },
    include: {
      timelineEvents: {
        orderBy: { eventDate: "asc" }
      },
      _count: {
        select: {
          sourceRecommendations: true
        }
      }
    }
  });
  return reports.map(mapReport);
}

export async function getReporterReports(userId) {
  const reports = await prisma.report.findMany({
    where: { reporterId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sourceRecommendations: true
        }
      }
    }
  });
  return reports.map(mapReport);
}

export async function getReporterDashboardSummary(userId) {
  const [reportCount, recommendationCount] = await Promise.all([
    prisma.report.count({
      where: { reporterId: userId }
    }),
    prisma.recommendation.count({
      where: {
        OR: [
          { sourceReport: { reporterId: userId } },
          { targetReport: { reporterId: userId } }
        ]
      }
    })
  ]);

  return {
    reportCount,
    recommendationCount
  };
}

function preferredContact(user) {
  if (!user) return "Contact unavailable";
  if (user.preferredContactMethod === "PHONE" && user.phone) return `Phone: ${user.phone}`;
  return `Email: ${user.email}`;
}

export async function getReporterConnectionRequests(userId) {
  const requests = await prisma.contactRequest.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { recipientId: userId }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      requester: true,
      recipient: true,
      targetReport: true,
      requesterReport: true
    }
  });

  return requests.map((request) => ({
    id: request.id,
    direction: request.recipientId === userId ? "Incoming" : "Outgoing",
    canAccept: request.recipientId === userId && request.status === "PENDING",
    canDecline: request.recipientId === userId && request.status === "PENDING",
    canCancel: request.requesterId === userId && request.status === "PENDING",
    status: titleCaseStatus(request.status),
    relatedReportId: request.targetReport?.publicId || request.requesterReport?.publicId || "No case linked",
    region: request.targetReport?.broadRegion || request.requesterReport?.broadRegion || "Not specified",
    score: 0,
    message: request.message,
    date: formatDate(request.createdAt),
    contact: request.status === "ACCEPTED"
      ? (request.requesterId === userId ? preferredContact(request.recipient) : preferredContact(request.requester))
      : "Hidden until acceptance"
  }));
}

export async function getAdminManageData() {
  const [reports, users, recommendations, auditLogs, settings] = await Promise.all([
    prisma.report.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            reports: true
          }
        }
      }
    }),
    prisma.recommendation.findMany({
      orderBy: [
        { score: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        sourceReport: true,
        targetReport: true
      },
      take: 50
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true
      },
      take: 50
    }),
    getSettings()
  ]);

  return {
    reports: reports.map(mapReport),
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      region: user.region || "Not specified",
      date: formatDate(user.createdAt),
      reports: user._count.reports,
      status: titleCaseStatus(user.status)
    })),
    recommendations: recommendations.map((recommendation) => ({
      id: recommendation.id,
      source: recommendation.sourceReport.publicId,
      target: recommendation.targetReport.publicId,
      score: `${recommendation.score}%`,
      status: titleCaseStatus(recommendation.status),
      quality: recommendation.qualityLabel,
      created: formatDate(recommendation.createdAt)
    })),
    settings,
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString().slice(0, 16).replace("T", " "),
      actor: log.user?.name || "System",
      action: log.action,
      module: log.resource?.split(":")[0] || log.resource || "System",
      recordId: log.reportId || log.userId || log.id,
      details: log.status
    }))
  };
}

export async function getAdminDashboardData() {
  const [userCount, reportCount, missingCount, unidentifiedCount, recommendationCount, connectionCount, publicCount, hiddenCount, reports, contactStatuses, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.report.count(),
    prisma.report.count({ where: { type: "MISSING" } }),
    prisma.report.count({ where: { type: "UNIDENTIFIED" } }),
    prisma.recommendation.count(),
    prisma.contactRequest.count(),
    prisma.report.count({ where: { visibility: "PUBLIC", publicVisible: true, status: { not: "HIDDEN" } } }),
    prisma.report.count({ where: { OR: [{ status: "HIDDEN" }, { visibility: "HIDDEN" }] } }),
    prisma.report.findMany({
      select: {
        type: true,
        broadRegion: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.contactRequest.groupBy({
      by: ["status"],
      _count: { status: true }
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
      take: 8
    })
  ]);

  const regionMap = new Map();
  const monthMap = new Map();
  for (const report of reports) {
    const region = report.broadRegion || "Not specified";
    regionMap.set(region, (regionMap.get(region) || 0) + 1);
    const month = monthKey(report.createdAt);
    const current = monthMap.get(month) || { month, missing: 0, unidentified: 0 };
    if (report.type === "MISSING") current.missing += 1;
    if (report.type === "UNIDENTIFIED") current.unidentified += 1;
    monthMap.set(month, current);
  }

  const accepted = contactStatuses.find((row) => row.status === "ACCEPTED")?._count.status || 0;
  const totalReviewed = contactStatuses
    .filter((row) => ["ACCEPTED", "DECLINED", "CANCELLED"].includes(row.status))
    .reduce((sum, row) => sum + row._count.status, 0);
  const acceptanceRate = totalReviewed === 0 ? 0 : Math.round((accepted / totalReviewed) * 100);

  return {
    stats: [
      { title: "Total Users", value: userCount },
      { title: "Total Reports", value: reportCount },
      { title: "Missing Reports", value: missingCount },
      { title: "Unidentified Reports", value: unidentifiedCount },
      { title: "Possible Recommendations Generated", value: recommendationCount },
      { title: "Connection Requests", value: connectionCount },
      { title: "Public Reports", value: publicCount },
      { title: "Hidden Reports", value: hiddenCount }
    ],
    reportsByRegion: [...regionMap.entries()].map(([name, reports]) => ({ name, reports })).sort((a, b) => b.reports - a.reports).slice(0, 8),
    reportsByMonth: [...monthMap.values()].slice(-12),
    acceptanceRate: {
      value: acceptanceRate,
      label: totalReviewed === 0 ? "No reviewed contact requests yet" : `${accepted} accepted of ${totalReviewed} reviewed`
    },
    recentActivity: auditLogs.map((log) => ({
      title: log.action,
      description: `${log.resource || "System"} - ${log.status}`,
      date: formatDate(log.createdAt),
      actor: log.user?.name || "System"
    }))
  };
}
