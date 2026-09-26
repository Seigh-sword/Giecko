import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface Account {
  token: string;
}

export interface Config {
  accounts: Record<string, Account>;
  activeAccount: string | null;
  passwords: Record<string, string>;
  termsAccepted: string | null;
  autoUpdateCheck?: boolean;
}

export interface SessionRecord {
  version: number;
  runId: string;
  repo: string;
  stack: string;
  os: string;
  distro: string;
  region: string;
  boot: string;
  url: string;
  workBranch: string;
  startedAt: string;
  configPath: string;
}

export interface Store {
  load(): Config;
  save(cfg: Config): void;
  tokenFor(cfg: Config, name?: string | null): string | null;
  configPath(): string;
  sessionsDir(): string;
  sessionDir(runId: string): string;
  saveSession(rec: SessionRecord, configSource?: string | null): void;
  listSessions(): SessionEntry[];
}

export function configDir(): string {
  if (process.env.GIECKO_CONFIG_DIR) return process.env.GIECKO_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "giecko");
  return path.join(os.homedir(), ".config", "giecko");
}

export function configPath(): string {
  return path.join(configDir(), "config.json");
}

export function sessionsDir(): string {
  return path.join(configDir(), "sessions");
}

export function sessionDir(runId: string): string {
  return path.join(sessionsDir(), String(runId));
}

function blank(): Config {
  return { accounts: {}, activeAccount: null, passwords: {}, termsAccepted: null };
}

export function load(): Config {
  let data: any;
  try {
    data = JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return blank();
  }
  if (!data || typeof data !== "object") return blank();
  if (!data.accounts || typeof data.accounts !== "object") data.accounts = {};
  if (!data.passwords || typeof data.passwords !== "object") data.passwords = {};
  return data as Config;
}

export function save(data: Config): void {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}

export function tokenFor(cfg: Config, name?: string | null): string | null {
  if (!name) {
    if (cfg.activeAccount && cfg.accounts[cfg.activeAccount]) return cfg.accounts[cfg.activeAccount].token;
    return null;
  }
  if (!cfg.accounts[name]) throw new Error(`no account named "${name}" (see: giecko auth list)`);
  return cfg.accounts[name].token;
}

export function saveSession(rec: SessionRecord, configSource?: string | null): void {
  const dir = sessionDir(rec.runId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "session.json"), JSON.stringify(rec, null, 2) + "\n");
  if (configSource && fs.existsSync(configSource)) {
    try {
      fs.copyFileSync(configSource, path.join(dir, "giecko.json"));
    } catch {}
  }
}

export interface SessionEntry extends SessionRecord {
  dir: string;
}

export function listSessions(): SessionEntry[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(sessionsDir()).filter((n) => /^\d+$/.test(n)).sort().reverse();
  } catch {
    return [];
  }
  const out: SessionEntry[] = [];
  for (const n of names) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(sessionsDir(), n, "session.json"), "utf8"));
      if (j && j.runId) out.push({ ...j, dir: path.join(sessionsDir(), n) });
    } catch {}
  }
  return out;
}
