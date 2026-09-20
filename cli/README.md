# giecko (npm CLI)

*Giecko is spelled G-I-E-C-K-O. The IE is intentional, not a typo for "gecko".*

Turn GitHub Actions into a browser-accessible dev environment.

```
npm install -g giecko
giecko auth
giecko init
giecko launch
```

`giecko auth` saves GitHub tokens as named accounts.

`giecko init` creates a `.giecko.json` session config: repository (existing
or newly created, any org, public or private), username, password on/off,
runner OS, Linux distro, mode (cli = terminal link, ide = VS Code link, desktop = GUI OS),
URL naming (random or your own domain via a Cloudflare tunnel token),
hostname masking, session length, extra packages, and autosave interval.
Accepts the Giecko terms on first run.

`giecko launch` installs the Giecko workflow into the repository if needed,
shows the session plan (mask, URL naming, duration) for review before
dispatching, waits until the tunnels are live, then prints the
session URL with a QR code and opens it in a browser. Each session gets
its own `giecko-work/run-<id>` branch with the project files; the runner
itself lives elsewhere, so anything in the editor is safe to delete.

`giecko ls` lists recent sessions and save branches (plus local session
records). `giecko watch <run-id>` waits for one run to go live.
`giecko logs <run-id> [--tail N]` tails the runner log from your laptop. `giecko cancel [run-id]` stops a running
session. `giecko local` runs the stack on your own machine, no GitHub. `giecko update` / `giecko -upd`
updates the CLI and session files, `giecko plugin -i gcko.pkg-<name>` installs
session plugins, `giecko changelog` prints the changelog.

Every interactive prompt has a flag equivalent; see `giecko help`.
Pass --yes to launch without the review menu, --restore <run-id> to
continue a previous session's files. Session files update themselves on
launch; pass --nr to keep the existing ones.
Config and tokens live in `~/.config/giecko/config.json` (mode 0600).
Every launch writes a session record (plan, URLs, timestamps + a copy of
the config) to `~/.config/giecko/sessions/<run-id>/`. `giecko init
--config PATH` writes the session config anywhere you like.

Development:

```
cd cli
npm install
npm run build       # tsc: compile src/ to dist/
npm run check       # node --check over bin/ + dist/
npm run sync        # refresh bundled templates from the repo root
node bin/giecko.js help
```
