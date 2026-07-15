-- Phase 3 report workflow/data-integrity migration.
-- Applied locally through scripts/apply-phase3-report-migration.js.

ALTER TABLE "Report" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Report" ADD COLUMN "weightKg" INTEGER;
ALTER TABLE "Report" ADD COLUMN "lastSeenLocation" TEXT;
ALTER TABLE "Report" ADD COLUMN "foundLocation" TEXT;
ALTER TABLE "Report" ADD COLUMN "clothing" TEXT;
ALTER TABLE "Report" ADD COLUMN "identifyingFeatures" TEXT;
ALTER TABLE "Report" ADD COLUMN "medicalCondition" TEXT;
ALTER TABLE "Report" ADD COLUMN "reporterRelationship" TEXT;
ALTER TABLE "Report" ADD COLUMN "reporterContext" TEXT;
ALTER TABLE "Report" ADD COLUMN "relationshipContext" TEXT;
ALTER TABLE "Report" ADD COLUMN "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "Report" ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
