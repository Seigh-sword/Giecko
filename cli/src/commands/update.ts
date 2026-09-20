import * as fs from "fs";
import { spawnSync } from "child_process";
import { parse, str, bool } from "../flags";
import { tokenFor } from "../store";
import type { Config, Store } from "../store";
import { haveGh, ghApiJson } from "../run";
import { loadAll } from "../templates";
import { installFiles } from "./launch";

function readConfig(p: string): any {
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function npmLatest(): string {
  const r = spawnSync("npm", ["view", "giecko", "version"], { encoding: "utf8", timeout: 15000 });
  const last = String(r.stdout || "").trim().split("\n").pop() || "";
  return r.status === 0 ? last.trim() : "";
}

function newer(a: string, b: string): boolean {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) === (pb[i] || 0)) continue;
    return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [["config", "str", ".giecko.json"], ["repo", "str", null], ["account", "str", null], ["self", "bool", false], ["on", "bool", false], ["off", "bool", false]]);
  if (bool(f.on) || bool(f.off)) {
    cfg.autoUpdateCheck = bool(f.on);
    store.save(cfg);
    process.stdout.write("auto update check: " + (cfg.autoUpdateCheck ? "on" : "off") + "\n");
    return;
  }
  const pkg = require("../../package.json") as { version: string };
  const latest = npmLatest();
  if (!latest) process.stdout.write("CLI " + pkg.version + " (could not reach the npm registry)\n");
  else if (newer(latest, pkg.version)) process.stdout.write("CLI update available: " + pkg.version + " -> " + latest + "\n");
  else process.stdout.write("CLI " + pkg.version + " is current\n");
  if (bool(f.self)) {
    process.stdout.write("installing the latest CLI...\n");
    const r = spawnSync("npm", ["install", "-g", "giecko@latest"], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("npm install -g failed");
    return;
  } else if (latest && newer(latest, pkg.version)) {
    process.stdout.write("install it with: npm install -g giecko@latest (or: giecko update --self)\n");
  }
  const conf = readConfig(str(f.config) || ".giecko.json");
  const repo = str(f.repo) || conf.repo;
  if (!repo) {
    process.stdout.write("no repository configured; skipped session files\n");
    return;
  }
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const accountName = (str(f.account) || conf.account || null) as string | null;
  const token = tokenFor(cfg, accountName);
  const branch = ghApiJson(token, "repos/" + repo).default_branch;
  const templates = loadAll(token);
  process.stdout.write("updating session files in " + repo + " (branch " + branch + ")...\n");
  installFiles(token, repo, branch, templates, true, true);
  process.stdout.write("session files updated\n");
}
