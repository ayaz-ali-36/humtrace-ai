const fs = require("fs"); const path = require("path"); const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const phase5Present = fs.existsSync(path.join(root, "..", "ai-service"));
const checks = {
  "app/(auth)/admin/login/page.js": ["mode=\"admin\""],
  "app/admin/staff/page.js": ["AdminStaffPage", "requireAdmin"],
  "app/api/admin/staff/route.js": ["Admin staff created", "bcrypt.hash"],
  "app/api/search/recommendations/route.js": phase5Present ? ["photoAccepted", "localScore", "discarded"] : ["Photograph validated", "scoreReportPair", "was not stored"],
  "app/api/reports/[publicId]/route.js": ["You can only manage your own reports", "CLOSED_BY_REPORTER", "Reporter report"],
  "components/ui/kit.jsx": ["Smart Search", "Create Admin Staff", "Save and Return to Review", "Reopen for Review"]
};
for (const [file, markers] of Object.entries(checks)) { const text = read(file); for (const marker of markers) if (!text.includes(marker)) throw new Error(`${file} missing ${marker}`); }
console.log("Phase 4.5 foundation check passed.");
