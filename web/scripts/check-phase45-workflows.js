const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const base = process.env.HUMTRACE_BASE_URL || "http://localhost:3010";
async function call(url, options = {}) { const response = await fetch(base + url, { method: options.method || "GET", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.cookie ? { Cookie: options.cookie } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined, redirect: "manual" }); return { response, data: await response.json().catch(() => ({})), cookie: response.headers.get("set-cookie")?.split(";")[0] }; }
(async () => {
  let staffId;
  const report = await prisma.report.findFirst({ where: { reporterId: "user_demo_reporter", status: { in: ["SUBMITTED", "UNDER_REVIEW", "PUBLIC"] } }, orderBy: { createdAt: "desc" } });
  assert(report, "an editable reporter-owned report is required");
  const original = { ...report };
  try {
    const reporterLogin = await call("/api/auth/login", { method: "POST", body: { email: "reporter@humtrace.demo", password: "ReporterDemo!2026" } }); assert.equal(reporterLogin.response.status, 200);
    const path = `/api/reports/${report.publicId}`;
    const edit = await call(path, { method: "PATCH", cookie: reporterLogin.cookie, body: { action: "edit", name: report.fullName, age: report.approximateAge, heightCm: report.heightCm || 165, weightKg: report.weightKg || 60, gender: report.gender || "Not specified", region: report.broadRegion, description: "Phase 4.5 reporter-owned edit workflow validation." } }); assert.equal(edit.response.status, 200); assert.equal(edit.data.report.rawStatus, "UNDER_REVIEW");
    const close = await call(path, { method: "PATCH", cookie: reporterLogin.cookie, body: { action: "close" } }); assert.equal(close.data.report.rawStatus, "CLOSED_BY_REPORTER");
    const reopen = await call(path, { method: "PATCH", cookie: reporterLogin.cookie, body: { action: "reopen" } }); assert.equal(reopen.data.report.rawStatus, "UNDER_REVIEW");
    const other = await call("/api/auth/login", { method: "POST", body: { email: "second.reporter@humtrace.demo", password: "SecondReporter!2026" } }); const forbidden = await call(path, { method: "PATCH", cookie: other.cookie, body: { action: "archive" } }); assert.equal(forbidden.response.status, 403);
    const admin = await call("/api/auth/login", { method: "POST", body: { email: "admin@humtrace.demo", password: "AdminDemo!2026", adminOnly: true } }); assert.equal(admin.response.status, 200);
    const email = `phase45.staff.${Date.now()}@humtrace.local`; const staff = await call("/api/admin/staff", { method: "POST", cookie: admin.cookie, body: { name: "Phase 4.5 Staff", email, password: "Phase45Staff!2026" } }); assert.equal(staff.response.status, 201); staffId = staff.data.staff.id;
    const staffLogin = await call("/api/auth/login", { method: "POST", body: { email, password: "Phase45Staff!2026", adminOnly: true } }); assert.equal(staffLogin.response.status, 200);
    const form = new FormData(); form.set("age", "25"); form.set("gender", "Male"); form.set("description", "brown jacket average build public assistance"); form.set("searchScope", "ALL"); form.set("aiProcessingConsent", "true"); const search = await fetch(base + "/api/search/recommendations", { method: "POST", body: form }); const searchData = await search.json(); assert.equal(search.status, 200); assert(Array.isArray(searchData.recommendations)); assert(!JSON.stringify(searchData).includes("storagePath"));
    console.log("Phase 4.5 workflow check passed against " + base);
  } finally {
    const { id, reporterId, createdAt, updatedAt, ...restore } = original; await prisma.report.update({ where: { id: report.id }, data: restore }).catch(() => {});
    if (staffId) { await prisma.session.deleteMany({ where: { userId: staffId } }).catch(() => {}); await prisma.auditLog.deleteMany({ where: { resource: `users:${staffId}` } }).catch(() => {}); await prisma.user.delete({ where: { id: staffId } }).catch(() => {}); }
    await prisma.$disconnect();
  }
})().catch((error) => { console.error(error); process.exit(1); });
