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

async function main() {
  loadEnv();
  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN;
  const headers = { "X-HumTrace-Internal-Token": token, "X-Request-ID": "phase5-model-smoke" };

  const textResponse = await fetch("http://127.0.0.1:5055/ai/text-embedding", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ texts: ["Clearly fictional missing person demo description.", "Clearly fictional unidentified person demo description."] }),
    signal: AbortSignal.timeout(210000)
  });
  const text = await textResponse.json();
  assert.equal(textResponse.status, 200, `text model smoke failed: ${JSON.stringify(text)}`);
  assert.equal(text.outcome, "AVAILABLE");
  assert.equal(text.dimensions, 384);
  assert.equal(text.vectors?.length, 2);
  assert(text.vectors.every((vector) => vector.length === 384 && vector.every(Number.isFinite)), "text vectors should be finite 384-dimensional values");

  const fixture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  const faceResponse = await fetch("http://127.0.0.1:5055/ai/face-embedding", {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/png", "X-Request-ID": "phase5-face-quality-smoke" },
    body: fixture,
    signal: AbortSignal.timeout(210000)
  });
  const face = await faceResponse.json();
  assert.equal(faceResponse.status, 200, `face quality smoke failed: ${JSON.stringify(face)}`);
  assert.equal(face.outcome, "QUALITY_LIMITED");
  assert(["IMAGE_TOO_SMALL", "IMAGE_DECODE_FAILED"].includes(face.reason), `unexpected safe quality reason: ${face.reason}`);
  assert(!face.embedding, "quality-limited image must not return an embedding");

  const lfwPaths = [
    process.env.HUMTRACE_TEST_FACE_FIXTURE,
    process.env.HUMTRACE_TEST_FACE_FIXTURE_2,
    process.env.HUMTRACE_TEST_FACE_FIXTURE_NEGATIVE
  ].filter(Boolean).map((file) => path.resolve(file));
  let lfwSummary = "";
  if (lfwPaths.length) {
    assert.equal(lfwPaths.length, 3, "provide two same-subject LFW fixtures and one different-subject fixture together");
    const vectors = [];
    for (const [index, file] of lfwPaths.entries()) {
      assert(fs.existsSync(file), `LFW smoke fixture not found: ${file}`);
      const response = await fetch("http://127.0.0.1:5055/ai/face-embedding", {
        method: "POST",
        headers: { ...headers, "Content-Type": "image/jpeg", "X-Request-ID": `phase5-lfw-face-${index + 1}` },
        body: fs.readFileSync(file),
        signal: AbortSignal.timeout(210000)
      });
      const result = await response.json();
      assert.equal(response.status, 200, `LFW face smoke failed: ${JSON.stringify(result)}`);
      assert.equal(result.outcome, "AVAILABLE", `LFW fixture should contain one usable face: ${JSON.stringify(result)}`);
      assert.equal(result.dimensions, 128, "FaceNet should return 128-dimensional vectors");
      assert(result.embedding?.every(Number.isFinite), "face vector should contain only finite numbers");
      vectors.push(result.embedding);
    }
    const cosine = (left, right) => {
      const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
      const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
      const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
      return dot / (leftNorm * rightNorm);
    };
    const sameSubject = cosine(vectors[0], vectors[1]);
    const differentSubject = cosine(vectors[0], vectors[2]);
    assert(Number.isFinite(sameSubject) && Number.isFinite(differentSubject), "LFW cosine scores should be finite");
    assert(sameSubject > differentSubject, "the selected same-subject LFW pair should rank above the selected different-subject pair in this smoke test");
    lfwSummary = ` LFW engineering ranking: same=${sameSubject.toFixed(3)}, different=${differentSubject.toFixed(3)}; no threshold was calibrated.`;
  }

  console.log(`AI model smoke check passed: 384-dimensional English vectors and safe image-quality fallback.${lfwSummary}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
