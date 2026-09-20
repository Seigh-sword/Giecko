import * as fs from "fs";
import { parse, str } from "../flags";
import { parseReport, waitFor, realUrl, showQr } from "../report";
import { tokenFor } from "../store";
import type { Config, Store } from "../store";

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [["repo", "str", null]]);
  const runId = f._[0];
  if (!runId) throw new Error("usage: giecko watch <run-id> [--repo owner/name]");
  let repo = str(f.repo);
  if (!repo) {
    try {
      if (fs.existsSync(".giecko.json")) repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
    } catch {}
  }
  if (!repo) throw new Error("no repository (run in a configured directory, or pass --repo)");
  const token = tokenFor(cfg, null);
  process.stdout.write(`watching run ${runId} (up to 6 min)...\n`);
  const rep = waitFor(token, repo, runId, 360000);
  if (!rep.found && rep.ended) throw new Error(`run ${runId} ended without publishing a report`);
  if (!rep.found) throw new Error(`run ${runId} is still not live after 6 minutes`);
  const r = parseReport(rep.text);
  const term = realUrl(r.term);
  const code = realUrl(r.code);
  const desk = realUrl(r.desk);
  process.stdout.write("\nGIECKO IS LIVE\n");
  process.stdout.write(`  terminal: ${term || r.term || "(not in this session)"}\n`);
  process.stdout.write(`  vscode  : ${code || r.code || "(not in this session)"}\n`);
  process.stdout.write(`  desktop : ${desk || r.desk || "(not in this session)"}\n`);
  process.stdout.write(`  region  : ${r.region}   boot: ${r.boot}s\n`);
  if (term) showQr(term);
  if (code) showQr(code);
  if (desk) showQr(desk);
}
