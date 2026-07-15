const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ["admin@humtrace.demo", "reporter@humtrace.demo", "second.reporter@humtrace.demo"]
      }
    },
    select: {
      email: true,
      role: true,
      status: true,
      passwordHash: true,
      preferredContactMethod: true
    }
  });

  if (users.length !== 3) {
    throw new Error("Expected demo admin and two demo reporter accounts.");
  }

  for (const user of users) {
    if (!user.passwordHash || user.passwordHash.includes("Demo!")) {
      throw new Error(`Missing secure password hash for ${user.email}.`);
    }
    if (user.status !== "ACTIVE") {
      throw new Error(`Demo user is not active: ${user.email}.`);
    }
    if (!["EMAIL", "PHONE"].includes(user.preferredContactMethod)) {
      throw new Error(`Invalid preferred contact method for ${user.email}.`);
    }
  }

  const admin = users.find((user) => user.email === "admin@humtrace.demo");
  const reporter = users.find((user) => user.email === "reporter@humtrace.demo");
  const secondReporter = users.find((user) => user.email === "second.reporter@humtrace.demo");

  if (admin.role !== "ADMIN" || reporter.role !== "REPORTER" || secondReporter.role !== "REPORTER") {
    throw new Error("Demo account roles are incorrect.");
  }

  const validReporterPassword = await bcrypt.compare("ReporterDemo!2026", reporter.passwordHash);
  if (!validReporterPassword) {
    throw new Error("Reporter demo password verification failed.");
  }

  const duplicateActiveKeys = await prisma.$queryRawUnsafe(`
    SELECT activeKey, COUNT(*) AS count
    FROM ContactRequest
    WHERE activeKey IS NOT NULL
    GROUP BY activeKey
    HAVING COUNT(*) > 1
  `);

  if (duplicateActiveKeys.length) {
    throw new Error("Duplicate active contact request keys found.");
  }

  console.log("Auth foundation check passed: demo users, password hashes, roles, and contact-request active keys are valid.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
