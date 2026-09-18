const fs = require("fs");
const path = require("path");
const { ghApiJson } = require("./run");

function upstream() {
  return process.env.GIECKO_UPSTREAM || process.env.GIEKO_UPSTREAM || "Seigh-sword/Giecko";
}

function files() {
  return [
    { repoPath: ".github/workflows/giecko.yml", bundle: "giecko.yml" },
    { repoPath: "scripts/giecko.sh", bundle: "giecko.sh" },
    { repoPath: "scripts/giecko", bundle: "giecko" },
  ];
}

function bundled(name) {
  return fs.readFileSync(path.join(__dirname, "..", "templates", name), "utf8");
}

function fetchRemote(token, branch, repoPath) {
  const j = ghApiJson(token, `repos/${upstream()}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
  return Buffer.from(j.content, "base64").toString("utf8");
}

function defaultBranch(token) {
  return ghApiJson(token, `repos/${upstream()}`).default_branch;
}

function loadAll(token) {
  try {
    const branch = defaultBranch(token);
    return files().map((f) => ({ ...f, body: fetchRemote(token, branch, f.repoPath), source: `remote@${branch}` }));
  } catch {
    return files().map((f) => ({ ...f, body: bundled(f.bundle), source: "bundled" }));
  }
}

module.exports = { files, loadAll };
