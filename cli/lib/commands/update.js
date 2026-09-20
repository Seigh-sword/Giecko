const fs = require("fs");
const { spawnSync } = require("child_process");
const { parse } = require("../flags");
const { tokenFor } = require("../store");
const { haveGh, ghApiJson } = require("../run");
const { loadAll } = require("../templates");
const { installFiles } = require("./launch");

function readConfig(p) {
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function npmLatest() {
  const r = spawnSync("npm", ["view", "giecko", "version"], { encoding: "utf8", timeout: 15000 });
  return r.status === 0 ? String(r.stdout || "").trim().split("\n").pop().trim() : "";
}

function newer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) === (pb[i] || 0)) continue;
    return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function run(argv, cfg, store) {
  const f = parse(argv, [["config", "str", ".giecko.json"], ["repo", "str", null], ["account", "str", null], ["self", "bool", false], ["on", "bool", false], ["off", "bool", false]]);
  if (f.on || f.off) {
    cfg.autoUpdateCheck = f.on ? true : false;
    store.save(cfg);
    process.stdout.write("auto update check: " + (cfg.autoUpdateCheck ? "on" : "off") + "\n");
    return;
  }
  const pkg = require("../package.json");
  const latest = npmLatest();
  if (!latest) process.stdout.write("CLI " + pkg.version + " (could not reach the npm registry)\n");
  else if (newer(latest, pkg.version)) process.stdout.write("CLI update available: " + pkg.version + " -> " + latest + "\n");
  else process.stdout.write("CLI " + pkg.version + " is current\n");
  if (f.self) {
    process.stdout.write("installing the latest CLI...\n");
    const r = spawnSync("npm", ["install", "-g", "giecko@latest"], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("npm install -g failed");
    return;
  } else if (latest && newer(latest, pkg.version)) {
    process.stdout.write("install it with: npm install -g giecko@latest (or: giecko update --self)\n");
  }
  const conf = readConfig(f.config);
  const repo = f.repo || conf.repo;
  if (!repo) {
    process.stdout.write("no repository configured; skipped session files\n");
    return;
  }
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const accountName = f.account || conf.account || null;
  const token = accountName ? tokenFor(cfg, accountName) : cfg.activeAccount && cfg.accounts[cfg.activeAccount] ? cfg.accounts[cfg.activeAccount].token : null;
  const branch = ghApiJson(token, "repos/" + repo).default_branch;
  const templates = loadAll(token);
  process.stdout.write("updating session files in " + repo + " (branch " + branch + ")...\n");
  installFiles(token, repo, branch, templates, true, true);
  process.stdout.write("session files updated\n");
}

module.exports = { run };
