const assert = require("assert");

const baseUrl = process.env.HUMTRACE_BASE_URL || "http://localhost:3005";

function pngBytes() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
}

async function multipartReport({ fileBytes = pngBytes(), fileName = "phase3-valid.png", contentType = "image/png", overrides = {} } = {}) {
  const boundary = `----HumTracePhase3${Date.now()}`;
  const fields = {
    type: "missing",
    name: `Phase Three Test ${Date.now()}`,
    age: "32",
    gender: "Not specified",
    heightFeet: "5.7",
    weightKg: "70",
    region: "",
    locationDetail: "",
    date: "",
    description: "Phase 3 structured report validation with safe details.",
    clothing: "",
    identifyingFeatures: "",
    medicalCondition: "",
    reporterName: "Phase 3 Reporter",
    reporterEmail: `phase3-${Date.now()}@humtrace.demo`,
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
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`));
  chunks.push(fileBytes);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat(chunks)
  });
  return { response, data: await response.json() };
}

async function main() {
  const unknownTrack = await fetch(`${baseUrl}/api/track/MP-2026-9999`);
  assert.equal(unknownTrack.status, 404, "unknown tracking code should return generic 404");

  const publicTrack = await fetch(`${baseUrl}/api/track/UI-2026-0001`);
  assert.equal(publicTrack.status, 200, "public tracking code should return public-safe result");
  const publicTrackData = await publicTrack.json();
  const serialized = JSON.stringify(publicTrackData);
  for (const forbidden of ["storagePath", "reporter", "audit", "description", "contact"]) {
    assert(!serialized.includes(forbidden), `track response leaked ${forbidden}`);
  }

  const invalidSignature = await multipartReport({
    fileBytes: Buffer.from("not really a png"),
    fileName: "..\\bad.png",
    contentType: "image/png"
  });
  assert.equal(invalidSignature.response.status, 400, "spoofed image signature should be rejected");
  assert.match(invalidSignature.data.error, /image signature/i, "spoofed image error should explain the image problem");

  const futureDate = await multipartReport({ overrides: { date: "2999-01-01" } });
  assert.equal(futureDate.response.status, 400, "future dates should be rejected");
  assert.match(futureDate.data.error, /future|valid date/i, "future date error should explain the date problem");

  const lowercaseGender = await multipartReport({ overrides: { gender: "male" } });
  assert.equal(lowercaseGender.response.status, 200, "lowercase gender from old/direct submissions should be normalized");

  const badRelationship = await multipartReport({ overrides: { relationship: "Brother" } });
  assert.equal(badRelationship.response.status, 400, "unsupported relationship should be rejected");
  assert.match(badRelationship.data.error, /relationship/i, "relationship error should name the relationship field");

  const missingConsent = await multipartReport({ overrides: { consent: "false" } });
  assert.equal(missingConsent.response.status, 400, "missing consent should be rejected");
  assert.match(missingConsent.data.error, /consent/i, "consent error should name the consent requirement");

  const missingHeight = await multipartReport({ overrides: { heightFeet: "" } });
  assert.equal(missingHeight.response.status, 400, "missing required height should be rejected");
  assert.match(missingHeight.data.error, /height/i, "height error should name the height field");

  const missingWeight = await multipartReport({ overrides: { weightKg: "" } });
  assert.equal(missingWeight.response.status, 400, "missing required weight should be rejected");
  assert.match(missingWeight.data.error, /weight/i, "weight error should name the weight field");

  const valid = await multipartReport();
  assert.equal(valid.response.status, 200, "structured report submission should succeed");
  assert(/^MP-\d{4}-\d{4}$/.test(valid.data.caseId), "submission should return a tracking code");

  const unidentified = await multipartReport({
    overrides: {
      type: "unidentified",
      name: "",
      age: "Approx. 40",
      gender: "Not specified",
      description: "Unidentified individual workflow validation with safe details."
    }
  });
  assert.equal(unidentified.response.status, 200, "unidentified report with unknown name should succeed");
  assert(/^UI-\d{4}-\d{4}$/.test(unidentified.data.caseId), "unidentified submission should return a UI tracking code");

  console.log("Phase 3 workflow check passed against " + baseUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
