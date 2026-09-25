export type Repo = { slug: string; token: string };

export type RunInfo = {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  name: string;
};

export type LaunchInput = {
  repo: Repo;
  os: string;
  stack: string;
  password: string;
  duration: string;
};

const API = 'https://api.github.com';

function headers(repo: Repo): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + repo.token,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

export function parseSlug(input: string): string {
  const t = input.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/+$/, '');
  return t;
}

export async function dispatchSession(input: LaunchInput): Promise<string> {
  const slug = parseSlug(input.repo.slug);
  const body = JSON.stringify({
    ref: 'arena/01a09a7b-giecko',
    inputs: {
      os: input.os,
      stack: input.stack,
      password: input.password,
      duration_minutes: input.duration,
    },
  });
  const res = await fetch(API + '/repos/' + slug + '/actions/workflows/giecko.yml/dispatches', {
    method: 'POST',
    headers: headers(input.repo),
    body,
  });
  if (res.status === 204) {
    return 'session dispatched';
  }
  const text = await res.text();
  throw new Error('dispatch failed (' + res.status + '): ' + text.slice(0, 200));
}

export async function listRuns(repo: Repo): Promise<RunInfo[]> {
  const slug = parseSlug(repo.slug);
  const res = await fetch(API + '/repos/' + slug + '/actions/runs?per_page=15', {
    headers: headers(repo),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('runs failed (' + res.status + '): ' + text.slice(0, 200));
  }
  const data = (await res.json()) as { workflow_runs: RunInfo[] };
  return data.workflow_runs;
}
