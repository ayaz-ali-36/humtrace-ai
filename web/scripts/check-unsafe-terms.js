const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pieces = [
  ["Match", "Found"],
  ["Matches", "Found"],
  ["Identity", "Confirmed"],
  ["Confirm", "Match"],
  ["Reject", "Match"],
  ["Exact", "Match"],
  ["Verified", "Match"],
  ["AI", "Verified", "Identity"],
  ["Biometric", "Match"],
  ["High-Confidence", "Match"],
  ["Verified", "Personnel"],
  ["Verified", "Reporter"],
  ["Invest", "igator"],
  ["Lead", "Invest", "igator"],
  ["Field", "Agent"],
  ["Command", "Center"],
  ["Oper", "ative"],
  ["Fore", "nsic"],
  ["Chain", "of", "Custody"],
  ["DNA", "Verification"],
  ["Fingerprint", "Verification"],
  ["Government-Grade", "Encryption"]
];
const terms = pieces.map((parts) => {
  const text = parts.join(parts.length === 2 && parts[0].endsWith("Invest") ? "" : " ");
  return text
    .replace(["Invest", "igator"].join(" "), ["Invest", "igator"].join(""))
    .replace(["Oper", "ative"].join(" "), ["Oper", "ative"].join(""))
    .replace(["Fore", "nsic"].join(" "), ["Fore", "nsic"].join(""));
});
const exts = new Set([".js", ".jsx", ".css", ".md"]);
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(entry.name) || entry.name === "package-lock.json") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && exts.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, "utf8");
      terms.forEach((term) => {
        if (text.includes(term)) findings.push(`${path.relative(root, full)} -> ${term}`);
      });
    }
  }
}

walk(root);
if (findings.length) {
  console.error(`Unsafe user-facing terms found:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log("Unsafe-word scan passed: no prohibited phrases found.");
