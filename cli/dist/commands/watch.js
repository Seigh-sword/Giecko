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
const report_1 = require("../report");
const store_1 = require("../store");
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [["repo", "str", null]]);
    const runId = f._[0];
    if (!runId)
        throw new Error("usage: giecko watch <run-id> [--repo owner/name]");
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
    process.stdout.write(`watching run ${runId} (up to 6 min)...\n`);
    const rep = (0, report_1.waitFor)(token, repo, runId, 360000);
    if (!rep.found && rep.ended)
        throw new Error(`run ${runId} ended without publishing a report`);
    if (!rep.found)
        throw new Error(`run ${runId} is still not live after 6 minutes`);
    const r = (0, report_1.parseReport)(rep.text);
    const term = (0, report_1.realUrl)(r.term);
    const code = (0, report_1.realUrl)(r.code);
    const desk = (0, report_1.realUrl)(r.desk);
    process.stdout.write("\nGIECKO IS LIVE\n");
    process.stdout.write(`  terminal: ${term || r.term || "(not in this session)"}\n`);
    process.stdout.write(`  vscode  : ${code || r.code || "(not in this session)"}\n`);
    process.stdout.write(`  desktop : ${desk || r.desk || "(not in this session)"}\n`);
    process.stdout.write(`  region  : ${r.region}   boot: ${r.boot}s\n`);
    if (term)
        (0, report_1.showQr)(term);
    if (code)
        (0, report_1.showQr)(code);
    if (desk)
        (0, report_1.showQr)(desk);
}
