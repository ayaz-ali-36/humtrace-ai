const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const defaults = [
  ["publicSearchEnabled", "true", "Allow public Browse/Search and public tracking results."],
  ["reportSubmissionEnabled", "true", "Allow public and reporter report submissions."],
  ["recommendationDisplayThreshold", "0", "Minimum deterministic recommendation score displayed to users."],
  ["duplicateWarningThreshold", "85", "Reserved duplicate warning threshold for a future duplicate-review workflow."],
  ["maintenanceMode", "false", "Temporarily block public write workflows while enabled."]
];

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "description" TEXT,
      "updatedById" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById")`);

  for (const [key, value, description] of defaults) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "SystemSetting" ("key", "value", "description") VALUES (?, ?, ?)`,
      key,
      value,
      description
    );
  }

  console.log("Phase 4 admin/settings migration applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
