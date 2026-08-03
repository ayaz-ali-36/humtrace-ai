const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const baseUrl = process.env.HUMTRACE_BASE_URL || "http://localhost:3009";

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

async function request(path, { method = "GET", body, cookie, redirect = "manual" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    redirect,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data, cookie: cookieFrom(response) || cookie };
}

async function patchSettings(cookie, settings) {
  return request("/api/admin/settings", {
    method: "PATCH",
    cookie,
    body: { settings }
  });
}

function isProtectedRedirect(result) {
  return [307, 308].includes(result.response.status) || (result.response.status === 200 && String(result.data).includes("NEXT_REDIRECT"));
}

async function main() {
  const originalSettings = await prisma.systemSetting.findMany();
  const restoreSettings = Object.fromEntries(originalSettings.map((row) => [row.key, row.value]));

  const publicReport = await prisma.report.findFirst({
    where: { publicId: "UI-2026-0001" },
    select: { id: true, publicId: true, status: true, visibility: true, publicVisible: true, lifecycleStatus: true }
  });
  assert(publicReport, "UI-2026-0001 public validation report should exist");

  const targetUser = await prisma.user.findUnique({ where: { email: "reporter@humtrace.demo" } });
  assert(targetUser, "demo reporter should exist");
  await prisma.user.update({
    where: { id: "user_demo_admin" },
    data: { status: "ACTIVE" }
  });
  const originalAdminStatuses = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, status: true }
  });

  try {
    const loggedOutDashboard = await request("/admin/dashboard");
    assert(isProtectedRedirect(loggedOutDashboard), "logged-out user should not access admin dashboard");

    const reporterLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "reporter@humtrace.demo", password: "ReporterDemo!2026" }
    });
    assert.equal(reporterLogin.response.status, 200, "reporter login should work");
    const reporterDashboard = await request("/admin/dashboard", { cookie: reporterLogin.cookie });
    assert(isProtectedRedirect(reporterDashboard), "reporter should not access admin dashboard");

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "admin@humtrace.demo", password: "AdminDemo!2026" }
    });
    assert.equal(adminLogin.response.status, 200, "admin login should work");
    const adminCookie = adminLogin.cookie;

    const adminDashboard = await request("/admin/dashboard", { cookie: adminCookie, redirect: "follow" });
    assert.equal(adminDashboard.response.status, 200, "admin dashboard should load for admin");
    assert(String(adminDashboard.data).includes("Admin moderation does not confirm or reject identity"), "admin dashboard should show identity-safety disclaimer");
    assert(String(adminDashboard.data).includes("Possible Recommendations Generated"), "admin dashboard should show real recommendation aggregate label");

    const adminManage = await request("/admin/manage", { cookie: adminCookie, redirect: "follow" });
    assert.equal(adminManage.response.status, 200, "admin manage should load for admin");
    assert(String(adminManage.data).includes("Reports"), "admin manage should include reports tab");
    assert(String(adminManage.data).includes("Users"), "admin manage should include users tab");
    assert(String(adminManage.data).includes("Audit Logs"), "admin manage should include audit logs tab");
    assert(String(adminManage.data).includes("Settings"), "admin manage should include settings tab");
    assert(!String(adminManage.data).includes("passwordHash"), "admin manage HTML must not expose password hashes");

    const hide = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "HIDDEN" }
    });
    assert.equal(hide.response.status, 200, "admin should hide a public report");
    assert.equal(hide.data.visibility, "HIDDEN", "hidden report should use hidden visibility");

    const archive = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "ARCHIVED" }
    });
    assert.equal(archive.response.status, 200, "admin should archive inappropriate public content");
    assert.equal(archive.data.status, "ARCHIVED", "archive status should persist");

    const invalidPublic = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "PUBLIC" }
    });
    assert.equal(invalidPublic.response.status, 400, "archived report should not move directly to public");

    const restore = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "UNDER_REVIEW" }
    });
    assert.equal(restore.response.status, 200, "admin should restore archived content to review");

    const unacknowledgedRepublish = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "PUBLIC" }
    });
    assert.equal(unacknowledgedRepublish.response.status, 400, "admin should explicitly acknowledge human review before publication");

    const republish = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "PUBLIC", humanReviewAcknowledged: true }
    });
    assert.equal(republish.response.status, 200, "admin should restore reviewed content to public");

    const invalidStatus = await request(`/api/reports/${publicReport.publicId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: ["IDENTITY", "CONFIRMED"].join("_") }
    });
    assert.equal(invalidStatus.response.status, 400, "admin must not set identity outcome statuses");

    const userActivate = await request(`/api/admin/users/${targetUser.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { action: "activate" }
    });
    assert.equal(userActivate.response.status, 200, "admin should activate a reporter account");
    assert(!("passwordHash" in userActivate.data.user), "user update response must not expose passwordHash");

    const freshReporterLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "reporter@humtrace.demo", password: "ReporterDemo!2026" }
    });
    assert.equal(freshReporterLogin.response.status, 200, "active reporter login should work before deactivation");

    const userDeactivate = await request(`/api/admin/users/${targetUser.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { action: "deactivate" }
    });
    assert.equal(userDeactivate.response.status, 200, "admin should deactivate a reporter account");
    const remainingSessions = await prisma.session.count({ where: { userId: targetUser.id } });
    assert.equal(remainingSessions, 0, "deactivation should revoke reporter sessions");

    const restoreUser = await request(`/api/admin/users/${targetUser.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { action: "activate" }
    });
    assert.equal(restoreUser.response.status, 200, "admin should reactivate reporter account");

    await prisma.user.updateMany({
      where: {
        role: "ADMIN",
        id: { not: "user_demo_admin" }
      },
      data: { status: "DEACTIVATED" }
    });
    const lastAdminBlock = await request("/api/admin/users/user_demo_admin", {
      method: "PATCH",
      cookie: adminCookie,
      body: { action: "deactivate" }
    });
    assert.equal(lastAdminBlock.response.status, 400, "last active admin should be protected");

    const invalidThreshold = await patchSettings(adminCookie, { recommendationDisplayThreshold: 101 });
    assert.equal(invalidThreshold.response.status, 400, "invalid recommendation threshold should fail");

    const disablePublic = await patchSettings(adminCookie, { publicSearchEnabled: false });
    assert.equal(disablePublic.response.status, 200, "admin should persist public search setting");
    const blockedTrack = await request(`/api/track/${publicReport.publicId}`);
    assert.equal(blockedTrack.response.status, 503, "public tracking should respect public search setting");

    const disableSubmission = await patchSettings(adminCookie, { reportSubmissionEnabled: false, publicSearchEnabled: true });
    assert.equal(disableSubmission.response.status, 200, "admin should persist report submission setting");
    const blockedSubmission = await fetch(`${baseUrl}/api/reports`, { method: "POST" });
    assert.equal(blockedSubmission.status, 503, "report submission API should respect setting before parsing form data");

    const maintenance = await patchSettings(adminCookie, { maintenanceMode: true, reportSubmissionEnabled: true });
    assert.equal(maintenance.response.status, 200, "admin should persist maintenance mode");
    const blockedContact = await request("/api/contact-requests", {
      method: "POST",
      body: { reportId: publicReport.publicId, message: "Maintenance mode should block this contact request." }
    });
    assert.equal(blockedContact.response.status, 503, "contact requests should respect maintenance mode");

    const auditCount = await prisma.auditLog.count({ where: { userId: "user_demo_admin" } });
    assert(auditCount > 0, "admin actions should create audit logs");

    console.log("Phase 4 admin workflow check passed against " + baseUrl);
  } finally {
    await prisma.report.update({
      where: { id: publicReport.id },
      data: {
        status: publicReport.status,
        visibility: publicReport.visibility,
        publicVisible: publicReport.publicVisible,
        lifecycleStatus: publicReport.lifecycleStatus
      }
    }).catch(() => {});
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: targetUser.status }
    }).catch(() => {});
    for (const admin of originalAdminStatuses) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { status: admin.status }
      }).catch(() => {});
    }
    for (const [key, value] of Object.entries(restoreSettings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      }).catch(() => {});
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
