const fs = require("fs");
const path = require("path");

function run(argv, cfg) {
  const p = path.join(__dirname, "..", "..", "CHANGELOG.md");
  process.stdout.write(fs.readFileSync(p, "utf8"));
}

module.exports = { run };
