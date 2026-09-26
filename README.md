# 🦎 Giecko

*Giecko is spelled G-I-E-C-K-O. The IE is intentional, not a typo for "gecko".*

**Turn GitHub Actions into a virtual dev environment you open in your browser.**

Dispatch a workflow → it boots a runner, opens Cloudflare tunnels
(`https://something.trycloudflare.com`) → you visit the URL → you have
a real Linux **terminal**, **VS Code**, or a **full desktop**. That's it.
That's the crazy idea.
And it works.

```
 You (browser) ──https──▶ *.trycloudflare.com ──tunnel──▶ cloudflared ─┬─▶ ttyd ──▶ bash (tmux, host or docker distro)
                                ▲                                      └─▶ code-server ──▶ VS Code
                          free, no account                      GitHub Actions runner
                          needed, random URLs                   (ubuntu/macos, ~6h max)
```

## 🚀 Use it (web)

1. Go to the **Actions** tab → **🦎 Giecko Terminal** → **Run workflow**
2. Pick your session:
   - **stack**: `ide` (terminal + VS Code), `terminal` (shell only), `vscode` (VS Code only), `desktop` (full GUI OS in the browser)
   - **os**: `ubuntu-latest` (recommended), `macos-latest`, or `windows-latest`
   - **distro**: runner OS directly, or a docker shell: `ubuntu`, `debian`, `fedora`, `arch`, `alpine`
   - **user**, **password** (blank = open session, your funeral), **mask** (streamer mode)
   - **cf_token** (optional): named Cloudflare tunnel for your own domain
   - **duration** (default 180 min, max 360), extra packages, autosave
3. Wait ~30–60s, grab the URLs (and square QR codes) from the job summary
4. Open the links, log in → **you're in** 🎉

## 💻 Use it (npm CLI)

```bash
npm install -g giecko
giecko auth        # save a GitHub token as a named account (little TUI)
giecko init        # wizard: repo, account, user, auth, OS, distro, mode, mask
giecko launch      # review the plan, install, dispatch, print URL + QR, open it
giecko ls          # recent sessions + save branches
giecko logs <run-id> # tail a run's log from your laptop
giecko cancel      # stop a running session
giecko local       # run it on your own machine, no GitHub
giecko update      # update CLI + session files (auto-check is on by default)
giecko plugin -i gcko.pkg-<name>   # install a session plugin
```

`init`/`launch` ask everything interactively, and every question has a flag
too (`giecko help`). One config per directory (`.giecko.json`; `giecko init
--config PATH` puts it anywhere you like), tokens in
`~/.config/giecko/config.json` (0600). Every launch records the session
under `~/.config/giecko/sessions/<run-id>/` (`giecko ls` lists them). First run asks you to accept the
[terms](TERMS.md) (type `yes`).

Prefer bash? `scripts/giecko` does `up`/`ls`/`watch` the same way —
`cp scripts/giecko ~/.local/bin/giecko`.

## 🐧 Distros & OS

| Choice | What you get |
|---|---|
| `runner` | The runner's own OS as your shell (fastest boot, ~25s) |
| `ubuntu` / `debian` / `fedora` / `arch` / `alpine` | That distro in docker, workspace mounted at `/work`, tmux + curl provisioned (+~30–60s boot) |
| `macos-latest` | Native macOS runner (docker distros unavailable) |
| `windows-latest` | Native Windows runner (Git Bash shell, docker distros unavailable) |

Notes: in `vscode`-only mode the editor's integrated terminals run on the
host even when a distro is set (same files, different shell). Distro shells
run as root inside the container — install whatever you want, it's all
thrown away in ≤6h anyway.

## URL naming: random or your own domain

By default every session gets random `*.trycloudflare.com` URLs: free,
no account needed, new names each run. Want stable URLs on your own
domain? Bring a Cloudflare named tunnel:

1. Cloudflare Zero Trust -> Networks -> Tunnels -> create a tunnel,
   copy its token
2. Route hostnames to it, e.g. `term.example.com -> http://localhost:7681`
   (terminal) and `code.example.com -> http://localhost:8080` (VS Code)
3. Pass the token: workflow input `cf_token`, or CLI flag `--cf-token`
   (also asked by `giecko init`, stored in `.giecko.json`)

One named tunnel serves the whole session; the hostnames are whatever
you routed in the dashboard. Random URLs stay the default.

## Desktop mode: the whole OS in your browser

Pick `desktop` as the stack (web input, `--stack desktop`, or `--mode
desktop` in `giecko init`) and the runner boots a real graphical desktop and puts it in your browser
with noVNC. On Linux that is XFCE on Xvfb; on macOS and Windows it is
the runner's actual desktop. You get apps, a terminal, a file manager —
a machine, not a tab.

- Works on every runner OS: Linux gets XFCE, macOS and Windows get
  the runner's real desktop over VNC
