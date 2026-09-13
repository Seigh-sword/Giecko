const fs = require("fs");
const os = require("os");
const path = require("path");

function configDir() {
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "giecko");
  return path.join(os.homedir(), ".config", "giecko");
}

function configPath() {
  return path.join(configDir(), "config.json");
}

function blank() {
  return { accounts: {}, activeAccount: null, passwords: {}, termsAccepted: null };
}

function load() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return blank();
  }
  if (!data || typeof data !== "object") return blank();
  if (!data.accounts || typeof data.accounts !== "object") data.accounts = {};
  if (!data.passwords || typeof data.passwords !== "object") data.passwords = {};
  return data;
}

function save(data) {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}

function tokenFor(cfg, name) {
  if (!name) {
    if (cfg.activeAccount && cfg.accounts[cfg.activeAccount]) return cfg.accounts[cfg.activeAccount].token;
    return null;
  }
  if (!cfg.accounts[name]) throw new Error(`no account named "${name}" (see: giecko auth list)`);
  return cfg.accounts[name].token;
}

module.exports = { load, save, tokenFor, configPath };
