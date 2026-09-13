const { parse } = require("../flags");
const { interactive, needTTY, pick, askText, askSecret, intro, outro } = require("../ui");
const { haveGh, ghAuthOk } = require("../run");

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
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) throw new Error("account name: letters, numbers, _ . - (max 64)");
  if (!token) throw new Error("empty token");
  if (!haveGh()) throw new Error("need the GitHub CLI: https://cli.github.com");
  if (!ghAuthOk(token)) throw new Error("GitHub rejected that token");
  cfg.accounts[name] = { token };
  if (!cfg.activeAccount) cfg.activeAccount = name;
  store.save(cfg);
  process.stdout.write(`saved account "${name}"${cfg.activeAccount === name ? " (active)" : ""}\n`);
}

async function cmdMenu(cfg, store) {
  await intro("giecko auth");
  const action = await pick("Accounts", [
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
    const name = await askText("Account name", "");
    const token = await askSecret("GitHub token (needs repo + workflow scopes)");
    saveToken(cfg, store, (name || "").trim(), (token || "").trim());
    await outro("done");
    return;
  }
  const list = names(cfg);
  if (!list.length) throw new Error("no accounts yet; add one first");
  const name = await pick(action === "use" ? "Use which account" : "Remove which account", list.map((n) => ({ value: n, label: n + (n === cfg.activeAccount ? " (active)" : "") })));
  if (action === "use") {
    cfg.activeAccount = name;
    store.save(cfg);
    await outro(`active account: ${name}`);
    return;
  }
  delete cfg.accounts[name];
  if (cfg.activeAccount === name) cfg.activeAccount = names(cfg)[0] || null;
  store.save(cfg);
  await outro(`removed account: ${name}`);
}

async function run(argv, cfg, store) {
  const f = parse(argv, [["token", "str", null]]);
  const sub = f._[0] || (interactive() ? "menu" : "list");
  const arg = f._[1];
  if (sub === "menu") {
    needTTY("a subcommand (add|list|use|remove)");
    return cmdMenu(cfg, store);
  }
  if (sub === "list") return cmdList(cfg);
  if (sub === "current") {
    process.stdout.write((cfg.activeAccount || "(none)") + "\n");
    return;
  }
  if (sub === "use") {
    const name = arg || (() => { throw new Error("usage: giecko auth use <name>"); })();
    if (!cfg.accounts[name]) throw new Error(`no account named "${name}"`);
    cfg.activeAccount = name;
    store.save(cfg);
    process.stdout.write(`active account: ${name}\n`);
    return;
  }
  if (sub === "remove") {
    const name = arg || (() => { throw new Error("usage: giecko auth remove <name>"); })();
    if (!cfg.accounts[name]) throw new Error(`no account named "${name}"`);
    delete cfg.accounts[name];
    if (cfg.activeAccount === name) cfg.activeAccount = names(cfg)[0] || null;
    store.save(cfg);
    process.stdout.write(`removed account: ${name}\n`);
    return;
  }
  if (sub === "add") {
    const name = arg || (await (async () => { needTTY("<name>"); return (await askText("Account name", "")).trim(); })());
    let token = f.token;
    if (!token) {
      needTTY("--token");
      token = (await askSecret("GitHub token (needs repo + workflow scopes)")).trim();
    }
    saveToken(cfg, store, (name || "").trim(), (token || "").trim());
    return;
  }
  throw new Error(`unknown auth command "${sub}" (see: giecko help)`);
}

module.exports = { run };
