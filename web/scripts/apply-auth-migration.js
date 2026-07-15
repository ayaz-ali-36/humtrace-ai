const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function hasColumn(table, name) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === name);
}

async function hasTable(name) {
  const rows = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn("User", "passwordHash"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN passwordHash TEXT");
  }

  if (!(await hasColumn("User", "preferredContactMethod"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN preferredContactMethod TEXT NOT NULL DEFAULT 'EMAIL'");
  }

  if (!(await hasTable("Session"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE Session (
        id TEXT NOT NULL PRIMARY KEY,
        tokenHash TEXT NOT NULL,
        userId TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT Session_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe("CREATE UNIQUE INDEX Session_tokenHash_key ON Session(tokenHash)");
    await prisma.$executeRawUnsafe("CREATE INDEX Session_userId_idx ON Session(userId)");
    await prisma.$executeRawUnsafe("CREATE INDEX Session_expiresAt_idx ON Session(expiresAt)");
  }

  if (!(await hasColumn("ContactRequest", "activeKey"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE ContactRequest ADD COLUMN activeKey TEXT");
    await prisma.$executeRawUnsafe("CREATE UNIQUE INDEX ContactRequest_activeKey_key ON ContactRequest(activeKey)");
  }

  const demoHashes = {
    "admin@humtrace.demo": await bcrypt.hash("AdminDemo!2026", 10),
    "reporter@humtrace.demo": await bcrypt.hash("ReporterDemo!2026", 10),
    "second.reporter@humtrace.demo": await bcrypt.hash("SecondReporter!2026", 10)
  };

  await prisma.user.updateMany({
    where: { email: "admin@humtrace.demo" },
    data: { passwordHash: demoHashes["admin@humtrace.demo"], role: "ADMIN", status: "ACTIVE", preferredContactMethod: "EMAIL" }
  });
  await prisma.user.updateMany({
    where: { email: "reporter@humtrace.demo" },
    data: { passwordHash: demoHashes["reporter@humtrace.demo"], role: "REPORTER", status: "ACTIVE", preferredContactMethod: "EMAIL" }
  });
  await prisma.user.updateMany({
    where: { email: "second.reporter@humtrace.demo" },
    data: { passwordHash: demoHashes["second.reporter@humtrace.demo"], role: "REPORTER", status: "ACTIVE", preferredContactMethod: "EMAIL" }
  });

  await prisma.user.upsert({
    where: { email: "admin2@humtrace.demo" },
    update: {
      passwordHash: demoHashes["admin@humtrace.demo"],
      role: "ADMIN",
      status: "ACTIVE",
      preferredContactMethod: "EMAIL"
    },
    create: {
      name: "Second Demo Admin",
      email: "admin2@humtrace.demo",
      role: "ADMIN",
      status: "ACTIVE",
      region: "Islamabad Capital Territory",
      passwordHash: demoHashes["admin@humtrace.demo"],
      preferredContactMethod: "EMAIL"
    }
  });

  const pendingRequests = await prisma.contactRequest.findMany({
    where: { status: "PENDING", activeKey: null },
    select: { id: true, requesterId: true, targetReportId: true, recipientId: true }
  });

  for (const request of pendingRequests) {
    const reportPart = request.targetReportId || request.recipientId;
    await prisma.contactRequest
      .update({
        where: { id: request.id },
        data: { activeKey: `${request.requesterId}:${reportPart}` }
      })
      .catch(() => {});
  }

  console.log("Auth/session migration applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
