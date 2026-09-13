# 🦎 Giecko

**Turn GitHub Actions into a virtual Linux terminal you open in your browser.**

Dispatch a workflow → it boots a runner, opens a Cloudflare Quick Tunnel
(`https://something.trycloudflare.com`) → you visit the URL → you have a
real Linux shell. That's it. That's the whole crazy idea. And it works.

```
 You (browser) ──https──▶ *.trycloudflare.com ──tunnel──▶ cloudflared ──▶ ttyd ──▶ bash (in tmux)
                                ▲                                          ▲
                          free, no account                      GitHub Actions runner
                          needed, random URL                    (ubuntu-latest, ~6h max)
```

## 🚀 Use it

1. Go to the **Actions** tab → **🦎 Giecko Terminal** → **Run workflow**
2. Pick a **password** (default: `giecko`), a **duration** (default 180 min, max 360),
   and optional extra `apt` packages
3. Wait ~30–60s, then grab the URL from:
   - the job summary at the top of the run, **or**
   - the big `🦎 GIECKO IS LIVE!` banner in the logs
4. Open `https://<random>.trycloudflare.com` in your browser, log in with
   user `giecko` + your password → **you're in a Linux terminal** 🎉

## 🖥️ Try it locally (no Actions needed)

The same script runs on any Linux box:

```bash
./scripts/giecko.sh mysecret 60
# → opens a trycloudflare.com URL to a terminal on YOUR machine
```

## ✨ Why it's cool

- **Zero setup** — no SSH keys, no firewall rules, no Cloudflare account
- **Runs anywhere** — any GitHub repo, any laptop, any VPS
- **Persistent-ish shell** — the terminal runs inside `tmux`, so closing the
  browser tab doesn't kill your work; just reopen the URL
- **Customizable** — install anything via the `packages` input or just `apt install` live

## ⚠️ The fine print (read this)

- **It's public by URL.** Anyone who guesses/gets the random tunnel URL can
  reach the login prompt — always set a strong password. Blank password =
  literally a public shell. Don't do that unless it's a throwaway.
- **Ephemeral.** Runners die after max ~6 hours (`timeout-minutes: 360` is a
  GitHub limit) and the disk is wiped. `git push` your work or it never happened.
- **Play nice.** This uses GitHub's free runners + Cloudflare's free quick
  tunnels. Great for hacking around, learning Linux, demos, and "holy crap it
  works" moments. Not a free VPS replacement — heavy/abusive use will get
  rate-limited or ToS'd.
- **Quick tunnel URLs change every run.** They're random `trycloudflare.com`
  subdomains. Want a stable URL? That's the roadmap (named tunnels + a domain).

## 🗺️ Roadmap

- [ ] One-click **VS Code in browser** mode (`code-server`) alongside the terminal
- [ ] **File browser** mode for uploads/downloads
- [ ] Optional **named tunnel** (stable URL via your own Cloudflare account)
- [ ] QR code in the summary for opening on your phone
- [ ] `giecko` CLI: `giecko up --password ...` that dispatches the workflow via `gh`

## 🧪 Self-test on push

Every push to the default branch auto-starts a **10-minute test session**
(same workflow, throwaway password) — that way the tunnel is verified working
on every change. To skip it, put `[skip giecko]` in your commit message.

## 🧩 How it works

| Piece | What it does |
|---|---|
| [`.github/workflows/giecko.yml`](.github/workflows/giecko.yml) | Manual-dispatch workflow, keeps the runner alive up to 6h |
| [`scripts/giecko.sh`](scripts/giecko.sh) | Installs `ttyd` + `cloudflared`, starts them, prints the URL, heartbeats |
| [`ttyd`](https://github.com/tsl0922/ttyd) | Exposes a real `bash` (in `tmux`) as a web terminal on `localhost:7681` |
| [`cloudflared`](https://github.com/cloudflare/cloudflared) | Quick Tunnel: exposes that port as `https://*.trycloudflare.com`, no account needed |

---

Built on a crazy idea at 4pm on a Sunday. 🦎
