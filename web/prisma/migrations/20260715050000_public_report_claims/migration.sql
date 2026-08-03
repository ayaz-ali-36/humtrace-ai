PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reporterId" TEXT,
    "fullName" TEXT,
    "nameUnknown" BOOLEAN NOT NULL DEFAULT false,
    "approximateAge" TEXT NOT NULL,
    "gender" TEXT,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "broadRegion" TEXT NOT NULL,
    "specificLocation" TEXT,
    "lastSeenLocation" TEXT,
    "foundLocation" TEXT,
    "eventDate" DATETIME,
    "description" TEXT NOT NULL,
    "clothing" TEXT,
    "identifyingFeatures" TEXT,
    "medicalCondition" TEXT,
    "reporterRelationship" TEXT,
    "reporterContext" TEXT,
    "relationshipContext" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "visibility" TEXT NOT NULL DEFAULT 'LIMITED',
    "consentToContact" BOOLEAN NOT NULL DEFAULT false,
    "aiProcessingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "aiProcessingPolicyVersion" TEXT,
    "aiProcessingAllowedAt" DATETIME,
    "aiProcessingWithdrawnAt" DATETIME,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "aiProcessingStatus" TEXT NOT NULL DEFAULT 'DISABLED',
    "photoRequirementNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Report" (
    "id", "publicId", "type", "reporterId", "fullName", "nameUnknown", "approximateAge", "gender",
    "heightCm", "weightKg", "broadRegion", "specificLocation", "lastSeenLocation", "foundLocation",
    "eventDate", "description", "clothing", "identifyingFeatures", "medicalCondition", "reporterRelationship",
    "reporterContext", "relationshipContext", "preferredContactMethod", "publicVisible", "lifecycleStatus",
    "status", "visibility", "consentToContact", "aiProcessingAllowed", "aiProcessingPolicyVersion",
    "aiProcessingAllowedAt", "aiProcessingWithdrawnAt", "contentVersion", "aiProcessingStatus",
    "photoRequirementNote", "createdAt", "updatedAt"
)
SELECT
    "id", "publicId", "type", "reporterId", "fullName", "nameUnknown", "approximateAge", "gender",
    "heightCm", "weightKg", "broadRegion", "specificLocation", "lastSeenLocation", "foundLocation",
    "eventDate", "description", "clothing", "identifyingFeatures", "medicalCondition", "reporterRelationship",
    "reporterContext", "relationshipContext", "preferredContactMethod", "publicVisible", "lifecycleStatus",
    "status", "visibility", "consentToContact", "aiProcessingAllowed", "aiProcessingPolicyVersion",
    "aiProcessingAllowedAt", "aiProcessingWithdrawnAt", "contentVersion", "aiProcessingStatus",
    "photoRequirementNote", "createdAt", "updatedAt"
FROM "Report";

DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE UNIQUE INDEX "Report_publicId_key" ON "Report"("publicId");
CREATE INDEX "Report_type_idx" ON "Report"("type");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_visibility_idx" ON "Report"("visibility");
CREATE INDEX "Report_broadRegion_idx" ON "Report"("broadRegion");

CREATE TABLE "ReportClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "submitterPhone" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "claimedById" TEXT,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportClaim_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportClaim_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReportClaim_reportId_key" ON "ReportClaim"("reportId");
CREATE UNIQUE INDEX "ReportClaim_tokenHash_key" ON "ReportClaim"("tokenHash");
CREATE INDEX "ReportClaim_submitterEmail_idx" ON "ReportClaim"("submitterEmail");
CREATE INDEX "ReportClaim_claimedById_idx" ON "ReportClaim"("claimedById");

UPDATE "SystemSetting"
SET "description" = 'Allow public submissions and signed-in reporter submissions.'
WHERE "key" = 'reportSubmissionEnabled';

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
