"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const flags_1 = require("../flags");
const ui_1 = require("../ui");
const run_1 = require("../run");
function names(cfg) {
    return Object.keys(cfg.accounts);
}
function cmdList(cfg) {
    const list = names(cfg);
    if (!list.length) {
        process.stdout.write("no accounts yet. Add one: giecko auth add <name> --token TOKEN\n");
        return;
    }
    for (const n of list) {
        process.stdout.write((n === cfg.activeAccount ? "* " : "  ") + n + "\n");
    }
}
function saveToken(cfg, store, name, token) {
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name))
        throw new Error("account name: letters, numbers, _ . - (max 64)");
    if (!token)
        throw new Error("empty token");
    if (!(0, run_1.haveGh)())
        throw new Error("need the GitHub CLI: https://cli.github.com");
    if (!(0, run_1.ghAuthOk)(token))
        throw new Error("GitHub rejected that token");
    cfg.accounts[name] = { token };
    if (!cfg.activeAccount)
        cfg.activeAccount = name;
    store.save(cfg);
    process.stdout.write(`saved account "${name}"${cfg.activeAccount === name ? " (active)" : ""}\n`);
}
async function cmdMenu(cfg, store) {
    await (0, ui_1.intro)("giecko auth");
    const action = await (0, ui_1.pick)("Accounts", [
        { value: "use", label: "Use an account" },
        { value: "add", label: "Add a new account" },
        { value: "remove", label: "Remove an account" },
        { value: "list", label: "List accounts" },
    ]);
    if (action === "list") {
        cmdList(cfg);
        return;
    }
    if (action === "add") {
        const name = await (0, ui_1.askText)("Account name", "");
        const token = await (0, ui_1.askSecret)("GitHub token (needs repo + workflow scopes)");
        saveToken(cfg, store, (name || "").trim(), (token || "").trim());
        await (0, ui_1.outro)("done");
        return;
    }
    const list = names(cfg);
    if (!list.length)
        throw new Error("no accounts yet; add one first");
    const name = await (0, ui_1.pick)(action === "use" ? "Use which account" : "Remove which account", list.map((n) => ({ value: n, label: n + (n === cfg.activeAccount ? " (active)" : "") })));
    if (action === "use") {
        cfg.activeAccount = name;
        store.save(cfg);
        await (0, ui_1.outro)(`active account: ${name}`);
        return;
    }
    delete cfg.accounts[name];
    if (cfg.activeAccount === name)
        cfg.activeAccount = names(cfg)[0] || null;
    store.save(cfg);
    await (0, ui_1.outro)(`removed account: ${name}`);
}
async function run(argv, cfg, store) {
    const f = (0, flags_1.parse)(argv, [["token", "str", null]]);
    const sub = f._[0] || ((0, ui_1.interactive)() ? "menu" : "list");
    const arg = f._[1];
    if (sub === "menu") {
        (0, ui_1.needTTY)("a subcommand (add|list|use|remove)");
        return cmdMenu(cfg, store);
    }
    if (sub === "list")
        return cmdList(cfg);
    if (sub === "current") {
        process.stdout.write((cfg.activeAccount || "(none)") + "\n");
        return;
    }
    if (sub === "use") {
        const name = arg || (() => { throw new Error("usage: giecko auth use <name>"); })();
        if (!cfg.accounts[name])
            throw new Error(`no account named "${name}"`);
        cfg.activeAccount = name;
        store.save(cfg);
        process.stdout.write(`active account: ${name}\n`);
        return;
    }
    if (sub === "remove") {
        const name = arg || (() => { throw new Error("usage: giecko auth remove <name>"); })();
        if (!cfg.accounts[name])
            throw new Error(`no account named "${name}"`);
        delete cfg.accounts[name];
        if (cfg.activeAccount === name)
            cfg.activeAccount = names(cfg)[0] || null;
        store.save(cfg);
        process.stdout.write(`removed account: ${name}\n`);
        return;
    }
    if (sub === "add") {
        let name;
        if (arg)
            name = arg;
        else {
            (0, ui_1.needTTY)("<name>");
            name = await (0, ui_1.askText)("Account name", "");
        }
        let token = (0, flags_1.str)(f.token);
        if (!token) {
            (0, ui_1.needTTY)("--token");
            token = (await (0, ui_1.askSecret)("GitHub token (needs repo + workflow scopes)")).trim();
        }
        saveToken(cfg, store, (name || "").trim(), (token || "").trim());
        return;
    }
    throw new Error(`unknown auth command "${sub}" (see: giecko help)`);
}
