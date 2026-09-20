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
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [["repo", "str", null], ["tail", "str", "60"]]);
    const runId = f._[0];
    if (!runId)
        throw new Error("usage: giecko logs <run-id> [--repo owner/name] [--tail N]");
    if (!(0, run_1.haveGh)())
        throw new Error("need the GitHub CLI: https://cli.github.com");
    let repo = (0, flags_1.str)(f.repo);
    if (!repo) {
        try {
            if (fs.existsSync(".giecko.json"))
                repo = JSON.parse(fs.readFileSync(".giecko.json", "utf8")).repo;
        }
        catch { }
    }
    if (!repo)
        throw new Error("no repository (run in a configured directory, or pass --repo)");
    const token = (0, store_1.tokenFor)(cfg, null);
    const tailNum = Math.max(1, Number((0, flags_1.str)(f.tail)) || 60);
    const out = (0, run_1.ghRaw)(["run", "view", runId, "--log", "-R", repo], token);
    const lines = out.split("\n");
    process.stdout.write(lines.slice(-tailNum).join("\n") + "\n");
}
