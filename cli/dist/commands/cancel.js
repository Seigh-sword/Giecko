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
const flags_1 = require("../flags");
const run_1 = require("../run");
const store_1 = require("../store");
function resolveRepo(cfg, flagRepo) {
    if (flagRepo)
        return flagRepo;
    try {
        if (fs.existsSync(".giecko.json")) {
            const repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
            if (repo)
                return repo;
        }
    }
    catch { }
    return (0, run_1.ghRaw)(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], null);
}
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [["repo", "str", null]]);
    if (!(0, run_1.haveGh)())
        throw new Error("need the GitHub CLI: https://cli.github.com");
    const repo = resolveRepo(cfg, (0, flags_1.str)(f.repo));
    const token = (0, store_1.tokenFor)(cfg, null);
    let runId = f._[0];
    if (!runId) {
        const j = (0, run_1.ghApiJson)(token, `repos/${repo}/actions/workflows/giecko.yml/runs?per_page=5`);
        const active = (j.workflow_runs || []).find((x) => x.status !== "completed");
        if (!active)
            throw new Error("no in-progress run found. Pass a run id: giecko cancel <run-id>");
        runId = String(active.id);
    }
    (0, run_1.ghApiJson)(token, `repos/${repo}/actions/runs/${runId}/cancel`, {}, "POST");
    process.stdout.write(`cancel requested for run ${runId} (${repo})\n`);
}
