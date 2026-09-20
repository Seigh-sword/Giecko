import { ghApiJson } from "./run";
import * as qrcodeTerminal from "qrcode-terminal";

export interface ReportData {
  status: string;
  stack: string;
  distro: string;
  region: string;
  boot: string;
  term: string;
  code: string;
  desk: string;
  work: string;
}

export interface WaitResult {
  found: boolean;
  ended: boolean;
  text: string;
}

export function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function field(text: string, key: string): string {
  const line = text.split("\n").find((l) => l.startsWith(`- ${key}:`));
  return line ? line.slice(key.length + 4).trim() : "";
}

export function parseReport(text: string): ReportData {
  return {
    status: field(text, "status"),
    stack: field(text, "stack"),
    distro: field(text, "distro"),
    region: field(text, "region"),
    boot: field(text, "boot_seconds"),
    term: field(text, "url_terminal"),
    code: field(text, "url_code"),
    desk: field(text, "url_desktop"),
    work: field(text, "work_branch"),
  };
}

export function isMissing(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e || "");
  return /404|not found/i.test(msg);
}

function runStatus(token: string | null, repo: string, runId: string): string {
  try {
    return ghApiJson(token, `repos/${repo}/actions/runs/${runId}`).status;
  } catch (e) {
    return isMissing(e) ? "gone" : "";
  }
}

export function waitFor(token: string | null, repo: string, runId: string, timeoutMs: number, verbose?: boolean): WaitResult {
  const started = Date.now();
  let tick = 0;
  while (Date.now() - started < timeoutMs) {
    try {
      const j = ghApiJson(token, `repos/${repo}/contents/reports/run-${runId}.md?ref=giecko-reports`);
      return { found: true, ended: false, text: Buffer.from(j.content, "base64").toString("utf8") };
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
    const st = runStatus(token, repo, runId);
    if (st === "completed" || st === "gone") return { found: false, ended: true, text: "" };
    tick++;
    if (verbose) process.stdout.write(`report poll ${tick}: not yet (run ${st || "unknown"})\n`);
    sleepMs(10000);
  }
  return { found: false, ended: false, text: "" };
}

export function realUrl(value: string): string {
  return value && value.startsWith("https://") && !value.includes("*") ? value : "";
}

export function showQr(url: string): void {
  try {
    qrcodeTerminal.generate(url, { small: true });
  } catch {
    process.stdout.write("(install dependencies to render the QR code)\n");
  }
}
