import * as fs from "fs";
import { parse, str } from "../flags";
import { haveGh, ghRaw, ghApiJson } from "../run";
import { tokenFor } from "../store";
import type { Config, Store } from "../store";

function resolveRepo(cfg: Config, flagRepo: string | null): string {
  if (flagRepo) return flagRepo;
  try {
    if (fs.existsSync(".giecko.json")) {
      const repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
      if (repo) return repo;
    }
  } catch {}
  return ghRaw(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], null);
}

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [["repo", "str", null]]);
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const repo = resolveRepo(cfg, str(f.repo));
  const token = tokenFor(cfg, null);
  let runId = f._[0];
  if (!runId) {
    const j = ghApiJson(token, `repos/${repo}/actions/workflows/giecko.yml/runs?per_page=5`);
    const active = (j.workflow_runs || []).find((x: any) => x.status !== "completed");
    if (!active) throw new Error("no in-progress run found. Pass a run id: giecko cancel <run-id>");
    runId = String(active.id);
  }
  ghApiJson(token, `repos/${repo}/actions/runs/${runId}/cancel`, {}, "POST");
  process.stdout.write(`cancel requested for run ${runId} (${repo})\n`);
}