- Adds roughly a minute to boot
- The desktop asks for your session password. On **macOS** type the
  session username and the **full** password — the browser logs into a
  real macOS account. On **Windows and Linux** (and with external VNC
  clients on any OS) type only the password's **first 8 characters** (a
  VNC protocol limit)
- The screen is 1600x900 and scales to your window
- The terminal link still works alongside it, and `giecko save`
  snapshots the same workspace


## 🖥️ tiny-giecko: no browser needed

`tiny-giecko/` is a native client written in portable C99 with zero
runtime dependencies. If a machine has internet and a display, it can
show your Giecko desktop: it speaks the session's WebSocket/VNC
protocol directly (classic VNC DES auth included) and draws the
framebuffer itself. One codebase, one `make` per target:

```
make rasp0 rasp1 rasp2 rasp3 rasp4 rasp5     Raspberry Pi Zero to 5
make linux-x86_64 linux-arm64 linux-arm      any Linux
make win64 win-arm64                         Windows
make apple-silicon64 darwin-intel64          macOS
make freebsd-amd64 freebsd-arm64             FreeBSD
make openbsd-amd64 netbsd-amd64 android-arm64   and more
```

Cross-builds use `zig cc`; `make test` runs the protocol tests against
a local mock server, and CI builds the whole matrix on every `[tiny]`
push. Today it is a viewer (Raw encoding, headless + Linux fbdev
display); keyboard/mouse input and more encodings are on the way. See
`tiny-giecko/README.md`.

## 📱 Giecko on your phone

`mobile/` is the iOS and Android app (React Native + Expo): a guide,
one-tap session launch (runner OS, stack, password, duration), your
recent runs, and the session itself opening inside the app. The
`mobile.yml` workflow builds the Android APK on every `[mobile]` push
and attaches it to `v*` releases — check the repo's Releases page.

## 🔁 Tab crashed? Just reopen it

Sessions live on the runner, not in your tab: the shell runs in `tmux`
behind the tunnel. Close the tab, crash the browser, walk away — reopen
the URL (or `giecko ls` / `giecko watch`) and you are back in the same
shell, the same files, the same running processes.

## ⌨️ "Typing feels slow" — read this

Every keystroke in the raw terminal round-trips from you → the runner
(often US) → back. From India that's ~300ms per key. Physics. 🌍

What we did about it:
- The runner's **region is shown** at boot, so you know what you're dealing with
- **Use the VS Code URL for coding** — Monaco buffers keystrokes locally,
  so typing feels instant while execution stays remote. This is the real fix.
- Prefer **paste over typing** for big blobs

## 🧰 Inside the box

| Thing | Details |
|---|---|
| Shell | `bash` in `tmux`, 🦎 prompt, `ll` / `gs` / `save` aliases |
| Languages | `gcc`, `python3`, `node` preinstalled; `apt install` anything live |
| Tools | `git`, `tmux`, `htop`, `tree`, `jq`, `zip`, `sqlite3`, `fastfetch` |
| `giecko` CLI | `giecko urls` · `giecko info` · **`giecko save`** (snapshot to `giecko-saves/run-<id>`) · `giecko timeleft` · `giecko room NAME` · `giecko rooms` |
| Autosave | workspace snapshotted every N min (default 15, `0` = off) + once at shutdown |
| File transfer | `tsz file.zip` = download, `trz` = upload (drag-drop too), `sz`/`rz` fallback |
| Mask mode | hostnames hidden in output (`https://****.trycloudflare.com`); QR in logs still connects |
| QR codes | square half-block codes in logs + summary — scan with your phone 📱 |

## 🦎 GIECKO IDE + GIECKO Terminal

The VS Code in your session is **GIECKO IDE** — code-server remade: our
gecko branding and icons everywhere, Copilot and chat stripped
completely, Open VSX gallery, telemetry off, and 36 extensions bundled
(10+ languages, themes, icon themes, utilities). The status bar shows
run info + time left; the GIECKO panel (⌘/Ctrl+Shift+P → `GIECKO:
open panel`) has session URLs, QR codes, save / rooms / timeleft
buttons and opt-in autosave.

The terminal is **GIECKO Terminal** — ttyd remade with the same
treatment: GIECKO UI, gecko favicon, xterm that fits any screen
(phones included).

Sessions install both from this repo's releases first; upstream
code-server/ttyd stay as fallbacks. Build them yourself:

```bash
./scripts/build-terminal.sh   # → ide/dist/giecko-terminal-<arch>
bash ide/build-ide.sh         # → ide/dist/giecko-ide-<version>-<target>.tar.gz
```

**Persistent home** (opt in): tick `persist_home` when launching and
your dotfiles + config are snapshotted to the `giecko-home` branch and
restored on your next run.

## 🖥️ Try it locally (no Actions needed)

```bash
./scripts/giecko.sh mysecret 60 "" ide 0 myuser false runner
# args: password duration extras stack autosave user mask distro
# → opens trycloudflare.com URLs to YOUR machine
```

## 🧪 Self-test on push

Every push to the default branch auto-verifies. Reports land on the
`giecko-reports` branch (passwords never included; URLs included unless
masked), plus a status comment on the commit. Control via commit message:

