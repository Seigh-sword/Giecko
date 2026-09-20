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
exports.interactive = interactive;
exports.needTTY = needTTY;
exports.pick = pick;
exports.askText = askText;
exports.askSecret = askSecret;
exports.askConfirm = askConfirm;
exports.intro = intro;
exports.outro = outro;
exports.note = note;
let cached = null;
async function clack() {
    if (!cached) {
        const m = await Promise.resolve().then(() => __importStar(require("@clack/prompts")));
        cached = m && m.select ? m : m.default;
    }
    return cached;
}
function interactive() {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
function needTTY(flagHint) {
    if (!interactive())
        throw new Error(`not a terminal; pass ${flagHint} (see: giecko help)`);
}
async function pick(message, options) {
    const c = await clack();
    const v = await c.select({ message, options });
    if (c.isCancel(v))
        throw new Error("cancelled");
    return v;
}
async function askText(message, initialValue, validate) {
    const c = await clack();
    const v = await c.text({ message, initialValue, validate });
    if (c.isCancel(v))
        throw new Error("cancelled");
    return v;
}
async function askSecret(message) {
    const c = await clack();
    const v = await c.password({ message });
    if (c.isCancel(v))
        throw new Error("cancelled");
    return v;
}
async function askConfirm(message, initialValue) {
    const c = await clack();
    const v = await c.confirm({ message, initialValue: Boolean(initialValue) });
    if (c.isCancel(v))
        throw new Error("cancelled");
    return Boolean(v);
}
async function intro(title) {
    (await clack()).intro(title);
}
async function outro(msg) {
    (await clack()).outro(msg);
}
async function note(msg, title) {
    (await clack()).note(msg, title || "");
}
