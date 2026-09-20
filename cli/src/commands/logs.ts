import * as fs from "fs";
import { parse, str } from "../flags";
import { haveGh, ghRaw } from "../run";
import { tokenFor } from "../store";
import type { Config, Store } from "../store";

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [["repo", "str", null], ["tail", "str", "60"]]);
  const runId = f._[0];
  if (!runId) throw new Error("usage: giecko logs <run-id> [--repo owner/name] [--tail N]");
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  let repo = str(f.repo);
  if (!repo) {
    try {
      if (fs.existsSync(".giecko.json")) repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
    } catch {}
  }
  if (!repo) throw new Error("no repository (run in a configured directory, or pass --repo)");
  const token = tokenFor(cfg, null);
  const tailNum = Math.max(1, Number(str(f.tail)) || 60);
  const out = ghRaw(["run", "view", runId, "--log", "-R", repo], token);
  const lines = out.split("\n");
  process.stdout.write(lines.slice(-tailNum).join("\n") + "\n");
}
