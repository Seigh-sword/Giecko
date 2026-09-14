const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const files = [path.join(root, "bin", "giecko.js")];
for (const d of ["lib", path.join("lib", "commands")]) {
  for (const f of fs.readdirSync(path.join(root, d))) {
  if (f.endsWith(".js")) files.push(path.join(root, d, f));
  }
}
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) {
  bad = 1;
  process.stdout.write(`FAIL ${path.relative(root, f)}\n${r.stderr || ""}`);
  }
}
if (!bad) process.stdout.write(`checked ${files.length} files\n`);
process.exit(bad);
