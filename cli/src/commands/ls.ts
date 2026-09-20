import * as fs from "fs";
import { parse, str } from "../flags";
import { haveGh, ghRaw, ghApiJson } from "../run";
import { tokenFor, listSessions } from "../store";
import type { Config, Store } from "../store";

function resolveRepo(cfg: Config, flagRepo: string | null): string {
  if (flagRepo) return flagRepo;
  try {
    if (fs.existsSync(".giecko.json")) {
      const repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
      if (repo) return repo;
    }
  } catch {}
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  return ghRaw(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], null);
}

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [["repo", "str", null]]);
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const repo = resolveRepo(cfg, str(f.repo));
  const token = tokenFor(cfg, null);
  const args = ["run", "list", "-R", repo, "--workflow", "giecko.yml", "-L", "10"];
  process.stdout.write(ghRaw(args, token) + "\n\nsession branches (newest first):\n");
  try {
    const branches = ghApiJson(token, `repos/${repo}/branches?per_page=100`);
    const shown = branches.map((b: any) => b.name).filter((n: string) => n.startsWith("giecko-saves/") || n.startsWith("giecko-work/")).sort().reverse().slice(0, 10);
    process.stdout.write(shown.length ? shown.join("\n") + "\n" : "(none yet)\n");
  } catch (e) {
    process.stdout.write(`(could not list branches: ${e instanceof Error ? e.message : String(e)})\n`);
  }
  const sessions = listSessions();
  if (sessions.length) {
    process.stdout.write("\nlocal session records (newest first):\n");
    for (const s of sessions.slice(0, 10)) {
      process.stdout.write(`  ${s.runId}  ${s.startedAt}  ${s.repo} (${s.stack})\n`);
    }
  }
}
