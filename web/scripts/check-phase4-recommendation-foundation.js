const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, value, label) {
  if (!source.includes(value)) {
    throw new Error(`${label} missing required Phase 4 marker: ${value}`);
  }
}

function main() {
  const phase5Present = fs.existsSync(path.join(root, "..", "ai-service"));

  const recommendationsLib = read("lib/recommendations.js");
  for (const marker of ["scoreReportPair", "generateRecommendationsForReport", "getReporterRecommendations", ...(phase5Present ? [] : ["Face similarity is not available"])]) {
    assertIncludes(recommendationsLib, marker, "recommendations library");
  }

  const reportApi = read("app/api/reports/route.js");
  assertIncludes(reportApi, phase5Present ? "enqueueReportAI" : "generateRecommendationsForReport", "report submit API");
  assertIncludes(reportApi, "recommendations", "report submit response");

  const recommendationApi = read("app/api/recommendations/[id]/route.js");
  for (const marker of ["request_contact", "DISMISSED", "CONTACT_REQUESTED", "sourceReport.reporterId !== user.id", "contact: null"]) {
    assertIncludes(recommendationApi, marker, "recommendation action API");
  }

  const reporterPage = read("app/reporter/recommendations/page.js");
  assertIncludes(reporterPage, "getReporterRecommendations", "reporter recommendations page");

  const ui = read("components/ui/kit.jsx");
  for (const marker of ["Possible match", "View Next 5", "No possible matches yet", "Sign In to Request Contact"]) {
    assertIncludes(ui, marker, "recommendation UI");
  }

  const forbidden = phase5Present ? [] : ["DeepFace", "FaceNet", "SentenceTransformers", "/ai-service"];
  const combined = [recommendationsLib, reportApi, recommendationApi, reporterPage, ui].join("\n");
  for (const marker of forbidden) {
    if (combined.includes(marker)) throw new Error(`Phase 4 source includes out-of-scope marker: ${marker}`);
  }

  console.log("Phase 4 recommendation foundation check passed.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
