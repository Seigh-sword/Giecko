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
const child_process_1 = require("child_process");
const flags_1 = require("../flags");
const store_1 = require("../store");
const run_1 = require("../run");
const templates_1 = require("../templates");
const launch_1 = require("./launch");
function readConfig(p) {
    if (!fs.existsSync(p))
        return {};
    return JSON.parse(fs.readFileSync(p, "utf8"));
}
function npmLatest() {
    const r = (0, child_process_1.spawnSync)("npm", ["view", "giecko", "version"], { encoding: "utf8", timeout: 15000 });
    const last = String(r.stdout || "").trim().split("\n").pop() || "";
    return r.status === 0 ? last.trim() : "";
}
function newer(a, b) {
    const pa = String(a).split(".").map(Number);
    const pb = String(b).split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) === (pb[i] || 0))
            continue;
        return (pa[i] || 0) > (pb[i] || 0);
    }
    return false;
}
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [["config", "str", ".giecko.json"], ["repo", "str", null], ["account", "str", null], ["self", "bool", false], ["on", "bool", false], ["off", "bool", false]]);
    if ((0, flags_1.bool)(f.on) || (0, flags_1.bool)(f.off)) {
        cfg.autoUpdateCheck = (0, flags_1.bool)(f.on);
        store.save(cfg);
        process.stdout.write("auto update check: " + (cfg.autoUpdateCheck ? "on" : "off") + "\n");
        return;
    }
    const pkg = require("../../package.json");
    const latest = npmLatest();
    if (!latest)
        process.stdout.write("CLI " + pkg.version + " (could not reach the npm registry)\n");
    else if (newer(latest, pkg.version))
        process.stdout.write("CLI update available: " + pkg.version + " -> " + latest + "\n");
    else
        process.stdout.write("CLI " + pkg.version + " is current\n");
    if ((0, flags_1.bool)(f.self)) {
        process.stdout.write("installing the latest CLI...\n");
        const r = (0, child_process_1.spawnSync)("npm", ["install", "-g", "giecko@latest"], { stdio: "inherit" });
        if (r.status !== 0)
            throw new Error("npm install -g failed");
        return;
    }
    else if (latest && newer(latest, pkg.version)) {
        process.stdout.write("install it with: npm install -g giecko@latest (or: giecko update --self)\n");
    }
    const conf = readConfig((0, flags_1.str)(f.config) || ".giecko.json");
    const repo = (0, flags_1.str)(f.repo) || conf.repo;
    if (!repo) {
        process.stdout.write("no repository configured; skipped session files\n");
        return;
    }
    if (!(0, run_1.haveGh)())
        throw new Error("need the GitHub CLI: https://cli.github.com");
    const accountName = ((0, flags_1.str)(f.account) || conf.account || null);
    const token = (0, store_1.tokenFor)(cfg, accountName);
    const branch = (0, run_1.ghApiJson)(token, "repos/" + repo).default_branch;
    const templates = (0, templates_1.loadAll)(token);
    process.stdout.write("updating session files in " + repo + " (branch " + branch + ")...\n");
    (0, launch_1.installFiles)(token, repo, branch, templates, true, true);
    process.stdout.write("session files updated\n");
}
