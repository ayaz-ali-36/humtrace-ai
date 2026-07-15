const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const bad = [];
const exts = new Set([".js", ".jsx", ".css", ".md"]);
const externalPrefix = "http" + "s?";
const imageExts = "png|jpe?g|gif|webp|svg";
const hostedMarkers = new RegExp(["google", "usercontent|sti", "tch"].join(""), "i");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && exts.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, "utf8");
      const quoteChars = String.fromCharCode(34, 39, 96);
      const urls = text.match(new RegExp(`${externalPrefix}:\\/\\/[^\\s${quoteChars})]+`, "g")) || [];
      const imageUrls = urls.filter((url) => new RegExp(`\\.(${imageExts})(\\?|#|$)`, "i").test(url) || hostedMarkers.test(url));
      imageUrls.forEach((url) => bad.push(`${path.relative(root, full)} -> ${url}`));
    }
  }
}

walk(root);
if (bad.length) {
  console.error(`External image references found:\n${bad.join("\n")}`);
  process.exit(1);
}
console.log("External-image check passed: no external image references found.");
