"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const flags_1 = require("../flags");
const ui_1 = require("../ui");
const store_1 = require("../store");
const run_1 = require("../run");
const terms_1 = require("../terms");
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
    const j = (0, run_1.ghApiJson)(token, "user/repos?per_page=100&sort=updated");
    return j.map((r) => r.full_name);
}
function createRepo(token, owner, name, priv) {
    if (!owner) {
        const j = (0, run_1.ghApiJson)(token, "user/repos", { name, private: Boolean(priv) }, "POST");
        return j.full_name;
    }
    const j = (0, run_1.ghApiJson)(token, `orgs/${owner}/repos`, { name, private: Boolean(priv) }, "POST");
    return j.full_name;
}
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [
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
    const configPath = (0, flags_1.str)(f.config) || ".giecko.json";
    await (0, terms_1.ensureAccepted)(cfg, store, (0, flags_1.bool)(f["accept-terms"]));
    const accountNames = Object.keys(cfg.accounts);
    let account = (0, flags_1.str)(f.account);
    if (!account && (0, ui_1.interactive)()) {
        account = await (0, ui_1.pick)("Which account", [
            ...accountNames.map((n) => ({ value: n, label: n + (n === cfg.activeAccount ? " (active)" : "") })),
            { value: "", label: "None (use ambient gh auth)" },
        ]);
    }
    if (account === undefined || account === null)
        account = cfg.activeAccount || "";
    if (account === "none")
        account = "";
    const token = account ? (0, store_1.tokenFor)(cfg, account) : null;
    let repo = (0, flags_1.str)(f.repo);
    const create = (0, flags_1.str)(f.create);
    if (create) {
        if (!token)
            throw new Error("--create needs an account with a token");
        const priv = (0, flags_1.bool)(f.private) ? true : (0, flags_1.bool)(f.public) ? false : false;
        repo = createRepo(token, (0, flags_1.str)(f.org) || "", create, priv);
        process.stdout.write(`created repository: ${repo} (${priv ? "private" : "public"})\n`);
    }
    if (!repo && (0, ui_1.interactive)()) {
        let options = [];
        if (token) {
            try {
                options = listRepos(token).slice(0, 30).map((n) => ({ value: n, label: n }));
            }
            catch {
                options = [];
            }
        }
        options.push({ value: "@type", label: "Type owner/name manually" });
        options.push({ value: "@create", label: "Create a new repository" });
        const choice = await (0, ui_1.pick)("Which repository runs the sessions", options);
        if (choice === "@type") {
            repo = await (0, ui_1.askText)("Repository (owner/name)", "");
        }
        else if (choice === "@create") {
            if (!token)
                throw new Error("creating a repository needs an account with a token");
            const name = await (0, ui_1.askText)("New repository name", "");
            const owner = await (0, ui_1.askText)("Owner: your user (blank) or an org", "");
            const vis = await (0, ui_1.pick)("Visibility", [
                { value: "public", label: "Public" },
                { value: "private", label: "Private" },
            ]);
            repo = createRepo(token, (owner || "").trim(), (name || "").trim(), vis === "private");
            process.stdout.write(`created repository: ${repo}\n`);
        }
        else {
            repo = choice;
        }
    }
    if (!repo)
        throw new Error("no repository; pass --repo owner/name or --create NAME");
    if (!validRepo(repo))
        throw new Error(`bad repository "${repo}" (want owner/name)`);
    let username = (0, flags_1.str)(f.username);
    if (!username && (0, ui_1.interactive)())
        username = await (0, ui_1.askText)("Session username", "giecko");
    username = (username || "giecko").trim() || "giecko";
    let authOn = (0, flags_1.bool)(f.auth) ? true : (0, flags_1.bool)(f["no-auth"]) ? false : null;
    if (authOn === null && (0, ui_1.interactive)())
        authOn = await (0, ui_1.askConfirm)("Protect the session with a password", false);
    if (authOn === null)
        authOn = false;
    let password = (0, flags_1.str)(f.password);
    if (authOn && password === null && (0, ui_1.interactive)()) {
        password = (await (0, ui_1.askSecret)("Session password (empty = generate one)")) || "";
    }
    if (authOn && !password) {
        password = genPassword();
        process.stdout.write(`generated password (saved with this config): ${password}\n`);
    }
    if (authOn) {
        cfg.passwords[repo] = password;
        store.save(cfg);
    }
    let os = (0, flags_1.str)(f.os);
    if (!os && (0, ui_1.interactive)()) {
        os = await (0, ui_1.pick)("Runner OS", [
            { value: "ubuntu-latest", label: "Ubuntu (recommended)" },
            { value: "macos-latest", label: "macOS" },
            { value: "windows-latest", label: "Windows" },
        ]);
    }
    os = os || "ubuntu-latest";
    if (os !== "ubuntu-latest" && os !== "macos-latest" && os !== "windows-latest")
        throw new Error(`bad --os "${os}"`);
    let distro = (0, flags_1.str)(f.distro);
    if (os === "macos-latest" || os === "windows-latest") {
        if (distro && distro !== "runner")
            throw new Error("docker distros need Linux (macOS and Windows force distro=runner)");
        distro = "runner";
    }
    else if (!distro && (0, ui_1.interactive)()) {
        distro = await (0, ui_1.pick)("Shell environment", [
            { value: "runner", label: "Runner OS directly (fastest)" },
            { value: "ubuntu", label: "Ubuntu 24.04 container" },
            { value: "debian", label: "Debian 12 container" },
            { value: "fedora", label: "Fedora 42 container" },
            { value: "arch", label: "Arch container" },
            { value: "alpine", label: "Alpine container" },
        ]);
    }
    distro = distro || "runner";
    if (!DISTROS.includes(distro))
        throw new Error(`bad --distro "${distro}"`);
    let mode = (0, flags_1.str)(f.mode);
    if (!mode && (0, ui_1.interactive)()) {
        mode = await (0, ui_1.pick)("Session mode (one link per session)", [
            { value: "ide", label: "IDE (VS Code in the browser)" },
            { value: "cli", label: "CLI (terminal in the browser)" },
            { value: "desktop", label: "Desktop (a full GUI OS in the browser)" },
        ]);
    }
    mode = mode || "ide";
    if (mode !== "cli" && mode !== "ide" && mode !== "desktop")
        throw new Error(`bad --mode "${mode}"`);
    let tunnel = (0, flags_1.bool)(f["random-url"]) ? "random" : (0, flags_1.str)(f["cf-token"]) ? "named" : null;
    if (tunnel === null && (0, ui_1.interactive)()) {
        tunnel = await (0, ui_1.pick)("Session URL naming", [
            { value: "random", label: "Random (free trycloudflare.com name, zero setup)" },
            { value: "named", label: "Named (your own domain via a Cloudflare tunnel token)" },
        ]);
    }
    tunnel = tunnel || "random";
    if (tunnel !== "random" && tunnel !== "named")
        throw new Error(`bad tunnel "${tunnel}"`);
    let cfToken = (0, flags_1.str)(f["cf-token"]);
    if (tunnel === "named" && !cfToken && (0, ui_1.interactive)())
        cfToken = await (0, ui_1.askSecret)("Cloudflare tunnel token (Zero Trust -> Networks -> Tunnels)");
    if (tunnel === "named" && !cfToken)
        throw new Error("named tunnel needs a Cloudflare tunnel token (--cf-token)");
    let mask = (0, flags_1.bool)(f.mask) ? true : (0, flags_1.bool)(f["no-mask"]) ? false : null;
    if (mask === null && (0, ui_1.interactive)())
        mask = await (0, ui_1.askConfirm)("Mask the tunnel hostname in output", false);
    if (mask === null)
        mask = false;
    let duration = (0, flags_1.str)(f.duration);
    if (!duration && (0, ui_1.interactive)())
        duration = await (0, ui_1.askText)("Session length in minutes (1-360)", "180", (v) => (validDuration(v) ? undefined : "enter a number 1-360"));
    duration = duration || "180";
    if (!validDuration(duration))
        throw new Error(`bad --duration "${duration}" (want 1-360)`);
    let packages = (0, flags_1.str)(f.packages);
    if (packages === null && (0, ui_1.interactive)())
        packages = await (0, ui_1.askText)("Extra system packages (space-separated, blank = none)", "");
    packages = packages || "";
    let autosave = (0, flags_1.str)(f.autosave);
    if (!autosave && (0, ui_1.interactive)())
        autosave = await (0, ui_1.askText)("Autosave every N minutes (0 = off)", "15", (v) => (validAutosave(v) ? undefined : "enter 0 or more"));
    autosave = autosave || "15";
    if (!validAutosave(autosave))
        throw new Error(`bad --autosave "${autosave}" (want 0 or more)`);
    const out = { version: 1, repo, account: account || null, username, authEnabled: authOn, os, distro, mode, mask, duration, packages, autosave, tunnel, cfToken: tunnel === "named" ? cfToken : null };
    if (fs.existsSync(configPath) && !(0, flags_1.bool)(f.force)) {
        if (!(0, ui_1.interactive)())
            throw new Error(configPath + " exists (use --force to overwrite)");
        const ok = await (0, ui_1.askConfirm)(configPath + " exists. Overwrite", false);
        if (!ok)
            throw new Error("cancelled");
    }
    fs.mkdirSync(path.dirname(path.resolve(configPath)), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(out, null, 2) + "\n");
    const next = configPath === ".giecko.json" ? "giecko launch" : "giecko launch --config " + configPath;
    await (0, ui_1.outro)(`wrote ${configPath} for ${repo}. Next: ${next}`);
}
