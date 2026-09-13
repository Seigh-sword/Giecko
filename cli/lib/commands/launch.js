const fs = require("fs");
const { parse } = require("../flags");
const { tokenFor } = require("../store");
const { haveGh, ghApiJson, ghPutJson, openBrowser } = require("../run");
const { loadAll } = require("../templates");
const { ensureAccepted } = require("../terms");
const { sleepMs, parseReport, isMissing, waitFor, realUrl, showQr } = require("../report");

const PUT_HINT = "Token needs Contents read+write on this repo (classic PAT: the repo scope; fine-grained PAT: Contents write). Also check branch rulesets on the default branch.";

function readConfig(path) {
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function repoDefaultBranch(token, repo) {
  return ghApiJson(token, `repos/${repo}`).default_branch;
}

function branchExists(token, repo, branch) {
  try {
    ghApiJson(token, `repos/${repo}/branches/${encodeURIComponent(branch)}`);
    return true;
  } catch (e) {
    if (isMissing(e)) return false;
    throw e;
  }
}

function fileSha(token, repo, branch, repoPath) {
  try {
    const j = ghApiJson(token, `repos/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
    return { sha: j.sha, body: Buffer.from(j.content, "base64").toString("utf8") };
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

function putFile(token, repo, branch, useBranch, repoPath, body, sha) {
  const payload = {
    message: `${sha ? "giecko: update" : "giecko: install"} ${repoPath}`,
    content: Buffer.from(body).toString("base64"),
  };
  if (sha) payload.sha = sha;
  if (useBranch) payload.branch = branch;
  try {
    ghPutJson(token, `repos/${repo}/contents/${repoPath}`, payload);
  } catch (e) {
    throw new Error(`could not write ${repoPath}: ${e.message}\n${PUT_HINT}`);
  }
}

function latestRunId(token, repo) {
  try {
    const j = ghApiJson(token, `repos/${repo}/actions/workflows/giecko.yml/runs?per_page=1`);
    return j.workflow_runs && j.workflow_runs[0] ? String(j.workflow_runs[0].id) : "";
  } catch {
    return "";
  }
}

function dispatch(token, repo, branch, inputs) {
  try {
    ghApiJson(token, `repos/${repo}/actions/workflows/giecko.yml/dispatches`, { ref: branch, inputs }, "POST");
  } catch (e) {
    if (/403|forbidden|resource not accessible/i.test(e.message)) {
      throw new Error("dispatch forbidden (HTTP 403). The token needs the workflow scope.");
    }
    throw e;
  }
}

async function run(argv, cfg, store) {
  const f = parse(argv, [
    ["config", "str", ".giecko.json"],
    ["account", "str", null],
    ["repo", "str", null],
    ["username", "str", null],
    ["auth", "bool", false],
    ["no-auth", "bool", false],
    ["password", "str", null],
    ["os", "str", null],
    ["distro", "str", null],
    ["mode", "str", null],
    ["stack", "str", null],
    ["mask", "bool", false],
    ["no-mask", "bool", false],
    ["duration", "str", null],
    ["packages", "str", null],
    ["autosave", "str", null],
    ["reinstall", "bool", false],
    ["skip-install", "bool", false],
    ["open", "bool", false],
    ["no-open", "bool", false],
    ["accept-terms", "bool", false],
    ["dry-run", "bool", false],
    ["verbose", "bool", false],
  ]);
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  const say = (m) => {
    if (f.verbose) process.stdout.write(m + "\n");
  };

  const conf = readConfig(f.config);
  const pick = (flagVal, confVal, def) => (flagVal === null || flagVal === undefined ? (confVal === undefined ? def : confVal) : flagVal);

  const repo = pick(f.repo, conf.repo, "");
  if (!repo) throw new Error("no repository (giecko init, or --repo owner/name)");
  const accountName = f.account !== null && f.account !== undefined ? f.account : conf.account || null;
  const token = accountName ? tokenFor(cfg, accountName) : cfg.activeAccount && cfg.accounts[cfg.activeAccount] ? cfg.accounts[cfg.activeAccount].token : null;

  const username = pick(f.username, conf.username, "giecko");
  const authOn = f.auth ? true : f["no-auth"] ? false : conf.authEnabled === undefined ? false : Boolean(conf.authEnabled);
  const os = pick(f.os, conf.os, "ubuntu-latest");
  const distro = pick(f.distro, conf.distro, "runner");
  const mode = pick(f.mode, conf.mode, "ide");
  const mask = f.mask ? true : f["no-mask"] ? false : conf.mask === undefined ? false : Boolean(conf.mask);
  const duration = String(pick(f.duration, conf.duration, "180"));
  const packages = String(pick(f.packages, conf.packages, ""));
  const autosave = String(pick(f.autosave, conf.autosave, "15"));
  if (os !== "ubuntu-latest" && os !== "macos-latest") throw new Error(`bad os "${os}"`);
  if (!["runner", "ubuntu", "debian", "fedora", "arch", "alpine"].includes(distro)) throw new Error(`bad distro "${distro}"`);
  if (os === "macos-latest" && distro !== "runner") throw new Error("docker distros need Linux; macOS forces distro=runner");
  if (!["cli", "ide"].includes(mode) && !f.stack) throw new Error(`bad mode "${mode}"`);
  const stack = f.stack || (mode === "cli" ? "terminal" : "vscode");
  if (!["terminal", "ide", "vscode"].includes(stack)) throw new Error(`bad stack "${stack}"`);

  let password;
  if (f.password !== null && f.password !== undefined) {
    password = f.password;
  } else if (authOn && cfg.passwords[repo]) {
    password = cfg.passwords[repo];
  } else if (authOn) {
    throw new Error(`no password stored for ${repo} (pass --password, or re-run giecko init)`);
  } else {
    password = "";
  }

  const plan = { repo, account: accountName || "(ambient gh auth)", username, authOn, os, distro, mode, stack, mask, duration, packages, autosave };
  if (f["dry-run"]) {
    process.stdout.write("dry run. Would dispatch with:\n" + JSON.stringify({ ...plan, password: password ? "(set)" : "(blank)" }, null, 2) + "\n");
    return;
  }

  await ensureAccepted(cfg, store, f["accept-terms"]);

  const branch = repoDefaultBranch(token, repo);
  say(`default branch: ${branch}`);
  const branchLive = branchExists(token, repo, branch);
  say(`branch exists (has commits): ${branchLive}`);
  if (!f["skip-install"]) {
    const templates = loadAll(token);
    say(`templates source: ${templates[0].source}`);
    for (const t of templates) {
      process.stdout.write(`checking ${t.repoPath}...\n`);
      const cur = fileSha(token, repo, branch, t.repoPath);
      if (!cur) {
        say(`missing, uploading (${t.body.length} chars)`);
        putFile(token, repo, branch, branchLive, t.repoPath, t.body, null);
        process.stdout.write(`installed ${t.repoPath} (${t.source})\n`);
      } else if (cur.body !== t.body && f.reinstall) {
        putFile(token, repo, branch, true, t.repoPath, t.body, cur.sha);
        process.stdout.write(`updated ${t.repoPath}\n`);
      } else if (cur.body !== t.body) {
        process.stdout.write(`kept ${t.repoPath} (differs; use --reinstall to overwrite)\n`);
      } else {
        process.stdout.write(`kept ${t.repoPath} (current)\n`);
      }
    }
  }

  const before = latestRunId(token, repo);
  say(`latest run before dispatch: ${before || "(none)"}`);
  process.stdout.write(`dispatching ${stack} session on ${repo}...\n`);
  dispatch(token, repo, branch, {
    stack, os, distro, user: username, password, mask: String(mask),
    duration_minutes: duration, packages, autosave_minutes: autosave,
  });

  let runId = "";
  for (let i = 0; i < 12; i++) {
    sleepMs(5000);
    runId = latestRunId(token, repo);
    say(`run poll ${i + 1}: ${runId || "(none yet)"}`);
    if (runId && runId !== before) break;
  }
  if (!runId || runId === before) throw new Error("dispatched, but the new run is not visible yet. Check the Actions tab.");
  process.stdout.write(`run id: ${runId}\n`);

  const rep = waitFor(token, repo, runId, 360000, f.verbose);
  if (!rep.found && rep.ended) throw new Error(`run ${runId} ended without publishing a report. Check the Actions tab for failures.`);
  if (!rep.found) throw new Error(`run ${runId} is still not live after 6 minutes. Check the Actions tab.`);
  const r = parseReport(rep.text);
  const wantCode = stack !== "terminal";
  const url = wantCode ? realUrl(r.code) : realUrl(r.term);
  const runPage = `https://github.com/${repo}/actions/runs/${runId}`;

  process.stdout.write("\nGIECKO IS LIVE\n");
  process.stdout.write(`  session : ${url || "(masked - scan the QR in the run logs)"}\n`);
  process.stdout.write(`  region  : ${r.region}   boot: ${r.boot}s   password: ${password || "(none - open session)"}\n`);
  process.stdout.write(`  run page: ${runPage}\n`);
  if (url) showQr(url);

  const shouldOpen = f.open ? true : f["no-open"] ? false : true;
  if (shouldOpen) {
    const target = url || runPage;
    process.stdout.write(`opening ${target}\n`);
    if (!openBrowser(target)) process.stdout.write("could not open a browser; use the link above\n");
  }
}

module.exports = { run };
