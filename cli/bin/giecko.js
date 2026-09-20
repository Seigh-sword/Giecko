#!/usr/bin/env node
const store = require("../lib/store");

const HELP = `giecko - turn GitHub Actions into a browser-accessible dev environment

Usage:
  giecko auth [menu|list|add|use|remove|current] [options]
  giecko init [options]
  giecko launch [options]
  giecko ls [--repo owner/name]
  giecko watch <run-id> [--repo owner/name]
  giecko cancel [run-id] [--repo owner/name]
  giecko local [options]

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
    --force               overwrite an existing .giecko.json

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
    --reinstall           overwrite Giecko files in the repo
    --open | --no-open    open the session URL in a browser (default: open)
    --dry-run             print the plan without touching anything
    --cf-token TOKEN      named Cloudflare tunnel (overrides the config)
    --random-url          random trycloudflare.com URL (overrides the config)
    --yes                 skip the interactive plan review
    --verbose             print each install/dispatch/poll step

ls / watch / cancel:
  list recent sessions and save branches, wait for one run to go live, or
  cancel a running session (the latest one, or by run id).

local:
  run the whole stack on your own machine, no GitHub needed.
    --stack S             terminal | ide | desktop (default: terminal)
    --password PW         session password (default: generated and printed)
    --duration MIN        minutes to stay up (default: 120, max 360)
    --packages LIST       extra system packages
    --dry-run             print the command without running it

Config and tokens live in ~/.config/giecko/config.json (mode 0600).
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
  if (cmd === "auth") return require("../lib/commands/auth").run(rest, cfg, store);
  if (cmd === "init") return require("../lib/commands/init").run(rest, cfg, store);
  if (cmd === "launch") return require("../lib/commands/launch").run(rest, cfg, store);
  if (cmd === "ls") return require("../lib/commands/ls").run(rest, cfg, store);
  if (cmd === "watch") return require("../lib/commands/watch").run(rest, cfg, store);
  if (cmd === "cancel") return require("../lib/commands/cancel").run(rest, cfg, store);
  if (cmd === "local") return require("../lib/commands/local").run(rest, cfg, store);
  process.stderr.write(`Error: unknown command "${cmd}". Run "giecko help".\n`);
  process.exitCode = 1;
}

main().catch((e) => {
  process.stderr.write("Error: " + (e && e.message ? e.message : e) + "\n");
  process.exitCode = 1;
});
