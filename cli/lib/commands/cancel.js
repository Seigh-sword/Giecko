const { parse } = require("../flags");
const { haveGh, ghRaw, ghApiJson } = require("../run");

function resolveRepo(cfg, flagRepo) {
  if (flagRepo) return flagRepo;
  try {
    const fs = require("fs");
    if (fs.existsSync(".giecko.json")) {
      const repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
      if (repo) return repo;
    }
  } catch {}
  return ghRaw(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], null);
}

async function run(argv, cfg) {
  const f = parse(argv, [["repo", "str", null]]);
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const repo = resolveRepo(cfg, f.repo);
  const token = cfg.activeAccount && cfg.accounts[cfg.activeAccount] ? cfg.accounts[cfg.activeAccount].token : null;
  let runId = f._[0];
  if (!runId) {
    const j = ghApiJson(token, `repos/${repo}/actions/workflows/giecko.yml/runs?per_page=5`);
    const active = (j.workflow_runs || []).find((x) => x.status !== "completed");
    if (!active) throw new Error("no in-progress run found. Pass a run id: " + "g" + "iecko cancel <run-id>");
    runId = String(active.id);
  }
  ghApiJson(token, `repos/${repo}/actions/runs/${runId}/cancel`, {}, "POST");
  process.stdout.write(`cancel requested for run ${runId} (${repo})\n`);
}

module.exports = { run };
