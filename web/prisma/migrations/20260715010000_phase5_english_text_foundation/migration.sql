ALTER TABLE "Report" ADD COLUMN "aiProcessingAllowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "aiProcessingPolicyVersion" TEXT;
ALTER TABLE "Report" ADD COLUMN "aiProcessingAllowedAt" DATETIME;
ALTER TABLE "Report" ADD COLUMN "aiProcessingWithdrawnAt" DATETIME;

ALTER TABLE "Recommendation" ADD COLUMN "textModelVersion" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "scoringVersion" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "Recommendation" ADD COLUMN "invalidatedAt" DATETIME;
ALTER TABLE "Recommendation" ADD COLUMN "invalidationReason" TEXT;

CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capability" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DEVELOPMENT_ONLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ReportTextEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "ciphertext" BLOB NOT NULL,
    "iv" BLOB NOT NULL,
    "authTag" BLOB NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "invalidatedAt" DATETIME,
    CONSTRAINT "ReportTextEmbedding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportTextEmbedding_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AIProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "safeErrorCode" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIProcessingJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIProcessingJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AIModel_artifactHash_key" ON "AIModel"("artifactHash");
CREATE INDEX "AIModel_capability_idx" ON "AIModel"("capability");
CREATE INDEX "AIModel_status_idx" ON "AIModel"("status");
CREATE UNIQUE INDEX "ReportTextEmbedding_reportId_modelId_key" ON "ReportTextEmbedding"("reportId", "modelId");
CREATE INDEX "ReportTextEmbedding_modelId_idx" ON "ReportTextEmbedding"("modelId");
CREATE INDEX "ReportTextEmbedding_expiresAt_idx" ON "ReportTextEmbedding"("expiresAt");
CREATE INDEX "AIProcessingJob_reportId_idx" ON "AIProcessingJob"("reportId");
CREATE INDEX "AIProcessingJob_modelId_idx" ON "AIProcessingJob"("modelId");
CREATE INDEX "AIProcessingJob_status_idx" ON "AIProcessingJob"("status");
