ALTER TABLE "User" ADD COLUMN "privacyPolicyVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "privacyAcceptedAt" DATETIME;

CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById");

INSERT OR IGNORE INTO "SystemSetting" ("key", "value", "description") VALUES
('publicSearchEnabled', 'true', 'Allow public Browse/Search and public tracking results.'),
('reportSubmissionEnabled', 'true', 'Allow authenticated reporter submissions.'),
('recommendationDisplayThreshold', '0', 'Minimum possible-recommendation score displayed to users.'),
('duplicateWarningThreshold', '85', 'Reserved for a future duplicate-review workflow.'),
('aiAssistanceEnabled', 'false', 'Global local AI assistance kill switch.'),
('faceSimilarityEnabled', 'false', 'Local face-similarity kill switch.'),
('textSimilarityEnabled', 'false', 'Local English-text-similarity kill switch.'),
('englishTextEmbeddingEnabled', 'false', 'Legacy English-text switch retained for migration compatibility.'),
('englishTextEmbeddingThreshold', '35', 'Legacy development threshold retained for migration compatibility.'),
('maintenanceMode', 'false', 'Temporarily pause public workflows.');
