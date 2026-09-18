# 🦎 Giecko

*Giecko is spelled G-I-E-C-K-O. The IE is intentional, not a typo for "gecko".*

**Turn GitHub Actions into a virtual dev environment you open in your browser.**

Dispatch a workflow → it boots a runner, opens Cloudflare tunnels
(`https://something.trycloudflare.com`) → you visit the URL → you have
a real Linux **terminal** and/or **VS Code**. That's it. That's the crazy idea.
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
   - **stack**: `ide` (terminal + VS Code), `terminal` (shell only), `vscode` (VS Code only)
   - **os**: `ubuntu-latest` (recommended), `macos-latest`, or `windows-latest`
   - **distro**: runner OS directly, or a docker shell: `ubuntu`, `debian`, `fedora`, `arch`, `alpine`
   - **user**, **password** (blank = open session, your funeral), **mask** (streamer mode)
   - **duration** (default 180 min, max 360), extra packages, autosave
3. Wait ~30–60s, grab the URLs (and square QR codes) from the job summary
4. Open the links, log in → **you're in** 🎉

## 💻 Use it (npm CLI)

```bash
npm install -g giecko
giecko auth        # save a GitHub token as a named account (little TUI)
giecko init        # wizard: repo, account, user, auth, OS, distro, mode, mask
giecko launch      # install into the repo, dispatch, print URL + QR, open it
giecko ls          # recent sessions + save branches
```

`init`/`launch` ask everything interactively, and every question has a flag
too (`giecko help`). One config per directory (`.giecko.json`), tokens in
`~/.config/giecko/config.json` (0600). First run asks you to accept the
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
| `giecko` CLI | `giecko urls` · `giecko info` · **`giecko save`** (snapshot to `giecko-saves/run-<id>`) |
| Autosave | workspace snapshotted every N min (default 15, `0` = off) + once at shutdown |
| File transfer | `tsz file.zip` = download, `trz` = upload (drag-drop too), `sz`/`rz` fallback |
| Mask mode | hostnames hidden in output (`https://****.trycloudflare.com`); QR in logs still connects |
| QR codes | square half-block codes in logs + summary — scan with your phone 📱 |

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
| `[stack=terminal]` / `[stack=vscode]` | test a single stack |
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
  anyway). Stable URL = named tunnel + own domain (roadmap).
- Full terms: [TERMS.md](TERMS.md).

## 🗺️ Roadmap

- [x] VS Code in browser
- [x] File up/download (`trzsz`/`sz`)
- [x] `giecko save` + autosave
- [x] Self-test on push with published reports
- [x] Linux distro choice via docker
- [x] npm CLI (`auth`/`init`/`launch`)
- [x] Masked (streamer) mode + square QR codes
- [ ] Stable URL via named tunnel + your own domain
- [ ] macOS runner stable (needs testing)
- [ ] code-server inside the distro container (one shell everywhere)
- [ ] Pick runner region (needs self-hosted runners — the true lag fix)

## 🧩 How it works

| Piece | What it does |
|---|---|
| [`.github/workflows/giecko.yml`](.github/workflows/giecko.yml) | Manual dispatch + push self-test matrix, keeps runner alive up to 6h |
| [`scripts/giecko.sh`](scripts/giecko.sh) | Installs everything in parallel, starts services, opens tunnels, heartbeats, publishes reports |
| [`scripts/giecko`](scripts/giecko) | On-box CLI (`info`, `urls`, `save`) + laptop CLI (`up`, `ls`, `watch`) |
| [`cli/`](cli/) | The npm package: `auth`, `init`, `launch`, `ls`, `watch` with TUIs |
| [`TERMS.md`](TERMS.md) | Fair-use terms (accepted on first `init`/`launch`) |
| [`ttyd`](https://github.com/tsl0922/ttyd) | Real shell in `tmux` (host or `docker exec`) as a WebGL terminal |
| [`code-server`](https://github.com/coder/code-server) | Real VS Code |
| [`cloudflared`](https://github.com/cloudflare/cloudflared) | Quick Tunnels: each port → `https://*.trycloudflare.com`, no account |
| [`trzsz`](https://trzsz.github.io/) + `lrzsz` | File transfer straight through the terminal |

---

Built on a crazy idea on a Sunday. Made real the same Sunday. 🦎
