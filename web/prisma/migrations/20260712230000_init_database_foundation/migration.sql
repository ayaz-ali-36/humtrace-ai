-- HumTrace AI Phase 2 database foundation.
-- Generated from prisma/schema.prisma for local SQLite.

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'REPORTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "region" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "fullName" TEXT,
    "nameUnknown" BOOLEAN NOT NULL DEFAULT false,
    "approximateAge" TEXT NOT NULL,
    "gender" TEXT,
    "broadRegion" TEXT NOT NULL,
    "specificLocation" TEXT,
    "eventDate" DATETIME,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "visibility" TEXT NOT NULL DEFAULT 'LIMITED',
    "consentToContact" BOOLEAN NOT NULL DEFAULT false,
    "photoRequirementNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ReportPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PRIMARY',
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "faceCheckStatus" TEXT NOT NULL DEFAULT 'NOT_RUN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceReportId" TEXT NOT NULL,
    "targetReportId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "qualityLabel" TEXT NOT NULL,
    "sharedAttributes" TEXT NOT NULL,
    "breakdownSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_targetReportId_fkey" FOREIGN KEY ("targetReportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "requesterReportId" TEXT,
    "targetReportId" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_requesterReportId_fkey" FOREIGN KEY ("requesterReportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_targetReportId_fkey" FOREIGN KEY ("targetReportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "reportId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Report_publicId_key" ON "Report"("publicId");
CREATE INDEX "Report_type_idx" ON "Report"("type");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_visibility_idx" ON "Report"("visibility");
CREATE INDEX "Report_broadRegion_idx" ON "Report"("broadRegion");
CREATE INDEX "ReportPhoto_reportId_idx" ON "ReportPhoto"("reportId");
CREATE INDEX "Recommendation_status_idx" ON "Recommendation"("status");
CREATE UNIQUE INDEX "Recommendation_sourceReportId_targetReportId_key" ON "Recommendation"("sourceReportId", "targetReportId");
CREATE INDEX "ContactRequest_requesterId_idx" ON "ContactRequest"("requesterId");
CREATE INDEX "ContactRequest_recipientId_idx" ON "ContactRequest"("recipientId");
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");
CREATE INDEX "TimelineEvent_reportId_idx" ON "TimelineEvent"("reportId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_reportId_idx" ON "AuditLog"("reportId");
