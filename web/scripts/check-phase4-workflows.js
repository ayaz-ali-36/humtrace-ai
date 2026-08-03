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
    publicVisible: "true",
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
  assert(submitted.data.recommendations.length <= 5, "report submission should return no more than five immediate recommendations");

  const storedSubmitted = await prisma.report.findUnique({ where: { publicId: submitted.data.caseId } });
  assert.equal(storedSubmitted.status, "PUBLIC", "a reporter-requested public report should publish without admin pre-approval");
  assert.equal(storedSubmitted.visibility, "PUBLIC", "a reporter-requested public report should be publicly visible immediately");
  assert.equal(storedSubmitted.publicVisible, true, "public visibility choice should be preserved");

  const serialized = JSON.stringify(submitted.data.recommendations);
  for (const forbidden of ["storagePath", "reporter@", "phone", "auditLogs", "passwordHash"]) {
    assert(!serialized.includes(forbidden), `public recommendation response leaked ${forbidden}`);
  }

  const sameTypeSubmitted = await multipartReport({
    cookie: reporterCookie,
    overrides: { name: "Same Type Candidate" }
  });
  assert.equal(sameTypeSubmitted.response.status, 200, "second same-type report submission should succeed");
  assert(
    sameTypeSubmitted.data.recommendations.some((item) => item.similarReportId === submitted.data.caseId),
    "a new missing report should be compared with eligible public missing reports as well as unidentified reports"
  );

  let recommendationId = submitted.data.recommendations[0]?.id;
  if (!recommendationId) {
    const source = await prisma.report.findUnique({ where: { publicId: submitted.data.caseId } });
    const target = await prisma.report.findUnique({ where: { publicId: "UI-2026-0001" } });
    const row = await prisma.recommendation.upsert({
      where: { sourceReportId_targetReportId: { sourceReportId: source.id, targetReportId: target.id } },
      update: { score: 70, qualityLabel: "Possible similarity", sharedAttributes: "[]", breakdownSummary: "[]", scoringVersion: "phase4-workflow-validation", invalidatedAt: null, status: "NEW" },
      create: { sourceReportId: source.id, targetReportId: target.id, score: 70, qualityLabel: "Possible similarity", sharedAttributes: "[]", breakdownSummary: "[]", scoringVersion: "phase4-workflow-validation", status: "NEW" }
    });
    recommendationId = row.id;
  }
  const submittedId = submitted.data.caseId;
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
    body: { action: "request_contact", message: "Please review this possible recommendation for family follow-up.", humanReviewAcknowledged: true }
  });
  assert.equal(contact.response.status, 200, "owner should request contact from recommendation");
  assert.equal(contact.data.status, "CONTACT_REQUESTED", "recommendation status should become contact requested");
  assert.equal(contact.data.contact, null, "contact request must not reveal contact details");

  const recommendation = await prisma.recommendation.findUnique({ where: { id: recommendationId } });
  assert.equal(recommendation.status, "CONTACT_REQUESTED", "recommendation status should persist");

  const sourceReport = await prisma.report.findUnique({ where: { publicId: submittedId } });
  const actionNames = ["dismiss", "suppress", "flag"];
  const actionRecommendations = [];
  for (let index = 0; index < actionNames.length; index += 1) {
    const suffix = 9001 + index;
    const targetReport = await prisma.report.create({
      data: {
        publicId: `UI-2026-${suffix}`,
        type: "UNIDENTIFIED",
        reporterId: "user_second_reporter",
        nameUnknown: true,
        approximateAge: "30",
        broadRegion: "Sindh",
        description: `Clearly fictional recommendation ${actionNames[index]} workflow target.`,
        status: "PUBLIC",
        visibility: "PUBLIC",
        publicVisible: true,
        consentToContact: true
      }
    });
    actionRecommendations.push(await prisma.recommendation.create({
      data: {
        sourceReportId: sourceReport.id,
        targetReportId: targetReport.id,
        score: 50 + index,
        qualityLabel: "Possible similarity",
        sharedAttributes: "[]",
        breakdownSummary: "[]",
        scoringVersion: "phase5-action-workflow",
        status: "NEW"
      }
    }));
  }

  const dismissed = await jsonRequest(`/api/recommendations/${actionRecommendations[0].id}`, { method: "PATCH", cookie: reporterCookie, body: { action: "dismiss" } });
  assert.equal(dismissed.response.status, 200, "owner should dismiss a recommendation");
  const dismissedContact = await jsonRequest(`/api/recommendations/${actionRecommendations[0].id}`, { method: "PATCH", cookie: reporterCookie, body: { action: "request_contact", message: "A dismissed suggestion must not start contact.", humanReviewAcknowledged: true } });
  assert.equal(dismissedContact.response.status, 409, "dismissed recommendation should not start contact");

  const suppressed = await jsonRequest(`/api/recommendations/${actionRecommendations[1].id}`, { method: "PATCH", cookie: reporterCookie, body: { action: "suppress", reason: "Not relevant to this fictional workflow" } });
  assert.equal(suppressed.response.status, 200, "owner should suppress a recommendation pair");
  assert(await prisma.suppressedPair.findFirst({ where: { sourceReportId: sourceReport.id, targetReportId: actionRecommendations[1].targetReportId } }), "suppression should persist");

  const flagged = await jsonRequest(`/api/recommendations/${actionRecommendations[2].id}`, { method: "PATCH", cookie: reporterCookie, body: { action: "flag", reason: "Quality concern", notes: "Clearly fictional workflow note." } });
  assert.equal(flagged.response.status, 200, "owner should flag a recommendation for operational review");
  assert(await prisma.recommendationFeedback.findFirst({ where: { recommendationId: actionRecommendations[2].id, action: "FLAG" } }), "quality flag should persist");

  const reciprocal = await prisma.recommendation.create({
    data: {
      sourceReportId: actionRecommendations[2].targetReportId,
      targetReportId: sourceReport.id,
      score: 52,
      qualityLabel: "Possible similarity",
      sharedAttributes: "[]",
      breakdownSummary: "[]",
      scoringVersion: "phase5-action-workflow",
      status: "NEW"
    }
  });
  const reciprocalViewed = await jsonRequest(`/api/recommendations/${reciprocal.id}`, { method: "PATCH", cookie: secondLogin.cookie, body: { action: "view" } });
  assert.equal(reciprocalViewed.response.status, 200, "reciprocal recommendation should be manageable by the other report owner");

  const unidentified = await multipartReport({
    cookie: secondLogin.cookie,
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
