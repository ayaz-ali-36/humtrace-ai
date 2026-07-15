const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const bad = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && [".ts", ".tsx"].includes(path.extname(entry.name))) bad.push(path.relative(root, full));
  }
}

walk(root);
if (bad.length) {
  console.error(`TypeScript files are not allowed:\n${bad.join("\n")}`);
  process.exit(1);
}
console.log("JavaScript-only check passed: no .ts or .tsx files found.");
