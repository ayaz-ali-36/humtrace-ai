const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const baseUrl = process.env.HUMTRACE_BASE_URL || "http://localhost:3002";

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

async function main() {
  const unique = Date.now();
  const email = `workflow-${unique}@humtrace.demo`;

  const register = await request("/api/auth/register", {
    method: "POST",
    body: {
      name: "Workflow Reporter",
      email,
      phone: "+92-300-1111111",
      password: "Workflow!2026",
      role: "ADMIN"
    }
  });
  assert.equal(register.response.status, 200, "registration should succeed");
  assert(!register.cookie, "registration should not auto-login or set a session cookie");
  assert.equal(register.data.redirectTo, "/login", "registration should redirect to login");

  const registered = await prisma.user.findUnique({ where: { email } });
  assert.equal(registered.role, "REPORTER", "public registration must not create admin accounts");
  assert(registered.passwordHash && !registered.passwordHash.includes("Workflow!2026"), "password hash must not expose raw password");

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: {
      name: "Duplicate Reporter",
      email,
      password: "Workflow!2026"
    }
  });
  assert.equal(duplicate.response.status, 409, "duplicate email should be blocked");

  const wrongLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "reporter@humtrace.demo", password: "wrong-password" }
  });
  assert.equal(wrongLogin.response.status, 401, "wrong password should fail");
  assert.equal(wrongLogin.data.error, "Invalid email or password.", "login failure should be generic");

  const reporterLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "reporter@humtrace.demo", password: "ReporterDemo!2026" }
  });
  assert.equal(reporterLogin.response.status, 200, "reporter login should work");
  const reporterCookie = reporterLogin.cookie;

  const reporterMe = await request("/api/auth/me", { cookie: reporterCookie });
  assert.equal(reporterMe.data.user.email, "reporter@humtrace.demo", "current session should return reporter");
  assert(!("passwordHash" in reporterMe.data.user), "current session response must not expose passwordHash");

  const loggedOutAdmin = await request("/admin/manage");
  assert([307, 308].includes(loggedOutAdmin.response.status), "logged-out admin page should redirect");

  const reporterAdminPage = await request("/admin/manage", { cookie: reporterCookie });
  assert([307, 308].includes(reporterAdminPage.response.status), "reporter should not access admin pages");

  const reporterAdminMutation = await request("/api/reports/MP-2026-0049", {
    method: "PATCH",
    cookie: reporterCookie,
    body: { status: "UNDER_REVIEW" }
  });
  assert.equal(reporterAdminMutation.response.status, 403, "reporter should not use admin moderation API");

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "admin@humtrace.demo", password: "AdminDemo!2026" }
  });
  assert.equal(adminLogin.response.status, 200, "admin login should work");
  const adminCookie = adminLogin.cookie;

  const adminMutation = await request("/api/reports/MP-2026-0049", {
    method: "PATCH",
    cookie: adminCookie,
    body: { status: "UNDER_REVIEW" }
  });
  assert.equal(adminMutation.response.status, 200, "admin moderation should work for admin");

  const adminContactRequest = await request("/api/contact-requests", {
    method: "POST",
    cookie: adminCookie,
    body: { reportId: "UI-2026-0001", message: "Admin must not be able to force reporter contact." }
  });
  assert.equal(adminContactRequest.response.status, 403, "admin should not create reporter contact requests");

  const anonymousContactRequest = await request("/api/contact-requests", {
    method: "POST",
    body: { reportId: "UI-2026-0001", message: "Anonymous visitors must sign in before requesting contact." }
  });
  assert.equal(anonymousContactRequest.response.status, 401, "anonymous visitors should not create contact requests");

  const reporterReportsPage = await request("/reporter/my-reports", { cookie: reporterCookie, redirect: "follow" });
  assert.equal(reporterReportsPage.response.status, 200, "reporter reports page should load for reporter");
  assert(!String(reporterReportsPage.data).includes("UI-2026-0001"), "reporter should not see another reporter's report");

  const publicTrackPage = await request("/track", { redirect: "follow" });
  assert.equal(publicTrackPage.response.status, 200, "track page should load publicly");
  assert(!String(publicTrackPage.data).includes("MP-2026-0049"), "public track page should not ship limited report data");

  const contactOne = await request("/api/contact-requests", {
    method: "POST",
    cookie: reporterCookie,
    body: { reportId: "UI-2026-0001", message: "Workflow request for consent-based contact." }
  });
  assert.equal(contactOne.response.status, 200, "contact request should create or return active request");
  assert(!("contact" in contactOne.data), "new contact request response should not reveal contact");

  const contactTwo = await request("/api/contact-requests", {
    method: "POST",
    cookie: reporterCookie,
    body: { reportId: "UI-2026-0001", message: "Workflow duplicate request for contact." }
  });
  assert.equal(contactTwo.response.status, 200, "duplicate active request should be idempotent");
  assert.equal(contactOne.data.requestId, contactTwo.data.requestId, "duplicate active request should return the same request");

  const pendingRequest = contactOne.data.requestId;
  const reporterAccept = await request(`/api/contact-requests/${pendingRequest}`, {
    method: "PATCH",
    cookie: reporterCookie,
    body: { action: "accept" }
  });
  assert.equal(reporterAccept.response.status, 403, "requester cannot accept their own sent request");

  const secondLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "second.reporter@humtrace.demo", password: "SecondReporter!2026" }
  });
  assert.equal(secondLogin.response.status, 200, "second reporter login should work");
  const secondCookie = secondLogin.cookie;

  const accept = await request(`/api/contact-requests/${pendingRequest}`, {
    method: "PATCH",
    cookie: secondCookie,
    body: { action: "accept" }
  });
  assert.equal(accept.response.status, 200, "recipient should accept request");
  assert(accept.data.contact?.value, "accepted request should reveal selected contact value");

  const contactAfterAccept = await request("/api/contact-requests", {
    method: "POST",
    cookie: reporterCookie,
    body: { reportId: "UI-2026-0001", message: "Workflow request to test cancellation." }
  });
  assert.equal(contactAfterAccept.response.status, 200, "new request after acceptance should be allowed");

  const cancel = await request(`/api/contact-requests/${contactAfterAccept.data.requestId}`, {
    method: "PATCH",
    cookie: reporterCookie,
    body: { action: "cancel" }
  });
  assert.equal(cancel.response.status, 200, "requester should cancel pending request");
  assert.equal(cancel.data.contact, null, "cancelled request should not reveal contact");

  const logout = await request("/api/auth/logout", { method: "POST", cookie: reporterCookie });
  assert.equal(logout.response.status, 200, "logout should succeed");
  const afterLogout = await request("/api/auth/me", { cookie: logout.cookie });
  assert.equal(afterLogout.data.user, null, "logout should revoke current session");

  console.log("Auth workflow check passed against " + baseUrl);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
