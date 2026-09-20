import { spawnSync } from "child_process";

export interface ShResult {
  ok: boolean;
  code: number | null;
  out: string;
  err: string;
}

export function sh(cmd: string, args: string[], extraEnv?: Record<string, string> | null, input?: string): ShResult {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const r = spawnSync(cmd, args, { encoding: "utf8", env, input });
  return { ok: r.status === 0, code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

export function tokenEnv(token: string | null): Record<string, string> | null {
  return token ? { GH_TOKEN: token } : null;
}

export function haveGh(): boolean {
  return sh("gh", ["--version"]).ok;
}

export function ghAuthOk(token: string): boolean {
  return sh("gh", ["auth", "status"], tokenEnv(token)).ok;
}

export function ghRaw(args: string[], token: string | null): string {
  const r = sh("gh", args, tokenEnv(token));
  if (!r.ok) throw new Error(`gh ${args[0]} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out;
}

export function ghApi(token: string | null, endpoint: string, fields?: Record<string, unknown>, method?: string): string {
  const args = ["api", endpoint];
  if (method) args.push("-X", method);
  const input = fields ? JSON.stringify(fields) : undefined;
  if (input) args.push("--input", "-");
  const r = sh("gh", args, tokenEnv(token), input);
  if (!r.ok) throw new Error(`GitHub API ${method || "GET"} ${endpoint} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out;
}

export function ghApiJson(token: string | null, endpoint: string, fields?: Record<string, unknown>, method?: string): any {
  const out = ghApi(token, endpoint, fields, method);
  return out ? JSON.parse(out) : null;
}

export function ghPutJson(token: string | null, endpoint: string, obj: Record<string, unknown>): any {
  const payload = JSON.stringify(obj);
  const r = sh("gh", ["api", endpoint, "-X", "PUT", "--input", "-"], tokenEnv(token), payload);
  if (!r.ok) throw new Error(`GitHub API PUT ${endpoint} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out ? JSON.parse(r.out) : null;
}

export function openBrowser(url: string): boolean {
  const plat = process.platform;
  if (plat === "darwin") return sh("open", [url]).ok;
  if (plat === "win32") return sh("cmd", ["/c", "start", "", url]).ok;
  return sh("xdg-open", [url]).ok;
}
