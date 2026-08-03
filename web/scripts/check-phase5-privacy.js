const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const files = [
  "ai-service/app/main.py",
  "ai-service/app/inference_runner.py",
  "web/app/api/search/recommendations/route.js",
  "web/app/api/ai/processing-basis/route.js",
  "web/workers/ai-jobs.js"
];
const source = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
for (const marker of ["humanReviewRequired", "MULTIPLE_FACES", "NO_FACE", "PROCESSING_PERMISSION_WITHDRAWN", "Search images and query vectors were discarded", "imageGenerated: false"]) {
  if (!source.includes(marker)) throw new Error(`Missing privacy marker: ${marker}`);
}
if (/public[\\/]reports/i.test(source)) throw new Error("Report images must not be placed in public storage.");
console.log("Phase 5 privacy checks passed.");
