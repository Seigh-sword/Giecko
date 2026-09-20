import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { parse, str, bool } from "../flags";
import { interactive, pick, askText, askSecret, askConfirm, outro } from "../ui";
import { tokenFor } from "../store";
import type { Config, Store } from "../store";
import { ghApiJson } from "../run";
import { ensureAccepted } from "../terms";

const DISTROS = ["runner", "ubuntu", "debian", "fedora", "arch", "alpine"];

function genPassword(): string {
  return crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
}

function validRepo(v: string): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(v || "");
}

function validDuration(v: string): boolean {
  return /^\d+$/.test(v || "") && Number(v) >= 1 && Number(v) <= 360;
}

function validAutosave(v: string): boolean {
  return /^\d+$/.test(v || "");
}

function listRepos(token: string): string[] {
  const j = ghApiJson(token, "user/repos?per_page=100&sort=updated");
  return j.map((r: any) => r.full_name);
}

function createRepo(token: string, owner: string, name: string, priv: boolean): string {
  if (!owner) {
    const j = ghApiJson(token, "user/repos", { name, private: Boolean(priv) }, "POST");
    return j.full_name;
  }
  const j = ghApiJson(token, `orgs/${owner}/repos`, { name, private: Boolean(priv) }, "POST");
  return j.full_name;
}

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
  const f = parse(argv, [
    ["config", "str", ".giecko.json"],
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
    ["cf-token", "str", null],
    ["random-url", "bool", false],
    ["accept-terms", "bool", false],
    ["force", "bool", false],
  ]);
  const configPath = str(f.config) || ".giecko.json";

  await ensureAccepted(cfg, store, bool(f["accept-terms"]));

  const accountNames = Object.keys(cfg.accounts);
  let account: string | null = str(f.account);
  if (!account && interactive()) {
    account = await pick("Which account", [
      ...accountNames.map((n) => ({ value: n, label: n + (n === cfg.activeAccount ? " (active)" : "") })),
      { value: "", label: "None (use ambient gh auth)" },
    ]);
  }
  if (account === undefined || account === null) account = cfg.activeAccount || "";
  if (account === "none") account = "";
  const token = account ? tokenFor(cfg, account) : null;

  let repo: string | null = str(f.repo);
  const create = str(f.create);
  if (create) {
    if (!token) throw new Error("--create needs an account with a token");
    const priv = bool(f.private) ? true : bool(f.public) ? false : false;
    repo = createRepo(token, str(f.org) || "", create, priv);
    process.stdout.write(`created repository: ${repo} (${priv ? "private" : "public"})\n`);
  }
  if (!repo && interactive()) {
    let options: Array<{ value: string; label: string }> = [];
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

  let username = str(f.username);
  if (!username && interactive()) username = await askText("Session username", "giecko");
  username = (username || "giecko").trim() || "giecko";

  let authOn: boolean | null = bool(f.auth) ? true : bool(f["no-auth"]) ? false : null;
  if (authOn === null && interactive()) authOn = await askConfirm("Protect the session with a password", false);
  if (authOn === null) authOn = false;

  let password = str(f.password);
  if (authOn && password === null && interactive()) {
    password = (await askSecret("Session password (empty = generate one)")) || "";
  }
  if (authOn && !password) {
    password = genPassword();
    process.stdout.write(`generated password (saved with this config): ${password}\n`);
  }
  if (authOn) {
    cfg.passwords[repo] = password as string;
    store.save(cfg);
  }

  let os = str(f.os);
  if (!os && interactive()) {
    os = await pick("Runner OS", [
      { value: "ubuntu-latest", label: "Ubuntu (recommended)" },
      { value: "macos-latest", label: "macOS" },
      { value: "windows-latest", label: "Windows" },
    ]);
  }
  os = os || "ubuntu-latest";
  if (os !== "ubuntu-latest" && os !== "macos-latest" && os !== "windows-latest") throw new Error(`bad --os "${os}"`);

  let distro = str(f.distro);
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

  let mode = str(f.mode);
  if (!mode && interactive()) {
    mode = await pick("Session mode (one link per session)", [
      { value: "ide", label: "IDE (VS Code in the browser)" },
      { value: "cli", label: "CLI (terminal in the browser)" },
      { value: "desktop", label: "Desktop (a full GUI OS in the browser)" },
    ]);
  }
  mode = mode || "ide";
  if (mode !== "cli" && mode !== "ide" && mode !== "desktop") throw new Error(`bad --mode "${mode}"`);

  let tunnel = bool(f["random-url"]) ? "random" : str(f["cf-token"]) ? "named" : null;
  if (tunnel === null && interactive()) {
    tunnel = await pick("Session URL naming", [
      { value: "random", label: "Random (free trycloudflare.com name, zero setup)" },
      { value: "named", label: "Named (your own domain via a Cloudflare tunnel token)" },
    ]);
  }
  tunnel = tunnel || "random";
  if (tunnel !== "random" && tunnel !== "named") throw new Error(`bad tunnel "${tunnel}"`);
  let cfToken = str(f["cf-token"]);
  if (tunnel === "named" && !cfToken && interactive()) cfToken = await askSecret("Cloudflare tunnel token (Zero Trust -> Networks -> Tunnels)");
  if (tunnel === "named" && !cfToken) throw new Error("named tunnel needs a Cloudflare tunnel token (--cf-token)");

  let mask: boolean | null = bool(f.mask) ? true : bool(f["no-mask"]) ? false : null;
  if (mask === null && interactive()) mask = await askConfirm("Mask the tunnel hostname in output", false);
  if (mask === null) mask = false;

  let duration = str(f.duration);
  if (!duration && interactive()) duration = await askText("Session length in minutes (1-360)", "180", (v) => (validDuration(v) ? undefined : "enter a number 1-360"));
  duration = duration || "180";
  if (!validDuration(duration)) throw new Error(`bad --duration "${duration}" (want 1-360)`);

  let packages = str(f.packages);
  if (packages === null && interactive()) packages = await askText("Extra system packages (space-separated, blank = none)", "");
  packages = packages || "";

  let autosave = str(f.autosave);
  if (!autosave && interactive()) autosave = await askText("Autosave every N minutes (0 = off)", "15", (v) => (validAutosave(v) ? undefined : "enter 0 or more"));
  autosave = autosave || "15";
  if (!validAutosave(autosave)) throw new Error(`bad --autosave "${autosave}" (want 0 or more)`);

  const out = { version: 1, repo, account: account || null, username, authEnabled: authOn, os, distro, mode, mask, duration, packages, autosave, tunnel, cfToken: tunnel === "named" ? cfToken : null };
  if (fs.existsSync(configPath) && !bool(f.force)) {
    if (!interactive()) throw new Error(configPath + " exists (use --force to overwrite)");
    const ok = await askConfirm(configPath + " exists. Overwrite", false);
    if (!ok) throw new Error("cancelled");
  }
  fs.mkdirSync(path.dirname(path.resolve(configPath)), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(out, null, 2) + "\n");
  const next = configPath === ".giecko.json" ? "giecko launch" : "giecko launch --config " + configPath;
  await outro(`wrote ${configPath} for ${repo}. Next: ${next}`);
}
