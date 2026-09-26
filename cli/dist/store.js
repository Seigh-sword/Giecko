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
exports.configDir = configDir;
exports.configPath = configPath;
exports.sessionsDir = sessionsDir;
exports.sessionDir = sessionDir;
exports.load = load;
exports.save = save;
exports.tokenFor = tokenFor;
exports.saveSession = saveSession;
exports.listSessions = listSessions;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function configDir() {
    if (process.env.GIECKO_CONFIG_DIR)
        return process.env.GIECKO_CONFIG_DIR;
    if (process.env.XDG_CONFIG_HOME)
        return path.join(process.env.XDG_CONFIG_HOME, "giecko");
    return path.join(os.homedir(), ".config", "giecko");
}
function configPath() {
    return path.join(configDir(), "config.json");
}
function sessionsDir() {
    return path.join(configDir(), "sessions");
}
function sessionDir(runId) {
    return path.join(sessionsDir(), String(runId));
}
function blank() {
    return { accounts: {}, activeAccount: null, passwords: {}, termsAccepted: null };
}
function load() {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    }
    catch {
        return blank();
    }
    if (!data || typeof data !== "object")
        return blank();
    if (!data.accounts || typeof data.accounts !== "object")
        data.accounts = {};
    if (!data.passwords || typeof data.passwords !== "object")
        data.passwords = {};
    return data;
}
function save(data) {
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}
function tokenFor(cfg, name) {
    if (!name) {
        if (cfg.activeAccount && cfg.accounts[cfg.activeAccount])
            return cfg.accounts[cfg.activeAccount].token;
        return null;
    }
    if (!cfg.accounts[name])
        throw new Error(`no account named "${name}" (see: giecko auth list)`);
    return cfg.accounts[name].token;
}
function saveSession(rec, configSource) {
    const dir = sessionDir(rec.runId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "session.json"), JSON.stringify(rec, null, 2) + "\n");
    if (configSource && fs.existsSync(configSource)) {
        try {
            fs.copyFileSync(configSource, path.join(dir, "giecko.json"));
        }
        catch { }
    }
}
function listSessions() {
    let names = [];
    try {
        names = fs.readdirSync(sessionsDir()).filter((n) => /^\d+$/.test(n)).sort().reverse();
    }
    catch {
        return [];
    }
    const out = [];
    for (const n of names) {
        try {
            const j = JSON.parse(fs.readFileSync(path.join(sessionsDir(), n, "session.json"), "utf8"));
            if (j && j.runId)
                out.push({ ...j, dir: path.join(sessionsDir(), n) });
        }
        catch { }
    }
    return out;
}
