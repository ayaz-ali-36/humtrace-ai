const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const root = path.join(__dirname, "..");

const requiredReportFields = [
  "heightCm",
  "weightKg",
  "lastSeenLocation",
  "foundLocation",
  "clothing",
  "identifyingFeatures",
  "medicalCondition",
  "reporterRelationship",
  "reporterContext",
  "relationshipContext",
  "preferredContactMethod",
  "publicVisible",
  "lifecycleStatus"
];

async function main() {
  const schema = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8");
  const missingFields = requiredReportFields.filter((field) => !schema.includes(field));
  if (missingFields.length) {
    throw new Error(`Missing Phase 3 Report fields: ${missingFields.join(", ")}`);
  }

  const reportApi = fs.readFileSync(path.join(root, "app", "api", "reports", "route.js"), "utf8");
  for (const required of ["validateReportPayload", "deleteStoredReportPhoto", "heightCm", "identifyingFeatures", "lifecycleStatus", "createClaimCode", "reportClaim.create"]) {
    if (!reportApi.includes(required)) {
      throw new Error(`Report API missing Phase 3 handling for ${required}.`);
    }
  }

  for (const required of ["model ReportClaim", "reporterId             String?", "tokenHash", "claimedAt"]) {
    if (!schema.includes(required)) throw new Error(`Public report claiming schema is missing ${required}.`);
  }

  const claimApi = fs.readFileSync(path.join(root, "app", "api", "reports", "claim", "route.js"), "utf8");
  for (const required of ["normalizeClaimCode", "submitterEmail", "failedAttempts", "claimedById"]) {
    if (!claimApi.includes(required)) throw new Error(`Report claim API is missing ${required}.`);
  }

  const trackPage = fs.readFileSync(path.join(root, "app", "track", "page.js"), "utf8");
  if (trackPage.includes("getTrackReports")) {
    throw new Error("Track page still preloads report collections.");
  }

  const trackApi = fs.readFileSync(path.join(root, "app", "api", "track", "[publicId]", "route.js"), "utf8");
  for (const forbidden of ["reporter", "storagePath", "auditLogs", "photos", "description"]) {
    if (trackApi.includes(forbidden)) {
      throw new Error(`Track API source includes non-public field: ${forbidden}`);
    }
  }

  const uploadStorage = fs.readFileSync(path.join(root, "lib", "upload-storage.js"), "utf8");
  for (const required of ["signatureMime", "validateImageBytes", "storage\", \"reports"]) {
    if (!uploadStorage.includes(required)) {
      throw new Error(`Upload storage missing Phase 3 private/signature handling: ${required}`);
    }
  }

  const reportsWithLifecycle = await prisma.report.count({
    where: {
      lifecycleStatus: {
        not: ""
      }
    }
  });
  if (reportsWithLifecycle < 1) {
    throw new Error("Expected existing reports to have lifecycleStatus backfilled.");
  }

  console.log("Phase 3 report foundation check passed.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
