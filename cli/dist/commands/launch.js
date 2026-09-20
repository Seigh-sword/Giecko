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
exports.installFiles = installFiles;
exports.run = run;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const flags_1 = require("../flags");
const store_1 = require("../store");
const run_1 = require("../run");
const templates_1 = require("../templates");
const ui_1 = require("../ui");
const terms_1 = require("../terms");
const report_1 = require("../report");
const PUT_HINT = "Token needs Contents read+write on this repo (classic PAT: the repo scope; fine-grained PAT: Contents write). Also check branch rulesets on the default branch.";
const NO_PASSWORD = "__BLANK__";
function readConfig(p) {
    if (!fs.existsSync(p))
        return {};
    return JSON.parse(fs.readFileSync(p, "utf8"));
}
function repoDefaultBranch(token, repo) {
    return (0, run_1.ghApiJson)(token, `repos/${repo}`).default_branch;
}
function unix(s) {
    return s.replace(/\r\n/g, "\n");
}
function gitHash(body) {
    return crypto.createHash("sha1").update(`blob ${Buffer.byteLength(body)}\0${body}`).digest("hex");
}
function fileSha(token, repo, branch, repoPath) {
    try {
        const j = (0, run_1.ghApiJson)(token, `repos/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
        return j.sha;
    }
    catch (e) {
        if ((0, report_1.isMissing)(e))
            return null;
        throw e;
    }
}
function gitRef(token, repo, branch) {
    let ref;
    try {
        ref = (0, run_1.ghApiJson)(token, `repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    }
    catch (e) {
        if ((0, report_1.isMissing)(e))
            return null;
        throw e;
    }
    const c = (0, run_1.ghApiJson)(token, `repos/${repo}/git/commits/${ref.object.sha}`);
    return { sha: ref.object.sha, tree: c.tree.sha };
}
function gitBlob(token, repo, body) {
    const j = (0, run_1.ghApiJson)(token, `repos/${repo}/git/blobs`, { content: Buffer.from(body).toString("base64"), encoding: "base64" }, "POST");
    return j.sha;
}
function gitTree(token, repo, baseTree, entries) {
    const payload = { tree: entries };
    if (baseTree)
        payload.base_tree = baseTree;
    return (0, run_1.ghApiJson)(token, `repos/${repo}/git/trees`, payload, "POST").sha;
}
function gitCommit(token, repo, message, tree, parents) {
    return (0, run_1.ghApiJson)(token, `repos/${repo}/git/commits`, { message, tree, parents }, "POST").sha;
}
function gitUpdateRef(token, repo, branch, sha, existed) {
    if (existed) {
        (0, run_1.ghApiJson)(token, `repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha }, "PATCH");
    }
    else {
        (0, run_1.ghApiJson)(token, `repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha }, "POST");
    }
}
function installFiles(token, repo, branch, templates, reinstall, verbose) {
    const say = (m) => {
        if (verbose)
            process.stdout.write(m + "\n");
    };
    const pending = [];
    for (const t of templates) {
        const want = unix(t.body);
        process.stdout.write(`checking ${t.repoPath}...\n`);
        const sha = fileSha(token, repo, branch, t.repoPath);
        if (!sha) {
            say(`missing, will add (${want.length} chars)`);
            pending.push({ repoPath: t.repoPath, source: t.source, want, existed: false });
        }
        else if (sha !== gitHash(want) && reinstall) {
            pending.push({ repoPath: t.repoPath, source: t.source, want, existed: true });
        }
        else if (sha !== gitHash(want)) {
            process.stdout.write(`kept ${t.repoPath} (differs; updating is off for this launch)\n`);
        }
        else {
            process.stdout.write(`kept ${t.repoPath} (current)\n`);
        }
    }
    if (!pending.length)
        return;
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
    }
    catch (e) {
        throw new Error(`could not write install commit: ${e instanceof Error ? e.message : String(e)}\n${PUT_HINT}`);
    }
    for (const p of pending) {
        const back = fileSha(token, repo, branch, p.repoPath);
        if (back !== gitHash(p.want))
            throw new Error(`verify failed for ${p.repoPath}: uploaded but the file is not there. Retry the command.`);
        process.stdout.write(`${p.existed ? "updated" : "installed"} ${p.repoPath} (${p.source})\n`);
    }
}
function latestRunId(token, repo) {
    try {
        const j = (0, run_1.ghApiJson)(token, `repos/${repo}/actions/workflows/giecko.yml/runs?per_page=1`);
        return j.workflow_runs && j.workflow_runs[0] ? String(j.workflow_runs[0].id) : "";
    }
    catch {
        return "";
    }
}
function dispatch(token, repo, branch, inputs) {
    try {
        (0, run_1.ghApiJson)(token, `repos/${repo}/actions/workflows/giecko.yml/dispatches`, { ref: branch, inputs }, "POST");
    }
    catch (e) {
        if (/403|forbidden|resource not accessible/i.test(e instanceof Error ? e.message : String(e))) {
            throw new Error("dispatch forbidden (HTTP 403). The token needs the workflow scope.");
        }
        throw e;
    }
}
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [
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
        ["restore", "str", null],
        ["plugins", "str", null],
        ["nr", "bool", false],
        ["no-reinstall", "bool", false],
    ]);
    if (!(0, run_1.haveGh)())
        throw new Error("need the GitHub CLI: https://cli.github.com");
    const say = (m) => {
        if ((0, flags_1.bool)(f.verbose))
            process.stdout.write(m + "\n");
    };
    const configPath = (0, flags_1.str)(f.config) || ".giecko.json";
    const conf = readConfig(configPath);
    if (conf.autoUpdateCheck !== false && !process.env.GIECKO_NO_UPDATE) {
        try {
            const rcp = require("../../package.json");
            const r = (0, child_process_1.spawnSync)("npm", ["view", "giecko", "version"], { encoding: "utf8", timeout: 15000 });
            const latest = r.status === 0 ? (String(r.stdout || "").trim().split("\n").pop() || "").trim() : "";
            const a = latest.split(".").map(Number);
            const b = rcp.version.split(".").map(Number);
            let up = false;
            for (let i = 0; i < 3; i++) {
                if ((a[i] || 0) !== (b[i] || 0)) {
                    up = (a[i] || 0) > (b[i] || 0);
                    break;
                }
            }
            if (up)
                process.stdout.write("update available: " + rcp.version + " -> " + latest + ". Run: giecko update\n");
        }
        catch { }
    }
    const pick = (flagVal, confVal, def) => (flagVal === null || flagVal === undefined ? (confVal === undefined ? def : String(confVal)) : String(flagVal));
    const repo = pick(f.repo, conf.repo, "");
    if (!repo)
        throw new Error("no repository (giecko init, or --repo owner/name)");
    const accountName = ((0, flags_1.str)(f.account) !== null ? (0, flags_1.str)(f.account) : conf.account || null);
    const token = (0, store_1.tokenFor)(cfg, accountName);
    const username = pick(f.username, conf.username, "giecko");
    const authOn = (0, flags_1.bool)(f.auth) ? true : (0, flags_1.bool)(f["no-auth"]) ? false : conf.authEnabled === undefined ? false : Boolean(conf.authEnabled);
    const os = pick(f.os, conf.os, "ubuntu-latest");
    const distro = pick(f.distro, conf.distro, "runner");
    const mode = pick(f.mode, conf.mode, "ide");
    let mask = (0, flags_1.bool)(f.mask) ? true : (0, flags_1.bool)(f["no-mask"]) ? false : conf.mask === undefined ? false : Boolean(conf.mask);
    let duration = String(pick(f.duration, conf.duration, "180"));
    const packages = String(pick(f.packages, conf.packages, ""));
    const autosave = String(pick(f.autosave, conf.autosave, "15"));
    const plugins = String(f.plugins !== null && f.plugins !== undefined ? f.plugins : (conf.plugins || []).join(" ")).trim();
    const restore = (0, flags_1.str)(f.restore);
    if (!/^\d+$/.test(duration) || Number(duration) < 1 || Number(duration) > 360)
        throw new Error(`bad duration "${duration}" (want 1-360)`);
    if (!/^\d+$/.test(autosave))
        throw new Error(`bad autosave "${autosave}" (want 0 or more)`);
    if (restore && !/^\d+$/.test(restore))
        throw new Error("bad --restore (want a run id number)");
    if (os !== "ubuntu-latest" && os !== "macos-latest" && os !== "windows-latest")
        throw new Error(`bad os "${os}"`);
    if (!["runner", "ubuntu", "debian", "fedora", "arch", "alpine"].includes(distro))
        throw new Error(`bad distro "${distro}"`);
    if ((os === "macos-latest" || os === "windows-latest") && distro !== "runner")
        throw new Error("docker distros need Linux (macOS and Windows force distro=runner)");
    if (!["cli", "ide", "desktop"].includes(mode) && !(0, flags_1.str)(f.stack))
        throw new Error(`bad mode "${mode}"`);
    const stack = (0, flags_1.str)(f.stack) || (mode === "cli" ? "terminal" : mode === "desktop" ? "desktop" : "vscode");
    if (!["terminal", "ide", "vscode", "desktop"].includes(stack))
        throw new Error(`bad stack "${stack}"`);
    let tunnel = (0, flags_1.bool)(f["random-url"]) ? "random" : null;
    const cfFlag = (0, flags_1.str)(f["cf-token"]);
    if (tunnel === null && cfFlag !== null && cfFlag !== "")
        tunnel = "named";
    if (tunnel === null)
        tunnel = pick(null, conf.tunnel, "random");
    if (tunnel !== "random" && tunnel !== "named")
        throw new Error(`bad tunnel "${tunnel}"`);
    let cfToken = tunnel === "named" ? (cfFlag !== null && cfFlag !== "" ? cfFlag : String(conf.cfToken || "")) : "";
    if (tunnel === "named" && !cfToken)
        throw new Error("named tunnel needs a Cloudflare tunnel token (--cf-token, or set it in giecko init)");
    let password;
    const pwFlag = (0, flags_1.str)(f.password);
    if (pwFlag !== null) {
        password = pwFlag;
    }
    else if (authOn && cfg.passwords[repo]) {
        password = cfg.passwords[repo];
    }
    else if (authOn) {
        throw new Error(`no password stored for ${repo} (pass --password, or re-run giecko init)`);
    }
    else {
        password = "";
    }
    const plan = () => ({ repo, account: accountName || "(ambient gh auth)", username, authOn, os, distro, mode, stack, mask, duration, packages, autosave, tunnel, cfToken: cfToken ? "(set)" : "", restore: restore || "", plugins });
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
        process.stdout.write(`  packages  ${p.packages || "(none)"}\n`);
        process.stdout.write(`  plugins   ${p.plugins || "(none)"}\n`);
        process.stdout.write(`  restore   ${p.restore ? "files from run " + p.restore : "(fresh)"}\n\n`);
    };
    showPlan();
    if ((0, flags_1.bool)(f["dry-run"])) {
        process.stdout.write("dry run. Would dispatch with:\n" + JSON.stringify({ ...plan(), password: password ? "(set)" : "(blank)" }, null, 2) + "\n");
        return;
    }
    if ((0, ui_1.interactive)() && !(0, flags_1.bool)(f.yes)) {
        let go = false;
        while (!go) {
            const choice = await (0, ui_1.pick)("Review the plan", [
                { value: "go", label: "Launch now" },
                { value: "mask", label: `Toggle mask (now ${mask ? "on" : "off"})` },
                { value: "url", label: `URL naming (now ${tunnel === "named" ? "named tunnel" : "random"})` },
                { value: "duration", label: `Change duration (now ${duration} min)` },
                { value: "cancel", label: "Cancel" },
            ]);
            if (choice === "go")
                go = true;
            else if (choice === "cancel")
                throw new Error("cancelled");
            else if (choice === "mask")
                mask = !mask;
            else if (choice === "duration") {
                const v = await (0, ui_1.askText)("Session length in minutes (1-360)", duration, (x) => (/^\d+$/.test(x) && Number(x) >= 1 && Number(x) <= 360 ? undefined : "enter a number 1-360"));
                if (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 360)
                    duration = String(v);
            }
            else if (choice === "url") {
                if (tunnel === "random") {
                    const tok = await (0, ui_1.askSecret)("Cloudflare tunnel token (blank = stay random)");
                    if (tok) {
                        tunnel = "named";
                        cfToken = tok;
                    }
                }
                else
                    tunnel = "random";
            }
            showPlan();
        }
    }
    await (0, terms_1.ensureAccepted)(cfg, store, (0, flags_1.bool)(f["accept-terms"]));
    const branch = repoDefaultBranch(token, repo);
    say(`default branch: ${branch}`);
    if (!(0, flags_1.bool)(f["skip-install"])) {
        const templates = (0, templates_1.loadAll)(token);
        say(`templates source: ${templates[0].source}`);
        const reinstall = (0, flags_1.bool)(f.reinstall) ? true : (0, flags_1.bool)(f.nr) || (0, flags_1.bool)(f["no-reinstall"]) ? false : true;
        installFiles(token, repo, branch, templates, reinstall, (0, flags_1.bool)(f.verbose));
    }
    const before = latestRunId(token, repo);
    say(`latest run before dispatch: ${before || "(none)"}`);
    process.stdout.write(`dispatching ${stack} session on ${repo}...\n`);
    dispatch(token, repo, branch, {
        stack, os, distro, user: username, password: authOn ? password : NO_PASSWORD, mask: Boolean(mask),
        duration_minutes: duration, packages, autosave_minutes: autosave, cf_token: cfToken, restore: restore || "", plugins,
    });
    let runId = "";
    for (let i = 0; i < 12; i++) {
        (0, report_1.sleepMs)(5000);
        runId = latestRunId(token, repo);
        say(`run poll ${i + 1}: ${runId || "(none yet)"}`);
        if (runId && runId !== before)
            break;
    }
    if (!runId || runId === before)
        throw new Error("dispatched, but the new run is not visible yet. Check the Actions tab.");
    process.stdout.write(`run id: ${runId}\n`);
    const rep = (0, report_1.waitFor)(token, repo, runId, 360000, (0, flags_1.bool)(f.verbose));
    if (!rep.found && rep.ended)
        throw new Error(`run ${runId} ended without publishing a report. Check the Actions tab for failures.`);
    if (!rep.found)
        throw new Error(`run ${runId} is still not live after 6 minutes. Check the Actions tab.`);
    const r = (0, report_1.parseReport)(rep.text);
    const wantCode = stack !== "terminal";
    const named = /named-tunnel/i.test(r.term || "") || /named-tunnel/i.test(r.code || "") || /named-tunnel/i.test(r.desk || "");
    const url = named ? "" : stack === "desktop" ? ((0, report_1.realUrl)(r.desk) || (0, report_1.realUrl)(r.term)) : wantCode ? (0, report_1.realUrl)(r.code) : (0, report_1.realUrl)(r.term);
    const runPage = `https://github.com/${repo}/actions/runs/${runId}`;
    try {
        store.saveSession({
            version: 1, runId, repo, stack, os, distro,
            region: r.region || "", boot: r.boot || "", url: url || "", workBranch: r.work || "",
            startedAt: new Date().toISOString(), configPath: path.resolve(configPath),
        }, configPath);
    }
    catch { }
    process.stdout.write("\nGIECKO IS LIVE\n");
    process.stdout.write(`  session : ${url || (named ? "named tunnel - open the hostname from your Cloudflare dashboard" : "(masked - scan the QR in the run logs)")}\n`);
    process.stdout.write(`  files   : branch ${r.work || "(see run page)"}\n`);
    process.stdout.write(`  region  : ${r.region}   boot: ${r.boot}s   password: ${password || "(none - open session)"}\n`);
    process.stdout.write(`  run page: ${runPage}\n`);
    if (url)
        (0, report_1.showQr)(url);
    const shouldOpen = (0, flags_1.bool)(f.open) ? true : (0, flags_1.bool)(f["no-open"]) ? false : true;
    if (shouldOpen) {
        const target = url || runPage;
        process.stdout.write(`opening ${target}\n`);
        if (!(0, run_1.openBrowser)(target))
            process.stdout.write("could not open a browser; use the link above\n");
    }
}
