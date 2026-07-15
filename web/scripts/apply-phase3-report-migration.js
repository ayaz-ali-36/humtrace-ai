const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function hasColumn(table, name) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === name);
}

async function addColumn(name, sql) {
  if (!(await hasColumn("Report", name))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Report ADD COLUMN ${sql}`);
  }
}

async function main() {
  await addColumn("heightCm", "heightCm INTEGER");
  await addColumn("weightKg", "weightKg INTEGER");
  await addColumn("lastSeenLocation", "lastSeenLocation TEXT");
  await addColumn("foundLocation", "foundLocation TEXT");
  await addColumn("clothing", "clothing TEXT");
  await addColumn("identifyingFeatures", "identifyingFeatures TEXT");
  await addColumn("medicalCondition", "medicalCondition TEXT");
  await addColumn("reporterRelationship", "reporterRelationship TEXT");
  await addColumn("reporterContext", "reporterContext TEXT");
  await addColumn("relationshipContext", "relationshipContext TEXT");
  await addColumn("preferredContactMethod", "preferredContactMethod TEXT NOT NULL DEFAULT 'EMAIL'");
  await addColumn("publicVisible", "publicVisible BOOLEAN NOT NULL DEFAULT false");
  await addColumn("lifecycleStatus", "lifecycleStatus TEXT NOT NULL DEFAULT 'ACTIVE'");

  await prisma.$executeRawUnsafe("UPDATE Report SET lastSeenLocation = COALESCE(lastSeenLocation, broadRegion) WHERE type = 'MISSING'");
  await prisma.$executeRawUnsafe("UPDATE Report SET foundLocation = COALESCE(foundLocation, broadRegion) WHERE type = 'UNIDENTIFIED'");
  await prisma.$executeRawUnsafe("UPDATE Report SET reporterRelationship = COALESCE(reporterRelationship, 'Not specified')");
  await prisma.$executeRawUnsafe("UPDATE Report SET preferredContactMethod = 'EMAIL' WHERE preferredContactMethod IS NULL OR preferredContactMethod = ''");
  await prisma.$executeRawUnsafe("UPDATE Report SET lifecycleStatus = 'ACTIVE' WHERE lifecycleStatus IS NULL OR lifecycleStatus = ''");

  console.log("Phase 3 report migration applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
