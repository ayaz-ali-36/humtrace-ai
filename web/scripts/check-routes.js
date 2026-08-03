const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const routes = [
  "app/page.js",
  "app/search/page.js",
  "app/browse/page.js",
  "app/report/missing/page.js",
  "app/report/unidentified/page.js",
  "app/track/page.js",
  "app/about/page.js",
  "app/contact/page.js",
  "app/login/page.js",
  "app/register/page.js",
  "app/reporter/dashboard/page.js",
  "app/reporter/my-reports/page.js",
  "app/reporter/claim-report/page.js",
  "app/reporter/recommendations/page.js",
  "app/reporter/connection-requests/page.js",
  "app/reporter/profile/page.js",
  "app/admin/dashboard/page.js",
  "app/admin/manage/page.js",
  "app/admin/staff/page.js",
  "app/(auth)/admin/login/page.js",
  "app/api/health/route.js"
];

const missing = routes.filter((route) => !fs.existsSync(path.join(root, route)));
if (missing.length) {
  console.error(`Missing required files:\n${missing.join("\n")}`);
  process.exit(1);
}

const pageFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name === "page.js") pageFiles.push(full);
  }
}
walk(path.join(root, "app"));
const expectedPageCount = routes.filter((route) => route.endsWith("page.js")).length;
if (pageFiles.length !== expectedPageCount) {
  console.error(`Expected exactly ${expectedPageCount} page.js files, found ${pageFiles.length}.`);
  process.exit(1);
}

console.log(`Route check passed: ${expectedPageCount} pages and health route present.`);
