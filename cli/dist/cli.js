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
exports.main = main;
const store = __importStar(require("./store"));
const auth = __importStar(require("./commands/auth"));
const init = __importStar(require("./commands/init"));
const launch = __importStar(require("./commands/launch"));
const ls = __importStar(require("./commands/ls"));
const watch = __importStar(require("./commands/watch"));
const logs = __importStar(require("./commands/logs"));
const cancel = __importStar(require("./commands/cancel"));
const local = __importStar(require("./commands/local"));
const update = __importStar(require("./commands/update"));
const plugin = __importStar(require("./commands/plugin"));
const changelog = __importStar(require("./commands/changelog"));
const HELP = `giecko - turn GitHub Actions into a browser-accessible dev environment

Usage:
  giecko auth [menu|list|add|use|remove|current] [options]
  giecko init [options]
  giecko launch [options]
  giecko ls [--repo owner/name]
  giecko watch <run-id> [--repo owner/name]
  giecko logs <run-id> [--repo owner/name] [--tail N]
  giecko cancel [run-id] [--repo owner/name]
  giecko local [options]
  giecko update [--self | --on | --off]
  giecko plugin -i <pkg> | -r <pkg> | -l
  giecko changelog

auth:
  save GitHub tokens as named accounts. Interactive when run as plain
  "giecko auth" in a terminal.
    add <name> --token TOKEN     save a token (omit --token to be prompted)
    list                         list accounts
    use <name>                   set the active account
    remove <name>                delete an account
    current                      show the active account

init:
  create a .giecko.json session config in the current directory.
  Every option is asked interactively unless passed as a flag.
    --config PATH        where to write the config (default: .giecko.json)
    --account NAME        saved account, or "none" for ambient gh auth
    --repo owner/name     existing repository to run sessions in
    --create NAME         create a new repository instead
    --org ORG             owner for --create (default: your user)
    --private | --public  visibility for --create (default: public)
    --username NAME       session login (default: giecko)
    --auth | --no-auth    session password on/off (default: off)
    --password PW         session password (empty = generate)
    --os OS               ubuntu-latest | macos-latest | windows-latest (default: ubuntu-latest)
    --distro D            runner | ubuntu | debian | fedora | arch | alpine
    --mode M              cli | ide | desktop (default: ide; single session link)
    --mask | --no-mask    hide the tunnel hostname in output (default: off)
    --cf-token TOKEN      use a named Cloudflare tunnel (custom hostname on your domain)
    --random-url          use a random trycloudflare.com URL (default)
    --duration MIN        session length 1-360 minutes (default: 180)
    --packages LIST       extra system packages, space-separated
    --autosave MIN        snapshot every N min, 0 = off (default: 15)
    --accept-terms        accept the Giecko terms without prompting
    --force               overwrite an existing config

launch:
  install Giecko into the repo if needed, show the session plan for
  review, dispatch the session, wait till
  it is live, print the URL and QR code.
    --config PATH         config file (default: .giecko.json)
    all init options work here as overrides, plus:
    --stack S             terminal | ide | vscode | desktop (overrides --mode)
    --restore RUN-ID      copy that run's saved files into the new session
    --duration MIN        session length, max 360 (default: 180)
    --packages "a b"      extra system packages
    --autosave MIN        workspace snapshot interval, 0 = off (default: 15)
    --reinstall           overwrite Giecko files in the repo (they update themselves by default)
    --nr                  no reinstall: keep the repo's existing Giecko files
    --open | --no-open    open the session URL in a browser (default: open)
    --dry-run             print the plan without touching anything
    --cf-token TOKEN      named Cloudflare tunnel (overrides the config)
    --random-url          random trycloudflare.com URL (overrides the config)
    --yes                 skip the interactive plan review
    --verbose             print each install/dispatch/poll step

ls / watch / logs / cancel:
  list recent sessions and save branches, wait for one run to go live,
  tail a run's log from your laptop, or cancel a running session (the
  latest one, or by run id).

local:
  run the whole stack on your own machine, no GitHub needed.
    --stack S             terminal | ide | desktop (default: terminal)
    --password PW         session password (default: generated and printed)
    --duration MIN        minutes to stay up (default: 120, max 360)
    --packages LIST       extra system packages
    --dry-run             print the command without running it

update / -upd:
  keep giecko current: checks npm for a newer CLI and refreshes the
  session files in your repo from upstream.
    --self      install the latest CLI from npm right now
    --on/--off  enable or disable the update check on launch

plugin:
  install npm packages into your sessions.
    -i <pkg>    install (the package must be tagged gcko.pkg-<name>)
    -r <pkg>    remove
    -l          list installed plugins

changelog:
  print the giecko changelog.

Config and tokens live in ~/.config/giecko/config.json (mode 0600).
Session records live in ~/.config/giecko/sessions/<run-id>/.
Full terms: TERMS.md in the Giecko repository.`;
async function main() {
    const argv = process.argv.slice(2);
    const cmd = argv[0];
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
        process.stdout.write(HELP + "\n");
        return;
    }
    if (cmd === "--version" || cmd === "-V") {
        const pkg = require("../package.json");
        process.stdout.write(pkg.version + "\n");
        return;
    }
    const cfg = store.load();
    const rest = argv.slice(1);
    if (cmd === "auth")
        return auth.run(rest, cfg, store);
    if (cmd === "init")
        return init.run(rest, cfg, store);
    if (cmd === "launch")
        return launch.run(rest, cfg, store);
    if (cmd === "ls")
        return ls.run(rest, cfg, store);
    if (cmd === "watch")
        return watch.run(rest, cfg, store);
    if (cmd === "logs")
        return logs.run(rest, cfg, store);
    if (cmd === "cancel")
        return cancel.run(rest, cfg, store);
    if (cmd === "local")
        return local.run(rest, cfg, store);
    if (cmd === "update" || cmd === "-upd")
        return update.run(rest, cfg, store);
    if (cmd === "plugin" || cmd === "plugins")
        return plugin.run(rest, cfg, store);
    if (cmd === "changelog")
        return changelog.run(rest, cfg, store);
    process.stderr.write(`Error: unknown command "${cmd}". Run "giecko help".` + "\n");
    process.exitCode = 1;
}
