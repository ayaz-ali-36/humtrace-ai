const fs = require("fs");
const path = require("path");

const web = path.resolve(__dirname, "..");
const root = path.resolve(web, "..");
const required = [
  "ai-service/app/main.py",
  "ai-service/app/inference_runner.py",
  "ai-service/manifests/models.json",
  "web/lib/ai/client.js",
  "web/lib/ai/jobs.js",
  "web/workers/ai-jobs.js",
  "web/workers/retention.js",
  "web/app/api/ai/processing-basis/route.js"
];
for (const file of required) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Missing Phase 5 foundation file: ${file}`);
}
const service = fs.readFileSync(path.join(root, "ai-service/app/main.py"), "utf8");
for (const endpoint of ["/health", "/ai/face-embedding", "/ai/text-embedding", "/ai/cosine-similarity", "/ai/recommendation-score"]) {
  if (!service.includes(endpoint)) throw new Error(`Missing internal endpoint ${endpoint}`);
}
const worker = fs.readFileSync(path.join(web, "workers/ai-jobs.js"), "utf8");
for (const marker of ["PENDING", "MAX_RECOMMENDATIONS_PER_REPORT = 10", "[item.candidate.id, report.id]", "OUTSIDE_TOP_TEN", "phase5-additive-1", "human review"]) {
  if (!worker.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Missing worker marker: ${marker}`);
}
console.log("Phase 5 foundation checks passed.");
