const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const modelId = "sentence-transformers-all-MiniLM-L6-v2";
const artifactHash = "1377e9af0ca0b016a9f2aa584d6fc71ab3ea6804fae21ef9fb1416e2944057ac";

async function columns(table) {
  return prisma.$queryRawUnsafe('PRAGMA table_info("' + table + '")');
}

async function addColumn(table, name, definition) {
  const existing = await columns(table);
  if (!existing.some((column) => column.name === name)) {
    await prisma.$executeRawUnsafe('ALTER TABLE "' + table + '" ADD COLUMN "' + name + '" ' + definition);
  }
}

async function main() {
  await addColumn("Report", "aiProcessingAllowed", "BOOLEAN NOT NULL DEFAULT false");
  await addColumn("Report", "aiProcessingPolicyVersion", "TEXT");
  await addColumn("Report", "aiProcessingAllowedAt", "DATETIME");
  await addColumn("Report", "aiProcessingWithdrawnAt", "DATETIME");
  await addColumn("Recommendation", "textModelVersion", "TEXT");
  await addColumn("Recommendation", "scoringVersion", "TEXT");
  await addColumn("Recommendation", "expiresAt", "DATETIME");
  await addColumn("Recommendation", "invalidatedAt", "DATETIME");
  await addColumn("Recommendation", "invalidationReason", "TEXT");

  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "AIModel" (' +
    '"id" TEXT NOT NULL PRIMARY KEY,' +
    '"capability" TEXT NOT NULL,' +
    '"name" TEXT NOT NULL,' +
    '"version" TEXT NOT NULL,' +
    '"artifactHash" TEXT NOT NULL,' +
    '"license" TEXT NOT NULL,' +
    '"language" TEXT NOT NULL,' +
    '"dimensions" INTEGER NOT NULL,' +
    '"status" TEXT NOT NULL DEFAULT \'DEVELOPMENT_ONLY\',' +
    '"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    '"updatedAt" DATETIME NOT NULL)'
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "ReportTextEmbedding" (' +
    '"id" TEXT NOT NULL PRIMARY KEY,' +
    '"reportId" TEXT NOT NULL,' +
    '"modelId" TEXT NOT NULL,' +
    '"ciphertext" BLOB NOT NULL,' +
    '"iv" BLOB NOT NULL,' +
    '"authTag" BLOB NOT NULL,' +
    '"dimensions" INTEGER NOT NULL,' +
    '"inputHash" TEXT NOT NULL,' +
    '"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    '"updatedAt" DATETIME NOT NULL,' +
    '"expiresAt" DATETIME,' +
    '"invalidatedAt" DATETIME,' +
    'FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,' +
    'FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)'
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "AIProcessingJob" (' +
    '"id" TEXT NOT NULL PRIMARY KEY,' +
    '"reportId" TEXT NOT NULL,' +
    '"modelId" TEXT NOT NULL,' +
    '"jobType" TEXT NOT NULL,' +
    '"status" TEXT NOT NULL DEFAULT \'PENDING\',' +
    '"attempts" INTEGER NOT NULL DEFAULT 0,' +
    '"safeErrorCode" TEXT,' +
    '"startedAt" DATETIME,' +
    '"completedAt" DATETIME,' +
    '"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    '"updatedAt" DATETIME NOT NULL,' +
    'FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,' +
    'FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)'
  );

  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS "AIModel_artifactHash_key" ON "AIModel"("artifactHash")',
    'CREATE INDEX IF NOT EXISTS "AIModel_capability_idx" ON "AIModel"("capability")',
    'CREATE INDEX IF NOT EXISTS "AIModel_status_idx" ON "AIModel"("status")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ReportTextEmbedding_reportId_modelId_key" ON "ReportTextEmbedding"("reportId", "modelId")',
    'CREATE INDEX IF NOT EXISTS "ReportTextEmbedding_modelId_idx" ON "ReportTextEmbedding"("modelId")',
    'CREATE INDEX IF NOT EXISTS "ReportTextEmbedding_expiresAt_idx" ON "ReportTextEmbedding"("expiresAt")',
    'CREATE INDEX IF NOT EXISTS "AIProcessingJob_reportId_idx" ON "AIProcessingJob"("reportId")',
    'CREATE INDEX IF NOT EXISTS "AIProcessingJob_modelId_idx" ON "AIProcessingJob"("modelId")',
    'CREATE INDEX IF NOT EXISTS "AIProcessingJob_status_idx" ON "AIProcessingJob"("status")'
  ];
  for (const statement of indexes) await prisma.$executeRawUnsafe(statement);

  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "AIModel" ("id","capability","name","version","artifactHash","license","language","dimensions","status","createdAt","updatedAt") ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?) ' +
    'ON CONFLICT("id") DO UPDATE SET "artifactHash"=excluded."artifactHash", "updatedAt"=excluded."updatedAt"',
    modelId,
    "TEXT_EMBEDDING",
    "all-MiniLM-L6-v2",
    "development-1",
    artifactHash,
    "Apache-2.0",
    "en",
    384,
    "DEVELOPMENT_ONLY",
    now,
    now
  );

  await prisma.$executeRawUnsafe(
    'UPDATE "Report" SET "aiProcessingAllowed"=true, "aiProcessingPolicyVersion"=\'phase5-development-1\', "aiProcessingAllowedAt"=? ' +
    'WHERE "id" IN (\'report_missing_0047\',\'report_unidentified_0001\')',
    now
  );

  console.log("Phase 5 English text foundation migration applied.");
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
