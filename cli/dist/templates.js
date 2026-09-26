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
exports.upstream = upstream;
exports.files = files;
exports.loadAll = loadAll;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const run_1 = require("./run");
function upstream() {
    return process.env.GIECKO_UPSTREAM || process.env.GIEKO_UPSTREAM || "Seigh-sword/Giecko";
}
function files() {
    return [
        { repoPath: ".github/workflows/giecko.yml", bundle: "giecko.yml" },
        { repoPath: "scripts/giecko.sh", bundle: "giecko.sh" },
        { repoPath: "scripts/giecko.ps1", bundle: "giecko.ps1" },
        { repoPath: "scripts/giecko", bundle: "giecko" },
    ];
}
function bundled(name) {
    return fs.readFileSync(path.join(__dirname, "..", "templates", name), "utf8");
}
function fetchRemote(token, branch, repoPath) {
    const j = (0, run_1.ghApiJson)(token, `repos/${upstream()}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`);
    return Buffer.from(j.content, "base64").toString("utf8");
}
function defaultBranch(token) {
    return (0, run_1.ghApiJson)(token, `repos/${upstream()}`).default_branch;
}
function loadAll(token) {
    try {
        const branch = defaultBranch(token);
        return files().map((f) => ({ ...f, body: fetchRemote(token, branch, f.repoPath), source: `remote@${branch}` }));
    }
    catch {
        return files().map((f) => ({ ...f, body: bundled(f.bundle), source: "bundled" }));
    }
}