| Flag | Effect |
|---|---|
| `[skip giecko]` | skip the test |
| `[quick]` | zero-wait check (~40s) instead of 10 min |
| `[noauth]` | blank password (tests open mode) |
| `[stack=terminal]` / `[stack=vscode]` / `[stack=desktop]` | test a single stack |
| `[distro=ubuntu]` (or debian/fedora/arch/alpine) | test that container |
| `[mask]` | test masked output |
| `[os=macos]` | test the macOS runner |
| `[os=windows]` | test the Windows runner |

## ⚠️ The fine print

- **It's public by URL.** Always set a strong password unless it's a
  throwaway. Blank password = literally a public computer.
- **Ephemeral.** Runners die after max ~6h and the disk is wiped.
  `giecko save` (or autosave) is your friend — but keep real work in git.
- **Play nice.** Free GitHub runners + free Cloudflare tunnels. Great for
  hacking, learning, demos, and "holy crap it works" moments — not a VPS.
  Don't mine crypto, don't be the reason free things get limited.
- **Tunnel URLs change every run** (unless masked, they're in logs/summary
  anyway). Stable URLs on your own domain: see URL naming above.
- Full terms: [TERMS.md](TERMS.md).

## 🗺️ Roadmap

- [x] VS Code in browser
- [x] File up/download (`trzsz`/`sz`)
- [x] `giecko save` + autosave
- [x] Self-test on push with published reports
- [x] Linux distro choice via docker
- [x] npm CLI (`auth`/`init`/`launch`)
- [x] Masked (streamer) mode + square QR codes
- [x] Named tunnel + your own domain (`--cf-token` / `cf_token` input)
- [ ] macOS runner stable (needs testing)
- [ ] code-server inside the distro container (one shell everywhere)
- [x] Desktop mode: the whole GUI OS in the browser (XFCE + noVNC)
- [x] CLI rewritten in TypeScript (cli/src, compiled with tsc)
- [x] `giecko cancel` — kill a session from your laptop
- [x] `giecko local` — the whole stack on your machine, no GitHub
- [x] `giecko launch --restore <run-id>` — continue a previous session's files
- [x] Desktop on every runner OS (macOS and Windows over VNC)
- [x] Auto-update + `giecko update` / `-upd`
- [x] Plugins (`gcko.pkg-*`) and `giecko changelog`
- [x] `giecko logs` — tail a run's log from your laptop
- [x] sha256 checksums for every downloaded binary (boot log + report)
- [x] Session records: `~/.config/giecko/sessions/<run-id>/`
- [x] Browser reconnect after a tab crash (tmux keeps the session)
- [x] Desktop favicon: lizard + repo avatar (noVNC)
- [x] ISC license
- [x] GIECKO IDE: code-server remade (gecko branding, no Copilot, 36 extensions)
- [x] GIECKO Terminal: ttyd remade (GIECKO UI, mobile friendly)
- [x] GIECKO IDE extension: panel, status bar countdown, in-IDE save/rooms
- [x] Named rooms: `giecko room NAME` + `giecko rooms`
- [x] `giecko timeleft` + end-time in the IDE status bar
- [x] Opt-in persistent home (`persist_home` → `giecko-home` branch)
- [x] Release automation: ide workflow builds + attaches terminal/IDE bundles; npm publish workflow (manual)
- [ ] Full plan: [ROADMAP.md](ROADMAP.md)

## 🧩 How it works

| Piece | What it does |
|---|---|
| [`.github/workflows/giecko.yml`](.github/workflows/giecko.yml) | Manual dispatch + push self-test matrix, keeps runner alive up to 6h |
| [`scripts/giecko.sh`](scripts/giecko.sh) | Installs everything in parallel, starts services, opens tunnels, heartbeats, publishes reports |
| [`scripts/giecko`](scripts/giecko) | On-box CLI (`info`, `urls`, `save`) + laptop CLI (`up`, `ls`, `watch`) |
| [`cli/`](cli/) | The npm package (TypeScript: `src/` compiled to `dist/`): `auth`, `init`, `launch`, `ls`, `watch`, `logs` with TUIs |
| [`TERMS.md`](TERMS.md) | Fair-use terms (accepted on first `init`/`launch`) |
| [`ttyd`](https://github.com/tsl0922/ttyd) | Real shell in `tmux` (host or `docker exec`) as a WebGL terminal |
| [`code-server`](https://github.com/coder/code-server) | Real VS Code |
| [`cloudflared`](https://github.com/cloudflare/cloudflared) | Quick Tunnels: each port → `https://*.trycloudflare.com`, no account |
| [`trzsz`](https://trzsz.github.io/) + `lrzsz` | File transfer straight through the terminal |
| [`noVNC`](https://github.com/novnc/noVNC) + `x11vnc` | Desktop mode: XFCE on Xvfb, in your browser |

---

Built on a crazy idea on a Sunday. Made real the same Sunday. 🦎
