ALTER TABLE "Report" ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Report" ADD COLUMN "aiProcessingStatus" TEXT NOT NULL DEFAULT 'DISABLED';

ALTER TABLE "ReportPhoto" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "ReportPhoto" ADD COLUMN "replacedAt" DATETIME;
ALTER TABLE "ReportPhoto" ADD COLUMN "deletedAt" DATETIME;

ALTER TABLE "AIModel" ADD COLUMN "preprocessingVersion" TEXT;
ALTER TABLE "AIModel" ADD COLUMN "purpose" TEXT;
ALTER TABLE "AIModel" ADD COLUMN "evaluationStatus" TEXT NOT NULL DEFAULT 'PENDING';

ALTER TABLE "ReportTextEmbedding" ADD COLUMN "keyId" TEXT NOT NULL DEFAULT 'local-v1';
ALTER TABLE "ReportTextEmbedding" ADD COLUMN "inputVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReportTextEmbedding" ADD COLUMN "deletedAt" DATETIME;

ALTER TABLE "Recommendation" ADD COLUMN "faceModelVersion" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "modalityScoresJson" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "modalityMask" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "availableWeight" REAL;

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "modelId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "safeErrorCode" TEXT,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryAt" DATETIME,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIProcessingJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIProcessingJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AIProcessingJob" ("id","reportId","modelId","jobType","status","idempotencyKey","attempts","safeErrorCode","startedAt","completedAt","createdAt","updatedAt")
SELECT "id","reportId","modelId","jobType","status","id", "attempts","safeErrorCode","startedAt","completedAt","createdAt","updatedAt" FROM "AIProcessingJob";
DROP TABLE "AIProcessingJob";
ALTER TABLE "new_AIProcessingJob" RENAME TO "AIProcessingJob";
CREATE UNIQUE INDEX "AIProcessingJob_idempotencyKey_key" ON "AIProcessingJob"("idempotencyKey");
CREATE INDEX "AIProcessingJob_reportId_idx" ON "AIProcessingJob"("reportId");
CREATE INDEX "AIProcessingJob_modelId_idx" ON "AIProcessingJob"("modelId");
CREATE INDEX "AIProcessingJob_status_idx" ON "AIProcessingJob"("status");
CREATE INDEX "AIProcessingJob_availableAt_idx" ON "AIProcessingJob"("availableAt");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

CREATE TABLE "ReportFaceEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "reportPhotoId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "ciphertext" BLOB NOT NULL,
    "iv" BLOB NOT NULL,
    "authTag" BLOB NOT NULL,
    "keyId" TEXT NOT NULL DEFAULT 'local-v1',
    "dimensions" INTEGER NOT NULL,
    "inputHash" TEXT NOT NULL,
    "inputVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "invalidatedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "ReportFaceEmbedding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportFaceEmbedding_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReportFaceEmbedding_reportId_modelId_key" ON "ReportFaceEmbedding"("reportId","modelId");
CREATE INDEX "ReportFaceEmbedding_modelId_idx" ON "ReportFaceEmbedding"("modelId");
CREATE INDEX "ReportFaceEmbedding_expiresAt_idx" ON "ReportFaceEmbedding"("expiresAt");

CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RecommendationFeedback_recommendationId_idx" ON "RecommendationFeedback"("recommendationId");
CREATE INDEX "RecommendationFeedback_userId_idx" ON "RecommendationFeedback"("userId");

CREATE TABLE "SuppressedPair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceReportId" TEXT NOT NULL,
    "targetReportId" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);
CREATE UNIQUE INDEX "SuppressedPair_sourceReportId_targetReportId_scoringVersion_key" ON "SuppressedPair"("sourceReportId","targetReportId","scoringVersion");
CREATE INDEX "SuppressedPair_sourceReportId_idx" ON "SuppressedPair"("sourceReportId");

CREATE TABLE "RetentionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RetentionEvent_resourceType_idx" ON "RetentionEvent"("resourceType");
CREATE INDEX "RetentionEvent_scheduledAt_idx" ON "RetentionEvent"("scheduledAt");

CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelVersionsJson" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "metricsJson" TEXT NOT NULL,
    "limitationsJson" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "recommendedThreshold" INTEGER,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME
);
CREATE INDEX "EvaluationRun_approvalStatus_idx" ON "EvaluationRun"("approvalStatus");
