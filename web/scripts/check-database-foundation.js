const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = path.join(__dirname, "..");
const requiredFiles = [
  "prisma/schema.prisma",
  "prisma/migrations/20260712230000_init_database_foundation/migration.sql",
  "prisma/dev.db"
];

const requiredModels = [
  "User",
  "Session",
  "Report",
  "ReportPhoto",
  "Recommendation",
  "ContactRequest",
  "TimelineEvent",
  "Notification",
  "AuditLog"
];

async function main() {
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length) {
    throw new Error(`Missing database foundation files:\n${missing.join("\n")}`);
  }

  const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  const missingModels = requiredModels.filter((model) => !schema.includes(`model ${model} `));
  if (missingModels.length) {
    throw new Error(`Missing Prisma models:\n${missingModels.join("\n")}`);
  }

  const prisma = new PrismaClient();
  try {
    const counts = {
      users: await prisma.user.count(),
      sessions: await prisma.session.count(),
      reports: await prisma.report.count(),
      photos: await prisma.reportPhoto.count(),
      recommendations: await prisma.recommendation.count(),
      contactRequests: await prisma.contactRequest.count(),
      timelineEvents: await prisma.timelineEvent.count(),
      notifications: await prisma.notification.count(),
      auditLogs: await prisma.auditLog.count()
    };

    const empty = Object.entries(counts).filter(([name, count]) => name !== "sessions" && count < 1);
    if (empty.length) {
      throw new Error(`Database seed is incomplete:\n${empty.map(([name]) => name).join("\n")}`);
    }

    console.log(`Database foundation check passed: ${JSON.stringify(counts)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
