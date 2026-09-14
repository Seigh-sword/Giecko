const { parse } = require("../flags");
const { tokenFor } = require("../store");
const { haveGh, ghRaw, ghApiJson } = require("../run");

function resolveRepo(cfg, flagRepo) {
  if (flagRepo) return flagRepo;
  try {
    const fs = require("fs");
    if (fs.existsSync(".giecko.json")) {
      const repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
      if (repo) return repo;
    }
  } catch { /* fall through */ }
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  return ghRaw(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], null);
}

async function run(argv, cfg) {
  const f = parse(argv, [["repo", "str", null]]);
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const repo = resolveRepo(cfg, f.repo);
  const token = cfg.activeAccount && cfg.accounts[cfg.activeAccount] ? cfg.accounts[cfg.activeAccount].token : null;
  const args = ["run", "list", "-R", repo, "--workflow", "giecko.yml", "-L", "10"];
  process.stdout.write(ghRaw(args, token) + "\n\nsession branches (newest first):\n");
  try {
    const branches = ghApiJson(token, `repos/${repo}/branches?per_page=100`);
    const shown = branches.map((b) => b.name).filter((n) => n.startsWith("giecko-saves/") || n.startsWith("giecko-work/")).sort().reverse().slice(0, 10);
    process.stdout.write(shown.length ? shown.join("\n") + "\n" : "(none yet)\n");
  } catch (e) {
    process.stdout.write(`(could not list branches: ${e.message})\n`);
  }
}

module.exports = { run };
