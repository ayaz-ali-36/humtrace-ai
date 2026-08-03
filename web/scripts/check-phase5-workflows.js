const assert = require("assert");
const fs = require("fs");
const path = require("path");

const baseUrl = process.env.HUMTRACE_BASE_URL || "http://localhost:3011";

function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const webHealth = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
  assert.equal(webHealth.phase, "phase-5-local-engineering");
  assert.equal(webHealth.generativeImages, false);

  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN;
  const internalHeaders = { "X-HumTrace-Internal-Token": token, "X-Request-ID": "phase5-live-check", "Content-Type": "application/json" };
  const aiHealthResponse = await fetch("http://127.0.0.1:5055/health", { headers: { "X-HumTrace-Internal-Token": token } });
  assert.equal(aiHealthResponse.status, 200);
  const aiHealth = await aiHealthResponse.json();
  assert.equal(aiHealth.generativeImages, false);
  assert.equal(aiHealth.concurrency, 1);

  const scoreResponse = await fetch("http://127.0.0.1:5055/ai/recommendation-score", {
    method: "POST",
    headers: internalHeaders,
    body: JSON.stringify({
      policyVersion: "phase5-additive-1",
      signals: {
        face: { available: false, score: 0 },
        age: { available: true, score: 80 },
        gender: { available: true, score: 100 },
        height: { available: true, score: 75 },
        weight: { available: true, score: 70 },
        location: { available: true, score: 90 },
        description: { available: true, score: 60 }
      }
    })
  });
  assert.equal(scoreResponse.status, 200);
  const score = await scoreResponse.json();
  assert.equal(score.score, 80);
  assert.equal(score.availableWeight, 0.6);
  assert.equal(score.humanReviewRequired, true);

  const form = new FormData();
  form.set("age", "30");
  form.set("region", "Punjab");
  form.set("description", "Blue shirt and a small visible scar near the left eyebrow");
  form.set("searchScope", "ALL");
  form.set("aiProcessingConsent", "true");
  const searchResponse = await fetch(`${baseUrl}/api/search/recommendations`, { method: "POST", body: form });
  assert.equal(searchResponse.status, 200);
  const search = await searchResponse.json();
  assert(Array.isArray(search.recommendations));
  assert(search.recommendations.length <= 10);
  assert.equal(search.aiAssistance.imageGenerated, false);
  assert.equal(search.aiAssistance.humanReviewRequired, true);
  assert(!JSON.stringify(search).includes("storagePath"));
  assert(!JSON.stringify(search).includes("embedding"));

  console.log(`Phase 5 live workflow check passed against ${baseUrl}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
