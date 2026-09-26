import * as fs from "fs";
import * as path from "path";
import { ghApiJson } from "./run";

export interface TemplateFile {
  repoPath: string;
  bundle: string;
  body: string;
  source: string;
}

export function upstream(): string {
  return process.env.GIECKO_UPSTREAM || process.env.GIEKO_UPSTREAM || "Seigh-sword/Giecko";
}

export function files(): Array<{ repoPath: string; bundle: string }> {
  return [
    { repoPath: ".github/workflows/giecko.yml", bundle: "giecko.yml" },
    { repoPath: "scripts/giecko.sh", bundle: "giecko.sh" },
    { repoPath: "scripts/giecko.ps1", bundle: "giecko.ps1" },
    { repoPath: "scripts/giecko", bundle: "giecko" },
  ];
}

function bundled(name: string): string {
  return fs.readFileSync(path.join(__dirname, "..", "templates", name), "utf8");
}

function fetchRemote(token: string | null, branch: string, repoPath: string): string {
  const j = ghApiJson(token, `repos/${upstream()}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
  return Buffer.from(j.content, "base64").toString("utf8");
}

function defaultBranch(token: string | null): string {
  return ghApiJson(token, `repos/${upstream()}`).default_branch;
}

export function loadAll(token: string | null): TemplateFile[] {
  try {
    const branch = defaultBranch(token);
    return files().map((f) => ({ ...f, body: fetchRemote(token, branch, f.repoPath), source: `remote@${branch}` }));
  } catch {
    return files().map((f) => ({ ...f, body: bundled(f.bundle), source: "bundled" }));
  }
}
