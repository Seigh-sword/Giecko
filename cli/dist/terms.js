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
exports.ensureAccepted = ensureAccepted;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ui_1 = require("./ui");
const VERSION = "v1";
function termsText() {
    try {
        return fs.readFileSync(path.join(__dirname, "..", "terms.txt"), "utf8");
    }
    catch {
        return "Giecko Terms of Use (v1): respect the GitHub and Cloudflare terms of service, keep sessions reasonable, sessions are public by URL so use a strong password, everything is ephemeral, no warranty. The full text ships as terms.txt with this package and as TERMS.md in the Giecko repository.";
    }
}
function accepted(cfg) {
    return cfg.termsAccepted === VERSION;
}
async function ensureAccepted(cfg, store, autoAccept) {
    if (accepted(cfg))
        return;
    if (autoAccept) {
        cfg.termsAccepted = VERSION;
        store.save(cfg);
        return;
    }
    if (!(0, ui_1.interactive)()) {
        throw new Error("terms not accepted yet; re-run with --accept-terms");
    }
    process.stdout.write("\n" + termsText() + "\n");
    const ans = await (0, ui_1.askText)("Type yes to accept the Giecko terms above", "");
    if (!/^y(es)?$/i.test((ans || "").trim()))
        throw new Error("terms not accepted, aborting");
    cfg.termsAccepted = VERSION;
    store.save(cfg);
}
