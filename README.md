# 🦎 Giecko

**Turn GitHub Actions into a virtual dev environment you open in your browser.**

Dispatch a workflow → it boots a runner, opens Cloudflare tunnels
(`https://something.trycloudflare.com`) → you visit the URL → you have
a real Linux **terminal** + **VS Code**. That's it. That's the crazy idea.
And it works.

```
 You (browser) ──https──▶ *.trycloudflare.com ──tunnel──▶ cloudflared ─┬─▶ ttyd ──▶ bash (in tmux)
                                ▲                                      └─▶ code-server ──▶ VS Code
                          free, no account                      GitHub Actions runner
                          needed, random URLs                   (ubuntu, ~6h max)
```

## 🚀 Use it

1. Go to the **Actions** tab → **🦎 Giecko Terminal** → **Run workflow**
2. Pick a **stack** (`ide` = terminal + VS Code, `terminal` = terminal only),
   a **password**, a **duration** (default 180 min, max 360),
   optional extra `apt` packages, and autosave interval
3. Wait ~2–3 min, then grab the URLs from the job summary or the
   big `🦎 GIECKO IS LIVE!` banner in the logs
4. Open the links, log in with user `giecko` + your password → **you're in** 🎉
   - 🖥️ **terminal** — full Linux shell (runs in tmux: closing the tab is safe)
   - 💻 **vscode** — real VS Code in the browser, repo folder already open

## ⌨️ "Typing feels slow" — read this

Every keystroke in the raw terminal round-trips from you → the runner
(often US/EU) → back. From India that's ~300ms per key. Physics. 🌍

What we did about it:
- The runner's **region is shown** at boot, so you know what you're dealing with
- **Use the VS Code URL for coding** — Monaco buffers keystrokes locally,
  so typing feels instant while execution stays remote. This is the real fix.
- Prefer **paste over typing** for big blobs, and keep sessions short-lived

## 🧰 Inside the box

| Thing | Details |
|---|---|
| Shell | `bash` in `tmux`, 🦎 prompt, `ll` / `gs` / `save` aliases |
| Languages | `gcc`, `python3`, `node` preinstalled; `apt install` anything live |
| Tools | `git`, `tmux`, `htop`, `tree`, `jq`, `zip`, `sqlite3`, `fastfetch` |
| `giecko` CLI | `giecko urls` · `giecko info` · **`giecko save`** (snapshot workspace to `giecko-saves/run-<id>`) |
| Autosave | workspace snapshotted every N min (default 15, `0` = off) + once at shutdown |
| File transfer | `tsz file.zip` = download, `trz` = upload (drag-drop works too), `sz`/`rz` fallback |
| QR codes | scan the log to open sessions on your phone 📱 |

## 🖥️ Try it locally (no Actions needed)

```bash
./scripts/giecko.sh mysecret 60 "" ide 0
# → opens trycloudflare.com URLs to a terminal + VS Code on YOUR machine
```

## 💻 Laptop CLI: `giecko up`

Don't like clicking? Dispatch sessions from your terminal:

```bash
# one-time: put the CLI on your PATH (from your Giecko clone)
cp scripts/giecko ~/.local/bin/giecko

giecko up                                    # dispatch ide stack, 180 min
giecko up --stack terminal --duration 60     # terminal only, 1 hour
giecko up --password s3cret --packages "go"  # custom password + packages
giecko ls                                    # recent sessions + save branches
```

`giecko up` dispatches the workflow, waits till the tunnels are live
(reads the run's published report), prints the region/boot status, and opens
the run page where the tunnel URLs live. Needs the
[GitHub CLI](https://cli.github.com) logged in with the `workflow` scope
(`gh auth refresh -s workflow` if dispatch says 403).

## 🧪 Self-test on push

Every push to the default branch auto-starts a **10-minute `ide` session**
to verify the tunnels. Reports (URLs redacted) land on the
[`giecko-reports`](https://github.com/Seigh-sword/Giecko/tree/giecko-reports)
branch, plus a status comment on the commit itself. To skip: put `[skip giecko]`
in your commit message. For a fast 1-minute check instead of 10: `[quick]`.

## ⚠️ The fine print

- **It's public by URL.** Always set a strong password. Blank password =
  literally a public shell + public VS Code. Don't.
- **Ephemeral.** Runners die after max ~6h and the disk is wiped.
  `giecko save` (or autosave) is your friend — but it's a backup branch,
  not magic. Push real work to a real branch.
- **Play nice.** Free GitHub runners + free Cloudflare tunnels. Great for
  hacking, learning, demos, and "holy crap it works" moments — not a VPS.
- **Tunnel URLs change every run.** Stable URL = named tunnel + own domain (roadmap).

## 🗺️ Roadmap

- [x] VS Code in browser
- [x] File up/download (`trzsz`/`sz`)
- [x] `giecko save` + autosave
- [x] Self-test on push with published reports
- [ ] Optional **named tunnel** (stable URL via your own Cloudflare account)
- [ ] `giecko` CLI: dispatch/resume sessions via `gh` (`giecko up`, `giecko ls`)
- [ ] Pick runner region (needs self-hosted runners — the true lag fix)

## 🧩 How it works

| Piece | What it does |
|---|---|
| [`.github/workflows/giecko.yml`](.github/workflows/giecko.yml) | Manual dispatch + push self-test, keeps runner alive up to 6h |
| [`scripts/giecko.sh`](scripts/giecko.sh) | Installs everything in parallel, starts services, opens tunnels, heartbeats, publishes reports |
| [`scripts/giecko`](scripts/giecko) | On-box CLI: `info`, `urls`, `save` |
| [`ttyd`](https://github.com/tsl0922/ttyd) | Real `bash` in `tmux` as a WebGL terminal on `:7681` |
| [`code-server`](https://github.com/coder/code-server) | Real VS Code on `:8080` |
| [`cloudflared`](https://github.com/cloudflare/cloudflared) | Quick Tunnels: each port → `https://*.trycloudflare.com`, no account |
| [`trzsz`](https://trzsz.github.io/) + `lrzsz` | File transfer straight through the terminal |

---

Built on a crazy idea on a Sunday. Made good on the same Sunday. 🦎
