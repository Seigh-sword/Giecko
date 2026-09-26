export type Repo = { slug: string; token: string };

export type RunInfo = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
};

export type ReportData = {
  status: string;
  stack: string;
  distro: string;
  region: string;
  boot: string;
  term: string;
  code: string;
  desk: string;
  work: string;
};

export type LaunchInput = {
  repo: Repo;
  stack: string;
  os: string;
  distro: string;
  duration: string;
  packages: string;
  autosave: string;
  restore: string;
  plugins: string;
};

const API = 'https://api.github.com';
const NO_PASSWORD = '__BLANK__';
const WORKFLOW = 'giecko.yml';

function headers(repo: Repo, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + repo.token,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (extra) Object.assign(h, extra);
  return h;
}

export function parseSlug(input: string): string {
  return input.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/+$/, '');
}

async function ghText(repo: Repo, path: string, init?: RequestInit): Promise<{ status: number; text: string }> {
  const res = await fetch(API + path, {
    ...init,
    headers: headers(repo, init && init.body ? { 'Content-Type': 'application/json' } : undefined),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function ghJson<T>(repo: Repo, path: string, init?: RequestInit): Promise<T> {
  const r = await ghText(repo, path, init);
  if (r.status >= 200 && r.status < 300) {
    if (!r.text) return {} as T;
    return JSON.parse(r.text) as T;
  }
  throw new Error('github ' + r.status + ': ' + r.text.slice(0, 200));
}

export async function validateToken(token: string): Promise<string> {
  const res = await fetch(API + '/user', {
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('token rejected (' + res.status + ')');
  const j = (await res.json()) as { login: string };
  return j.login;
}

export async function listRepos(token: string): Promise<{ full_name: string; default_branch: string }[]> {
  const res = await fetch(API + '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator', {
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('repo list failed (' + res.status + ')');
  return (await res.json()) as { full_name: string; default_branch: string }[];
}

export async function getRepo(repo: Repo): Promise<{ default_branch: string; private: boolean; full_name: string }> {
  return ghJson(repo, '/repos/' + parseSlug(repo.slug));
}

export type ContentFile = { content: string; sha: string };

export async function getContents(repo: Repo, path: string, ref?: string): Promise<ContentFile | null> {
  try {
    const j = await ghJson<{ content?: string; sha?: string; encoding?: string }>(
      repo,
      '/repos/' + parseSlug(repo.slug) + '/contents/' + path + (ref ? '?ref=' + encodeURIComponent(ref) : ''),
    );
    if (!j.content || j.sha === undefined) return null;
    const b64 = j.content.replace(/\s/g, '');
    if (j.encoding === 'base64' || /^[A-Za-z0-9+/=\s]+$/.test(b64)) {
      return { content: b64Decode(b64), sha: j.sha };
    }
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/github 40[04]/.test(msg)) return null;
    throw e;
  }
}

export async function putContents(
  repo: Repo,
  path: string,
  content: string,
  message: string,
  branch?: string,
  sha?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: b64Encode(content),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;
  await ghJson(repo, '/repos/' + parseSlug(repo.slug) + '/contents/' + path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function dispatchSession(input: LaunchInput): Promise<string> {
  const slug = parseSlug(input.repo.slug);
  const body = JSON.stringify({
    ref: 'main',
    inputs: {
      stack: input.stack,
      os: input.os,
      distro: input.distro,
      password: NO_PASSWORD,
      duration_minutes: input.duration,
      packages: input.packages,
      autosave_minutes: input.autosave,
      restore: input.restore,
      plugins: input.plugins,
    },
  });
  const res = await fetch(API + '/repos/' + slug + '/actions/workflows/' + WORKFLOW + '/dispatches', {
    method: 'POST',
    headers: headers(input.repo, { 'Content-Type': 'application/json' }),
    body,
  });
  if (res.status === 204) return 'session dispatched';
  const text = await res.text();
  throw new Error('dispatch failed (' + res.status + '): ' + text.slice(0, 200));
}

export async function listRuns(repo: Repo, perPage = 20): Promise<RunInfo[]> {
  const j = await ghJson<{ workflow_runs: RunInfo[] }>(
    repo,
    '/repos/' + parseSlug(repo.slug) + '/actions/workflows/' + WORKFLOW + '/runs?per_page=' + perPage,
  );
  return j.workflow_runs || [];
}

export async function getRun(repo: Repo, runId: string): Promise<RunInfo> {
  return ghJson(repo, '/repos/' + parseSlug(repo.slug) + '/actions/runs/' + runId);
}

export async function cancelRun(repo: Repo, runId: string): Promise<void> {
  const r = await ghText(repo, '/repos/' + parseSlug(repo.slug) + '/actions/runs/' + runId + '/cancel', {
    method: 'POST',
  });
  if (r.status !== 202 && r.status !== 409) {
    throw new Error('cancel failed (' + r.status + '): ' + r.text.slice(0, 120));
  }
}

export async function runLogText(repo: Repo, runId: string): Promise<string> {
  type Job = { id: number; status: string; name: string };
  const j = await ghJson<{ jobs: Job[] }>(
    repo,
    '/repos/' + parseSlug(repo.slug) + '/actions/runs/' + runId + '/jobs?per_page=20',
  );
  const parts: string[] = [];
  for (const job of j.jobs || []) {
    const res = await fetch(API + '/repos/' + parseSlug(repo.slug) + '/actions/jobs/' + job.id + '/logs', {
      headers: { Authorization: 'Bearer ' + repo.token },
    });
    if (!res.ok) continue;
    parts.push('== ' + job.name + ' ==\n' + (await res.text()));
  }
  return parts.join('\n');
}

export async function listBranches(repo: Repo): Promise<string[]> {
  const j = await ghJson<{ name: string }[]>(repo, '/repos/' + parseSlug(repo.slug) + '/branches?per_page=100');
  return (j || []).map((b) => b.name);
}

export async function latestRelease(repo: Repo): Promise<{ tag_name: string; html_url: string; body: string }> {
  return ghJson(repo, '/repos/' + parseSlug(repo.slug) + '/releases/latest');
}

export async function rawFile(repo: Repo, path: string, ref: string): Promise<string> {
  const res = await fetch(
    'https://raw.githubusercontent.com/' + parseSlug(repo.slug) + '/' + encodeURIComponent(ref) + '/' + path,
  );
  if (!res.ok) throw new Error('raw fetch failed (' + res.status + ')');
  return res.text();
}

export function parseReport(text: string): ReportData {
  const field = (key: string): string => {
    const line = text.split('\n').find((l) => l.startsWith('- ' + key + ':'));
    return line ? line.slice(key.length + 4).trim() : '';
  };
  return {
    status: field('status'),
    stack: field('stack'),
    distro: field('distro'),
    region: field('region'),
    boot: field('boot_seconds'),
    term: field('url_terminal'),
    code: field('url_code'),
    desk: field('url_desktop'),
    work: field('work_branch'),
  };
}

export type WaitResult = { found: boolean; ended: boolean; text: string };

export async function pollReportOnce(repo: Repo, runId: string): Promise<WaitResult> {
  try {
    const f = await getContents(repo, 'reports/run-' + runId + '.md', 'giecko-reports');
    if (f) return { found: true, ended: false, text: f.content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/github 40[04]/.test(msg)) throw e;
  }
  let status = '';
  try {
    status = (await getRun(repo, runId)).status;
  } catch {
    status = 'gone';
  }
  if (status === 'completed' || status === 'gone') return { found: false, ended: true, text: '' };
  return { found: false, ended: false, text: '' };
}

export function realUrl(value: string): string {
  return value && value.startsWith('https://') && !value.includes('*') ? value : '';
}

export function b64Encode(s: string): string {
  const bytes = utf8Array(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += table[b0 >> 2] + table[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? table[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? table[b2 & 63] : '=';
  }
  return out;
}

export function utf8Array(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let cp = s.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < s.length) {
      const lo = s.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
        i++;
      }
    }
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

export function b64Decode(b64: string): string {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = table.indexOf(ch);
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
    else if (b < 0xf0)
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
    else {
      const cp =
        ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      const off = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff));
    }
  }
  return out;
}
