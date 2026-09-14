const fs = require("fs");
const crypto = require("crypto");
const { parse } = require("../flags");
const { interactive, pick, askText, askSecret, askConfirm, outro } = require("../ui");
const { tokenFor } = require("../store");
const { ghApiJson } = require("../run");
const { ensureAccepted } = require("../terms");

const DISTROS = ["runner", "ubuntu", "debian", "fedora", "arch", "alpine"];

function genPassword() {
  return crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
}

function validRepo(v) {
  return /^[^/\s]+\/[^/\s]+$/.test(v || "");
}

function validDuration(v) {
  return /^\d+$/.test(v || "") && Number(v) >= 1 && Number(v) <= 360;
}

function validAutosave(v) {
  return /^\d+$/.test(v || "");
}

function listRepos(token) {
  const j = ghApiJson(token, "user/repos?per_page=100&sort=updated");
  return j.map((r) => r.full_name);
}

function myLogin(token) {
  return ghApiJson(token, "user").login;
}

function createRepo(token, owner, name, priv) {
  if (!owner) {
    const j = ghApiJson(token, "user/repos", { name, private: Boolean(priv) }, "POST");
    return j.full_name;
  }
  const j = ghApiJson(token, `orgs/${owner}/repos`, { name, private: Boolean(priv) }, "POST");
  return j.full_name;
}

