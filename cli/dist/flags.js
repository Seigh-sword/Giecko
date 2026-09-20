"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
exports.str = str;
exports.bool = bool;
function parse(argv, defs) {
    const out = { _: [] };
    for (const [name, , def] of defs)
        out[name] = def;
    let i = 0;
    while (i < argv.length) {
        const a = argv[i];
        if (!a.startsWith("--")) {
            out._.push(a);
            i++;
            continue;
        }
        const eq = a.indexOf("=");
        const key = eq === -1 ? a.slice(2) : a.slice(2, eq);
        const def = defs.find((d) => d[0] === key);
        if (!def)
            throw new Error(`unknown flag: --${key}`);
        if (def[1] === "bool") {
            out[key] = true;
            i++;
            continue;
        }
        const val = eq === -1 ? argv[i + 1] : a.slice(eq + 1);
        if (eq === -1 && (val === undefined || String(val).startsWith("--"))) {
            throw new Error(`flag --${key} needs a value`);
        }
        out[key] = val;
        i += eq === -1 ? 2 : 1;
    }
    return out;
}
function str(v) {
    return v === undefined || v === null ? null : String(v);
}
function bool(v) {
    return v === true;
}
