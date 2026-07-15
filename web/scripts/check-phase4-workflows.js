const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const baseUrl = process.env.HUMTRACE_BASE_URL || "http://localhost:3008";

function pngBytes() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

async function jsonRequest(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
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

async function multipartReport({ cookie, overrides = {} } = {}) {
  const boundary = `----HumTracePhase4${Date.now()}${Math.random().toString(16).slice(2)}`;
  const fields = {
    type: "missing",
    name: `Phase Four Test ${Date.now()}`,
    age: "32",
    gender: "Not specified",
    heightFeet: "5.7",
    weightKg: "70",
    region: "",
    locationDetail: "",
    date: "",
    description: "Phase four recommendation workflow validation with safe details.",
    clothing: "",
    identifyingFeatures: "",
    medicalCondition: "",
    reporterName: "Phase 4 Reporter",
    reporterEmail: `phase4-${Date.now()}@humtrace.demo`,
    reporterPhone: "",
    relationship: "",
    reporterContext: "",
    relationshipContext: "",
    preferredContactMethod: "EMAIL",
    publicVisible: "false",
    photoConfirm: "true",
    consent: "true",
    ...overrides
  };

  const chunks = [];
  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="phase4.png"\r\nContent-Type: image/png\r\n\r\n`));
  chunks.push(pngBytes());
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: Buffer.concat(chunks)
  });
  return { response, data: await response.json() };
}

async function main() {
  const publicUi = await prisma.report.findUnique({ where: { publicId: "UI-2026-0001" } });
  assert(publicUi && publicUi.visibility === "PUBLIC" && publicUi.publicVisible, "UI-2026-0001 must be public for recommendation workflow validation");

  const login = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { email: "reporter@humtrace.demo", password: "ReporterDemo!2026" }
  });
  assert.equal(login.response.status, 200, "reporter login should work");
  const reporterCookie = login.cookie;

  const submitted = await multipartReport({ cookie: reporterCookie });
  assert.equal(submitted.response.status, 200, "report submission should succeed");
  assert(/^MP-\d{4}-\d{4}$/.test(submitted.data.caseId), "missing report should return a case ID");
  assert(Array.isArray(submitted.data.recommendations), "report submission should return recommendations array");
  assert(submitted.data.recommendations.length > 0, "report submission should generate at least one public-safe possible recommendation");
  assert(submitted.data.recommendations.length <= 10, "report submission should return no more than 10 recommendations");

  const serialized = JSON.stringify(submitted.data.recommendations);
  for (const forbidden of ["storagePath", "reporter@", "phone", "auditLogs", "passwordHash"]) {
    assert(!serialized.includes(forbidden), `public recommendation response leaked ${forbidden}`);
  }

  const recommendationId = submitted.data.recommendations[0].id;
  const viewed = await jsonRequest(`/api/recommendations/${recommendationId}`, {
    method: "PATCH",
    cookie: reporterCookie,
    body: { action: "view" }
  });
  assert.equal(viewed.response.status, 200, "owner should mark recommendation viewed");
  assert.equal(viewed.data.contact, null, "view action should not reveal contact");

  const secondLogin = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { email: "second.reporter@humtrace.demo", password: "SecondReporter!2026" }
  });
  assert.equal(secondLogin.response.status, 200, "second reporter login should work");

  const forbiddenUpdate = await jsonRequest(`/api/recommendations/${recommendationId}`, {
    method: "PATCH",
    cookie: secondLogin.cookie,
    body: { action: "dismiss" }
  });
  assert.equal(forbiddenUpdate.response.status, 403, "another reporter must not mutate someone else's recommendation");

  const contact = await jsonRequest(`/api/recommendations/${recommendationId}`, {
    method: "PATCH",
    cookie: reporterCookie,
    body: { action: "request_contact", message: "Please review this possible recommendation for family follow-up." }
  });
  assert.equal(contact.response.status, 200, "owner should request contact from recommendation");
  assert.equal(contact.data.status, "CONTACT_REQUESTED", "recommendation status should become contact requested");
  assert.equal(contact.data.contact, null, "contact request must not reveal contact details");

  const recommendation = await prisma.recommendation.findUnique({ where: { id: recommendationId } });
  assert.equal(recommendation.status, "CONTACT_REQUESTED", "recommendation status should persist");

  const submittedId = submitted.data.caseId;
  await prisma.report.update({
    where: { publicId: submittedId },
    data: { status: "PUBLIC", visibility: "PUBLIC", publicVisible: true }
  });

  const unidentified = await multipartReport({
    overrides: {
      type: "unidentified",
      name: "",
      age: "31",
      description: "Unidentified report recommendation workflow validation with safe details."
    }
  });
  assert.equal(unidentified.response.status, 200, "unidentified submission should succeed");
  assert(/^UI-\d{4}-\d{4}$/.test(unidentified.data.caseId), "unidentified report should return UI case ID");
  assert(Array.isArray(unidentified.data.recommendations), "unidentified submission should return recommendations array");

  console.log("Phase 4 workflow check passed against " + baseUrl);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
