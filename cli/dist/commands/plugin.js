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
function readConfig(p) {
    if (!fs.existsSync(p))
        return {};
    return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeConfig(p, conf) {
    fs.writeFileSync(p, JSON.stringify(conf, null, 2) + "\n");
}
function validPluginId(id) {
    return /^gcko\.pkg(-[a-z0-9][a-z0-9._-]*)?$/i.test(String(id || ""));
}
async function run(argv, cfg, store) {
    const norm = [];
    let mode = null;
    for (const a of argv) {
        if (a === "-i" || a === "install" || a === "--install")
            mode = "i";
        else if (a === "-r" || a === "remove" || a === "--remove")
            mode = "r";
        else if (a === "-l" || a === "list" || a === "--list" || a === "ls")
            mode = "l";
        else
            norm.push(a);
    }
    const f = (0, flags_1.parse)(norm, [["config", "str", ".giecko.json"]]);
    const conf = readConfig((0, flags_1.str)(f.config) || ".giecko.json");
    const plugins = Array.isArray(conf.plugins) ? conf.plugins : [];
    const m = mode || "l";
    if (m === "l") {
        if (!plugins.length)
            process.stdout.write("no plugins installed. Add one: giecko plugin -i gcko.pkg-<name>\n");
        else
            plugins.forEach((p) => process.stdout.write(p + "\n"));
        return;
    }
    const id = f._[0];
    if (!id)
        throw new Error("usage: giecko plugin -i <package> | -r <package> | -l");
    if (!validPluginId(id))
        throw new Error('invalid id: "' + id + '". plugin packages must be tagged gcko.pkg-<name>');
    if (m === "i") {
        if (!plugins.includes(id))
            plugins.push(id);
        conf.plugins = plugins;
        writeConfig((0, flags_1.str)(f.config) || ".giecko.json", conf);
        process.stdout.write("installed plugin " + id + " (applies from the next launch)\n");
    }
    else {
        const idx = plugins.indexOf(id);
        if (idx === -1)
            throw new Error("plugin not installed: " + id);
        plugins.splice(idx, 1);
        conf.plugins = plugins;
        writeConfig((0, flags_1.str)(f.config) || ".giecko.json", conf);
        process.stdout.write("removed plugin " + id + "\n");
    }
}
