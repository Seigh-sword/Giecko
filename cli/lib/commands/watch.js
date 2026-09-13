const { parse } = require("../flags");
const { parseReport, waitFor, realUrl, showQr } = require("../report");

async function run(argv, cfg) {
  const f = parse(argv, [["repo", "str", null]]);
  const runId = f._[0];
  if (!runId) throw new Error("usage: giecko watch <run-id> [--repo owner/name]");
  let repo = f.repo;
  if (!repo) {
    try {
      const fs = require("fs");
      if (fs.existsSync(".giecko.json")) repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
    } catch { /* fall through */ }
  }
  if (!repo) throw new Error("no repository (run in a configured directory, or pass --repo)");
  const token = cfg.activeAccount && cfg.accounts[cfg.activeAccount] ? cfg.accounts[cfg.activeAccount].token : null;
  process.stdout.write(`watching run ${runId} (up to 6 min)...\n`);
  const rep = waitFor(token, repo, runId, 360000);
  if (!rep.found && rep.ended) throw new Error(`run ${runId} ended without publishing a report`);
  if (!rep.found) throw new Error(`run ${runId} is still not live after 6 minutes`);
  const r = parseReport(rep.text);
  const term = realUrl(r.term);
  const code = realUrl(r.code);
  process.stdout.write("\nGIECKO IS LIVE\n");
  process.stdout.write(`  terminal: ${term || r.term || "(not in this session)"}\n`);
  process.stdout.write(`  vscode  : ${code || r.code || "(not in this session)"}\n`);
  process.stdout.write(`  region  : ${r.region}   boot: ${r.boot}s\n`);
  if (term) showQr(term);
  if (code) showQr(code);
}

module.exports = { run };