async function run(argv, cfg, store) {
  const f = parse(argv, [
    ["account", "str", null],
    ["repo", "str", null],
    ["create", "str", null],
    ["org", "str", null],
    ["private", "bool", false],
    ["public", "bool", false],
    ["username", "str", null],
    ["auth", "bool", false],
    ["no-auth", "bool", false],
    ["password", "str", null],
    ["os", "str", null],
    ["distro", "str", null],
    ["mode", "str", null],
    ["mask", "bool", false],
    ["no-mask", "bool", false],
    ["duration", "str", null],
    ["packages", "str", null],
    ["autosave", "str", null],
    ["accept-terms", "bool", false],
    ["force", "bool", false],
  ]);

  await ensureAccepted(cfg, store, f["accept-terms"]);

  const accountNames = Object.keys(cfg.accounts);
  let account = f.account;
  if (!account && interactive()) {
    account = await pick("Which account", [
      ...accountNames.map((n) => ({ value: n, label: n + (n === cfg.activeAccount ? " (active)" : "") })),
      { value: "", label: "None (use ambient gh auth)" },
    ]);
  }
  if (account === undefined || account === null) account = cfg.activeAccount || "";
  if (account === "none") account = "";
  const token = account ? tokenFor(cfg, account) : null;

  let repo = f.repo;
  if (f.create) {
    if (!token) throw new Error("--create needs an account with a token");
    const priv = f.private ? true : f.public ? false : false;
    repo = createRepo(token, f.org || "", f.create, priv);
    process.stdout.write(`created repository: ${repo} (${priv ? "private" : "public"})\n`);
  }
  if (!repo && interactive()) {
    let options = [];
    if (token) {
      try {
        options = listRepos(token).slice(0, 30).map((n) => ({ value: n, label: n }));
      } catch {
        options = [];
      }
    }
    options.push({ value: "@type", label: "Type owner/name manually" });
    options.push({ value: "@create", label: "Create a new repository" });
    const choice = await pick("Which repository runs the sessions", options);
    if (choice === "@type") {
      repo = await askText("Repository (owner/name)", "");
    } else if (choice === "@create") {
      if (!token) throw new Error("creating a repository needs an account with a token");
      const name = await askText("New repository name", "");
      const owner = await askText("Owner: your user (blank) or an org", "");
      const vis = await pick("Visibility", [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ]);
      repo = createRepo(token, (owner || "").trim(), (name || "").trim(), vis === "private");
      process.stdout.write(`created repository: ${repo}\n`);
    } else {
      repo = choice;
    }
  }
  if (!repo) throw new Error("no repository; pass --repo owner/name or --create NAME");
  if (!validRepo(repo)) throw new Error(`bad repository "${repo}" (want owner/name)`);

  let username = f.username;
  if (!username && interactive()) username = await askText("Session username", "giecko");
  username = (username || "giecko").trim() || "giecko";

  let authOn = f.auth ? true : f["no-auth"] ? false : null;
  if (authOn === null && interactive()) authOn = await askConfirm("Protect the session with a password", false);
  if (authOn === null) authOn = false;

  let password = f.password;
  if (authOn && (password === null || password === undefined) && interactive()) {
    password = await askSecret("Session password (empty = generate one)");
  }
  if (authOn && !password) {
    password = genPassword();
    process.stdout.write(`generated password (saved with this config): ${password}\n`);
  }
  if (authOn) {
    cfg.passwords[repo] = password;
    store.save(cfg);
  }

  let os = f.os;
  if (!os && interactive()) {
    os = await pick("Runner OS", [
      { value: "ubuntu-latest", label: "Ubuntu (recommended)" },
      { value: "macos-latest", label: "macOS (experimental)" },
      { value: "windows-latest", label: "Windows (beta)" },
    ]);
  }
  os = os || "ubuntu-latest";
  if (os !== "ubuntu-latest" && os !== "macos-latest" && os !== "windows-latest") throw new Error(`bad --os "${os}"`);

  let distro = f.distro;
  if (os === "macos-latest" || os === "windows-latest") {
    if (distro && distro !== "runner") throw new Error("docker distros need Linux (macOS and Windows force distro=runner)");
    distro = "runner";
  } else if (!distro && interactive()) {
    distro = await pick("Shell environment", [
      { value: "runner", label: "Runner OS directly (fastest)" },
      { value: "ubuntu", label: "Ubuntu 24.04 container" },
      { value: "debian", label: "Debian 12 container" },
      { value: "fedora", label: "Fedora 42 container" },
      { value: "arch", label: "Arch container" },
      { value: "alpine", label: "Alpine container" },
    ]);
  }
  distro = distro || "runner";
  if (!DISTROS.includes(distro)) throw new Error(`bad --distro "${distro}"`);

  let mode = f.mode;
  if (!mode && interactive()) {
    mode = await pick("Session mode (one link per session)", [
      { value: "ide", label: "IDE (VS Code in the browser)" },
      { value: "cli", label: "CLI (terminal in the browser)" },
    ]);
  }
  mode = mode || "ide";
  if (mode !== "cli" && mode !== "ide") throw new Error(`bad --mode "${mode}"`);

  let mask = f.mask ? true : f["no-mask"] ? false : null;
  if (mask === null && interactive()) mask = await askConfirm("Mask the tunnel hostname in output", false);
  if (mask === null) mask = false;

  let duration = f.duration;
  if (!duration && interactive()) duration = await askText("Session length in minutes (1-360)", "180", (v) => (validDuration(v) ? undefined : "enter a number 1-360"));
  duration = duration || "180";
  if (!validDuration(duration)) throw new Error(`bad --duration "${duration}" (want 1-360)`);

  let packages = f.packages;
  if ((packages === null || packages === undefined) && interactive()) packages = await askText("Extra system packages (space-separated, blank = none)", "");
  packages = packages || "";

  let autosave = f.autosave;
  if (!autosave && interactive()) autosave = await askText("Autosave every N minutes (0 = off)", "15", (v) => (validAutosave(v) ? undefined : "enter 0 or more"));
  autosave = autosave || "15";
  if (!validAutosave(autosave)) throw new Error(`bad --autosave "${autosave}" (want 0 or more)`);

  const out = { version: 1, repo, account: account || null, username, authEnabled: authOn, os, distro, mode, mask, duration, packages, autosave };
  if (fs.existsSync(".giecko.json") && !f.force) {
    if (!interactive()) throw new Error(".giecko.json exists (use --force to overwrite)");
    const ok = await askConfirm(".giecko.json exists. Overwrite", false);
    if (!ok) throw new Error("cancelled");
  }
  fs.writeFileSync(".giecko.json", JSON.stringify(out, null, 2) + "\n");
  await outro(`wrote .giecko.json for ${repo}. Next: giecko launch`);
}

module.exports = { run };
