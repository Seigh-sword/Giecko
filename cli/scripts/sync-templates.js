const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const out = path.join(__dirname, "..");
const pairs = [
  [".github/workflows/giecko.yml", "templates/giecko.yml"],
  ["scripts/giecko.sh", "templates/giecko.sh"],
  ["scripts/giecko.ps1", "templates/giecko.ps1"],
  ["scripts/giecko", "templates/giecko"],
  ["TERMS.md", "terms.txt"],
];

for (const [src, dst] of pairs) {
  const a = path.join(root, src);
  const b = path.join(out, dst);
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
  console.log("synced " + dst);
}
