const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = path.join(__dirname, "..");
const prisma = new PrismaClient();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

async function main() {
  const schema = read("prisma/schema.prisma");
  assertIncludes(schema, "model SystemSetting", "Prisma schema");

  const dashboardRoute = read("app/admin/dashboard/page.js");
  assertIncludes(dashboardRoute, "requireAdmin", "admin dashboard route");
  assertIncludes(dashboardRoute, "getAdminDashboardData", "admin dashboard route");

  const manageRoute = read("app/admin/manage/page.js");
  assertIncludes(manageRoute, "requireAdmin", "admin manage route");
  assertIncludes(manageRoute, "getAdminManageData", "admin manage route");

  const databaseViews = read("lib/database-views.js");
  for (const marker of [
    "getAdminDashboardData",
    "Possible Recommendations Generated",
    "reportsByRegion",
    "reportsByMonth",
    "No reviewed contact requests yet",
    "passwordHash"
  ]) {
    if (marker === "passwordHash") {
      assert(!databaseViews.includes(marker), "admin database views must not select passwordHash");
    } else {
      assertIncludes(databaseViews, marker, "admin database views");
    }
  }

  const settings = read("lib/settings.js");
  for (const marker of ["publicSearchEnabled", "reportSubmissionEnabled", "recommendationDisplayThreshold", "duplicateWarningThreshold", "maintenanceMode", "integer from 0 to 100"]) {
    assertIncludes(settings, marker, "settings helper");
  }

  const reportApi = read("app/api/reports/route.js");
  assertIncludes(reportApi, "reportSubmissionEnabled", "report submission API");

  const publicReports = read("lib/public-reports.js");
  assertIncludes(publicReports, "publicSearchEnabled", "public reports query");

  const trackApi = read("app/api/track/[publicId]/route.js");
  assertIncludes(trackApi, "Public tracking is temporarily unavailable.", "track API");

  const contactApi = read("app/api/contact-requests/route.js");
  assertIncludes(contactApi, "maintenanceMode", "contact request API");

  const userApi = read("app/api/admin/users/[id]/route.js");
  for (const marker of ["Cannot deactivate the last active admin", "tx.session.deleteMany", "passwordHash"]) {
    if (marker === "passwordHash") {
      assert(!userApi.includes(marker), "admin user API must not return passwordHash");
    } else {
      assertIncludes(userApi, marker, "admin user API");
    }
  }

  const reportModerationApi = read("app/api/reports/[publicId]/route.js");
  for (const marker of ["ARCHIVED", "Archived reports must be restored", "Admin moderation changed"]) {
    assertIncludes(reportModerationApi, marker, "admin report moderation API");
  }

  const ui = read("components/ui/kit.jsx");
  for (const marker of [
    "Admin moderation does not confirm or reject identity",
    "Recommendation thresholds affect which possible similarities are displayed. They do not confirm identity.",
    "Admin can review recommendation quality labels and statuses, but cannot confirm identity or force contact.",
    "AdminSettingsPanel"
  ]) {
    assertIncludes(ui, marker, "admin UI");
  }
  const unsafeIdentityPhrase = ["Identity", "Confirmed"].join(" ");
  const unsafeMatchPhrase = ["Match", "Found"].join(" ");
  for (const forbidden of ["approve recommendation truth", "force contact sharing", unsafeIdentityPhrase, unsafeMatchPhrase]) {
    assert(!ui.includes(forbidden), `admin UI contains unsafe/out-of-scope wording: ${forbidden}`);
  }

  const requiredSettings = ["publicSearchEnabled", "reportSubmissionEnabled", "recommendationDisplayThreshold", "duplicateWarningThreshold", "maintenanceMode"];
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: requiredSettings } } });
  assert.equal(rows.length, requiredSettings.length, "all system settings should exist in SQLite");

  const [userCount, reportCount, recommendationCount] = await Promise.all([
    prisma.user.count(),
    prisma.report.count(),
    prisma.recommendation.count()
  ]);
  assert(userCount >= 0, "dashboard user aggregate should be queryable");
  assert(reportCount >= 0, "dashboard report aggregate should be queryable");
  assert(recommendationCount >= 0, "dashboard recommendation aggregate should be queryable");

  console.log("Phase 4 admin foundation check passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
