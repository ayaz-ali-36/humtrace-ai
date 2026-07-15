const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.report.findMany({
    where: {
      visibility: "PUBLIC",
      status: {
        not: "HIDDEN"
      }
    },
    select: {
      publicId: true,
      type: true,
      broadRegion: true,
      description: true,
      visibility: true
    }
  });

  if (reports.length < 1) {
    throw new Error("Expected at least one public report from the database.");
  }

  const incomplete = reports.filter((report) => {
    return !report.publicId || !report.type || !report.broadRegion || !report.description || report.visibility !== "PUBLIC";
  });

  if (incomplete.length) {
    throw new Error(`Public report records are incomplete: ${incomplete.map((report) => report.publicId).join(", ")}`);
  }

  console.log(`Public reports query check passed: ${reports.length} database records available for Browse/Search.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
