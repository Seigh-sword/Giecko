const fs = require("fs");
const crypto = require("crypto");
const { parse } = require("../flags");
const { tokenFor } = require("../store");
const { haveGh, ghApiJson, openBrowser } = require("../run");
const { loadAll } = require("../templates");
const { interactive, pick: menu, askText, askSecret } = require("../ui");
const { ensureAccepted } = require("../terms");
const { sleepMs, parseReport, isMissing, waitFor, realUrl, showQr } = require("../report");

const PUT_HINT = "Token needs Contents read+write on this repo (classic PAT: the repo scope; fine-grained PAT: Contents write). Also check branch rulesets on the default branch.";
const NO_PASSWORD = "__BLANK__";

function readConfig(path) {
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function repoDefaultBranch(token, repo) {
  return ghApiJson(token, `repos/${repo}`).default_branch;
}

function unix(s) {
  return s.replace(/\r\n/g, "\n");
}

function gitHash(body) {
  return crypto.createHash("sha1").update(`blob ${Buffer.byteLength(body)}\0${body}`).digest("hex");
}

function fileSha(token, repo, branch, repoPath) {
  try {
    const j = ghApiJson(token, `repos/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
    return j.sha;
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

function gitRef(token, repo, branch) {
  let ref;
  try {
    ref = ghApiJson(token, `repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
  const c = ghApiJson(token, `repos/${repo}/git/commits/${ref.object.sha}`);
  return { sha: ref.object.sha, tree: c.tree.sha };
}

function gitBlob(token, repo, body) {
  const j = ghApiJson(token, `repos/${repo}/git/blobs`, { content: Buffer.from(body).toString("base64"), encoding: "base64" }, "POST");
  return j.sha;
}

function gitTree(token, repo, baseTree, entries) {
  const payload = { tree: entries };
  if (baseTree) payload.base_tree = baseTree;
  return ghApiJson(token, `repos/${repo}/git/trees`, payload, "POST").sha;
}

function gitCommit(token, repo, message, tree, parents) {
  return ghApiJson(token, `repos/${repo}/git/commits`, { message, tree, parents }, "POST").sha;
}

function gitUpdateRef(token, repo, branch, sha, existed) {
  if (existed) {
    ghApiJson(token, `repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha }, "PATCH");
  } else {
    ghApiJson(token, `repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha }, "POST");
  }
}

function installFiles(token, repo, branch, templates, reinstall, verbose) {
  const say = (m) => {
    if (verbose) process.stdout.write(m + "\n");
  };
  const pending = [];
  for (const t of templates) {
    const want = unix(t.body);
    process.stdout.write(`checking ${t.repoPath}...\n`);
    const sha = fileSha(token, repo, branch, t.repoPath);
    if (!sha) {
      say(`missing, will add (${want.length} chars)`);
      pending.push({ repoPath: t.repoPath, source: t.source, want, existed: false });
    } else if (sha !== gitHash(want) && reinstall) {
      pending.push({ repoPath: t.repoPath, source: t.source, want, existed: true });
    } else if (sha !== gitHash(want)) {
      process.stdout.write(`kept ${t.repoPath} (differs; use --reinstall to overwrite)\n`);
    } else {
      process.stdout.write(`kept ${t.repoPath} (current)\n`);
    }
  }
  if (!pending.length) return;
  say(`uploading ${pending.length} file(s) in one commit...`);
  try {
    const ref = gitRef(token, repo, branch);
    say(`base ref: ${ref ? ref.sha.slice(0, 7) : "(new branch)"}`);
    const entries = pending.map((p) => ({
      path: p.repoPath,
      mode: p.repoPath.endsWith(".yml") ? "100644" : "100755",
      type: "blob",
      sha: gitBlob(token, repo, p.want),
    }));
    say(`tree from ${ref ? "base " + ref.tree.slice(0, 7) : "scratch"}...`);
    const tree = gitTree(token, repo, ref ? ref.tree : null, entries);
    const commit = gitCommit(token, repo, reinstall ? "giecko: reinstall session files" : "giecko: install session files", tree, ref ? [ref.sha] : []);
    say(`commit ${commit.slice(0, 7)}, updating ref...`);
    gitUpdateRef(token, repo, branch, commit, Boolean(ref));
  } catch (e) {
    throw new Error(`could not write install commit: ${e.message}\n${PUT_HINT}`);
  }
  for (const p of pending) {
    const back = fileSha(token, repo, branch, p.repoPath);
    if (back !== gitHash(p.want)) throw new Error(`verify failed for ${p.repoPath}: uploaded but the file is not there. Retry the command.`);
    process.stdout.write(`${p.existed ? "updated" : "installed"} ${p.repoPath} (${p.source})\n`);
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
    ["cf-token", "str", null],
    ["random-url", "bool", false],
    ["yes", "bool", false],
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
  let mask = f.mask ? true : f["no-mask"] ? false : conf.mask === undefined ? false : Boolean(conf.mask);
  let duration = String(pick(f.duration, conf.duration, "180"));
  const packages = String(pick(f.packages, conf.packages, ""));
  const autosave = String(pick(f.autosave, conf.autosave, "15"));
  if (!/^\d+$/.test(duration) || Number(duration) < 1 || Number(duration) > 360) throw new Error(`bad duration "${duration}" (want 1-360)`);
  if (!/^\d+$/.test(autosave)) throw new Error(`bad autosave "${autosave}" (want 0 or more)`);
  if (os !== "ubuntu-latest" && os !== "macos-latest" && os !== "windows-latest") throw new Error(`bad os "${os}"`);
  if (!["runner", "ubuntu", "debian", "fedora", "arch", "alpine"].includes(distro)) throw new Error(`bad distro "${distro}"`);
  if ((os === "macos-latest" || os === "windows-latest") && distro !== "runner") throw new Error("docker distros need Linux (macOS and Windows force distro=runner)");
  if (!["cli", "ide"].includes(mode) && !f.stack) throw new Error(`bad mode "${mode}"`);
  const stack = f.stack || (mode === "cli" ? "terminal" : "vscode");
  if (!["terminal", "ide", "vscode"].includes(stack)) throw new Error(`bad stack "${stack}"`);

  let tunnel = f["random-url"] ? "random" : null;
  if (tunnel === null && f["cf-token"] !== null && f["cf-token"] !== undefined && f["cf-token"] !== "") tunnel = "named";
  if (tunnel === null) tunnel = pick(null, conf.tunnel, "random");
  if (tunnel !== "random" && tunnel !== "named") throw new Error(`bad tunnel "${tunnel}"`);
  let cfToken = tunnel === "named" ? (f["cf-token"] !== null && f["cf-token"] !== undefined && f["cf-token"] !== "" ? f["cf-token"] : String(conf.cfToken || "")) : "";
  if (tunnel === "named" && !cfToken) throw new Error("named tunnel needs a Cloudflare tunnel token (--cf-token, or set it in " + "g" + "iecko init)");

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

  const plan = () => ({ repo, account: accountName || "(ambient gh auth)", username, authOn, os, distro, mode, stack, mask, duration, packages, autosave, tunnel, cfToken: cfToken ? "(set)" : "" });
  const showPlan = () => {
    const p = plan();
    process.stdout.write("\nsession plan:\n");
    process.stdout.write(`  repo      ${p.repo}\n`);
    process.stdout.write(`  os        ${p.os} (${p.distro})\n`);
    process.stdout.write(`  stack     ${p.stack}\n`);
    process.stdout.write(`  url       ${p.tunnel === "named" ? "named tunnel (hostnames from your Cloudflare dashboard)" : "random trycloudflare.com name"}\n`);
    process.stdout.write(`  mask      ${p.mask ? "on (hostname hidden in logs)" : "off"}\n`);
    process.stdout.write(`  auth      ${p.authOn ? "password" : "off (open session)"}\n`);
    process.stdout.write(`  duration  ${p.duration} min\n`);
    process.stdout.write(`  autosave  ${p.autosave} min\n`);
    process.stdout.write(`  packages  ${p.packages || "(none)"}\n\n`);
  };
  showPlan();
  if (f["dry-run"]) {
    process.stdout.write("dry run. Would dispatch with:\n" + JSON.stringify({ ...plan(), password: password ? "(set)" : "(blank)" }, null, 2) + "\n");
    return;
  }
  if (interactive() && !f.yes) {
    let go = false;
    while (!go) {
      const choice = await menu("Review the plan", [
        { value: "go", label: "Launch now" },
        { value: "mask", label: `Toggle mask (now ${mask ? "on" : "off"})` },
        { value: "url", label: `URL naming (now ${tunnel === "named" ? "named tunnel" : "random"})` },
        { value: "duration", label: `Change duration (now ${duration} min)` },
        { value: "cancel", label: "Cancel" },
      ]);
      if (choice === "go") go = true;
      else if (choice === "cancel") throw new Error("cancelled");
      else if (choice === "mask") mask = !mask;
      else if (choice === "duration") {
        const v = await askText("Session length in minutes (1-360)", duration, (x) => (/^\d+$/.test(x) && Number(x) >= 1 && Number(x) <= 360 ? undefined : "enter a number 1-360"));
        if (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 360) duration = String(v);
      } else if (choice === "url") {
        if (tunnel === "random") {
          const tok = await askSecret("Cloudflare tunnel token (blank = stay random)");
          if (tok) { tunnel = "named"; cfToken = tok; }
        } else tunnel = "random";
      }
      showPlan();
    }
  }

  await ensureAccepted(cfg, store, f["accept-terms"]);

  const branch = repoDefaultBranch(token, repo);
  say(`default branch: ${branch}`);
  if (!f["skip-install"]) {
    const templates = loadAll(token);
    say(`templates source: ${templates[0].source}`);
    installFiles(token, repo, branch, templates, f.reinstall, f.verbose);
  }

  const before = latestRunId(token, repo);
  say(`latest run before dispatch: ${before || "(none)"}`);
  process.stdout.write(`dispatching ${stack} session on ${repo}...\n`);
  dispatch(token, repo, branch, {
    stack, os, distro, user: username, password: authOn ? password : NO_PASSWORD, mask: Boolean(mask),
    duration_minutes: duration, packages, autosave_minutes: autosave, cf_token: cfToken,
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
  const named = /named-tunnel/i.test(r.term || "") || /named-tunnel/i.test(r.code || "");
  const url = named ? "" : wantCode ? realUrl(r.code) : realUrl(r.term);
  const runPage = `https://github.com/${repo}/actions/runs/${runId}`;

  process.stdout.write("\nGIECKO IS LIVE\n");
  process.stdout.write(`  session : ${url || (named ? "named tunnel - open the hostname from your Cloudflare dashboard" : "(masked - scan the QR in the run logs)"}\n`);
  process.stdout.write(`  files   : branch ${r.work || "(see run page)"}\n`);
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

module.exports = { run, installFiles };
