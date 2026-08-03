PRAGMA foreign_keys=OFF;

DELETE FROM "ReportFaceEmbedding"
WHERE "reportId" NOT IN (SELECT "id" FROM "Report")
   OR "reportPhotoId" NOT IN (SELECT "id" FROM "ReportPhoto")
   OR "modelId" NOT IN (SELECT "id" FROM "AIModel");

CREATE TABLE "new_ReportFaceEmbedding" (
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
    CONSTRAINT "ReportFaceEmbedding_reportPhotoId_fkey" FOREIGN KEY ("reportPhotoId") REFERENCES "ReportPhoto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportFaceEmbedding_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReportFaceEmbedding" SELECT * FROM "ReportFaceEmbedding";
DROP TABLE "ReportFaceEmbedding";
ALTER TABLE "new_ReportFaceEmbedding" RENAME TO "ReportFaceEmbedding";
CREATE UNIQUE INDEX "ReportFaceEmbedding_reportId_modelId_key" ON "ReportFaceEmbedding"("reportId", "modelId");
CREATE INDEX "ReportFaceEmbedding_modelId_idx" ON "ReportFaceEmbedding"("modelId");
CREATE INDEX "ReportFaceEmbedding_expiresAt_idx" ON "ReportFaceEmbedding"("expiresAt");

DELETE FROM "RecommendationFeedback"
WHERE "recommendationId" NOT IN (SELECT "id" FROM "Recommendation")
   OR "userId" NOT IN (SELECT "id" FROM "User");

CREATE TABLE "new_RecommendationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecommendationFeedback" SELECT * FROM "RecommendationFeedback";
DROP TABLE "RecommendationFeedback";
ALTER TABLE "new_RecommendationFeedback" RENAME TO "RecommendationFeedback";
CREATE INDEX "RecommendationFeedback_recommendationId_idx" ON "RecommendationFeedback"("recommendationId");
CREATE INDEX "RecommendationFeedback_userId_idx" ON "RecommendationFeedback"("userId");

DELETE FROM "SuppressedPair"
WHERE "sourceReportId" NOT IN (SELECT "id" FROM "Report")
   OR "targetReportId" NOT IN (SELECT "id" FROM "Report");

CREATE TABLE "new_SuppressedPair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceReportId" TEXT NOT NULL,
    "targetReportId" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "SuppressedPair_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuppressedPair_targetReportId_fkey" FOREIGN KEY ("targetReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SuppressedPair" SELECT * FROM "SuppressedPair";
DROP TABLE "SuppressedPair";
ALTER TABLE "new_SuppressedPair" RENAME TO "SuppressedPair";
CREATE UNIQUE INDEX "SuppressedPair_sourceReportId_targetReportId_scoringVersion_key" ON "SuppressedPair"("sourceReportId", "targetReportId", "scoringVersion");
CREATE INDEX "SuppressedPair_sourceReportId_idx" ON "SuppressedPair"("sourceReportId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
