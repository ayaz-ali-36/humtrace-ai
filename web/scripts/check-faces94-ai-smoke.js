const assert = require("assert");
const fs = require("fs");
const path = require("path");

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

async function request(endpoint, { body, contentType } = {}) {
  const response = await fetch(`http://127.0.0.1:5055${endpoint}`, {
    method: endpoint === "/health" ? "GET" : "POST",
    headers: {
      "X-HumTrace-Internal-Token": process.env.HUMTRACE_AI_INTERNAL_TOKEN,
      "X-Request-ID": `faces94-smoke-${Date.now()}`,
      ...(contentType ? { "Content-Type": contentType } : {})
    },
    body,
    signal: AbortSignal.timeout(210000)
  });
  const data = await response.json().catch(() => ({}));
  assert.strictEqual(response.status, 200, `${endpoint} failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  loadEnv();
  const datasetIndex = process.argv.indexOf("--dataset");
  const dataset = datasetIndex >= 0 ? process.argv[datasetIndex + 1] : process.env.HUMTRACE_EVALUATION_DATASET;
  if (!dataset) throw new Error("Provide --dataset <humanTrace_Faces94_100 folder>");
  const root = path.resolve(dataset);
  const fixtures = ["HTR-0001-M.jpg", "HTR-0001-U.jpg", "HTR-0002-M.jpg"].map((name) => path.join(root, "images", name));
  fixtures.forEach((file) => assert(fs.existsSync(file), `Fixture missing: ${file}`));
  const health = await request("/health");
  assert.strictEqual(health.status, "ok");
  assert.strictEqual(health.generativeImages, false);
  assert.strictEqual(health.models?.face?.id, "deepface-facenet");

  const vectors = [];
  for (const file of fixtures) {
    const result = await request("/ai/face-embedding", { body: fs.readFileSync(file), contentType: "image/jpeg" });
    assert.strictEqual(result.outcome, "AVAILABLE", JSON.stringify(result));
    assert.strictEqual(result.modelId, "deepface-facenet");
    assert.strictEqual(result.dimensions, 128);
    assert(Array.isArray(result.embedding) && result.embedding.length === 128 && result.embedding.every(Number.isFinite));
    vectors.push(result.embedding);
  }
  const cosine = await request("/ai/cosine-similarity", {
    contentType: "application/json",
    body: JSON.stringify({ source: vectors[0], candidates: [{ id: "same", vector: vectors[1] }, { id: "different", vector: vectors[2] }] })
  });
  const same = cosine.results.find((item) => item.id === "same")?.similarity;
  const different = cosine.results.find((item) => item.id === "different")?.similarity;
  assert(Number.isFinite(same) && Number.isFinite(different));
  assert(same > different, `Expected same identity to rank higher: same=${same}, different=${different}`);
  console.log(JSON.stringify({ ok: true, dimensions: 128, sameIdentitySimilarity: same, differentIdentitySimilarity: different, rankingPassed: true, thresholdCalibrated: false }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
