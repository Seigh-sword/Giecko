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
exports.sleepMs = sleepMs;
exports.parseReport = parseReport;
exports.isMissing = isMissing;
exports.waitFor = waitFor;
exports.realUrl = realUrl;
exports.showQr = showQr;
const run_1 = require("./run");
const qrcodeTerminal = __importStar(require("qrcode-terminal"));
function sleepMs(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function field(text, key) {
    const line = text.split("\n").find((l) => l.startsWith(`- ${key}:`));
    return line ? line.slice(key.length + 4).trim() : "";
}
function parseReport(text) {
    return {
        status: field(text, "status"),
        stack: field(text, "stack"),
        distro: field(text, "distro"),
        region: field(text, "region"),
        boot: field(text, "boot_seconds"),
        term: field(text, "url_terminal"),
        code: field(text, "url_code"),
        desk: field(text, "url_desktop"),
        work: field(text, "work_branch"),
    };
}
function isMissing(e) {
    const msg = e instanceof Error ? e.message : String(e || "");
    return /404|not found/i.test(msg);
}
function runStatus(token, repo, runId) {
    try {
        return (0, run_1.ghApiJson)(token, `repos/${repo}/actions/runs/${runId}`).status;
    }
    catch (e) {
        return isMissing(e) ? "gone" : "";
    }
}
function waitFor(token, repo, runId, timeoutMs, verbose) {
    const started = Date.now();
    let tick = 0;
    while (Date.now() - started < timeoutMs) {
        try {
            const j = (0, run_1.ghApiJson)(token, `repos/${repo}/contents/reports/run-${runId}.md?ref=giecko-reports`);
            return { found: true, ended: false, text: Buffer.from(j.content, "base64").toString("utf8") };
        }
        catch (e) {
            if (!isMissing(e))
                throw e;
        }
        const st = runStatus(token, repo, runId);
        if (st === "completed" || st === "gone")
            return { found: false, ended: true, text: "" };
        tick++;
        if (verbose)
            process.stdout.write(`report poll ${tick}: not yet (run ${st || "unknown"})\n`);
        sleepMs(10000);
    }
    return { found: false, ended: false, text: "" };
}
function realUrl(value) {
    return value && value.startsWith("https://") && !value.includes("*") ? value : "";
}
function showQr(url) {
    try {
        qrcodeTerminal.generate(url, { small: true });
    }
    catch {
        process.stdout.write("(install dependencies to render the QR code)\n");
    }
}
