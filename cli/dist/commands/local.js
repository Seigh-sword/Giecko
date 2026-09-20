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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const flags_1 = require("../flags");
const templates_1 = require("../templates");
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [
        ["stack", "str", "terminal"],
        ["password", "str", null],
        ["duration", "str", "120"],
        ["packages", "str", ""],
        ["autosave", "str", "0"],
        ["username", "str", "giecko"],
        ["mask", "bool", false],
        ["distro", "str", "runner"],
        ["dry-run", "bool", false],
    ]);
    const duration = (0, flags_1.str)(f.duration);
    if (!/^\d+$/.test(duration) || Number(duration) > 360)
        throw new Error(`bad --duration "${duration}" (want 0-360)`);
    const stackIn = (0, flags_1.str)(f.stack);
    if (!["terminal", "ide", "vscode", "desktop", "cli"].includes(stackIn))
        throw new Error(`bad --stack "${stackIn}"`);
    const stack = stackIn === "cli" ? "terminal" : stackIn;
    let password = (0, flags_1.str)(f.password);
    if (!password) {
        password = crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
        process.stdout.write(`generated password: ${password}\n`);
    }
    const dir = path.join(os.tmpdir(), "giecko-local");
    fs.mkdirSync(dir, { recursive: true });
    const templates = (0, templates_1.loadAll)(null);
    const files = {};
    for (const t of templates)
        files[t.repoPath] = t.body;
    const shBody = files["scripts/giecko.sh"];
    const boxBody = files["scripts/giecko"];
    if (!shBody || !boxBody)
        throw new Error("runner scripts missing from the templates");
    const shPath = path.join(dir, "giecko.sh");
    const boxPath = path.join(dir, "giecko");
    fs.writeFileSync(shPath, shBody);
    fs.writeFileSync(boxPath, boxBody);
    fs.chmodSync(shPath, 0o755);
    fs.chmodSync(boxPath, 0o755);
    const args = [shPath, password, duration, String((0, flags_1.str)(f.packages) || ""), stack, String((0, flags_1.str)(f.autosave) || "0"), (0, flags_1.str)(f.username) || "giecko", (0, flags_1.bool)(f.mask) ? "true" : "false", (0, flags_1.str)(f.distro) || "runner"];
    if ((0, flags_1.bool)(f["dry-run"])) {
        process.stdout.write("dry run. Would run:\n  bash " + args.join(" ").replace(password, "****") + "\nfrom " + dir + "\n");
        return;
    }
    process.stdout.write(`starting local session (stack=${stack}, ${duration} min) from ${dir}\n`);
    const r = (0, child_process_1.spawnSync)("bash", args, { stdio: "inherit" });
    if (r.error)
        throw new Error("could not run bash (local mode needs bash): " + r.error.message);
    process.exitCode = r.status || 0;
}
