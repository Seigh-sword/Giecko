# <img src="https://cdn.simpleicons.org/cloudflare/3FB950" width="28" valign="middle"> Networking

![edge](https://img.shields.io/badge/edge-Cloudflare-3FB950?labelColor=0B111C&style=flat-square&logo=cloudflare&logoColor=white)

> Every session service is published over an HTTPS tunnel. Random
> subdomains by default, your own domain optionally, hostnames hidden
> when you stream.

## Random URLs (default)

Each service gets a **quick tunnel** with a random name:

```text
https://globe-damaged-resulted-les.trycloudflare.com     terminal
https://poems-sao-venues-duplicate.trycloudflare.com     IDE
```

- no account, no setup, instant
- new names every run — old links die with the session
- find them in the run summary, the `giecko-live` annotation, the
  in-session `giecko urls`, and QR codes

## Your own domain (named tunnel)

Give the session a Cloudflare named-tunnel token:

| Where | Field |
|---|---|
| Workflow UI | `cf_token` |
| npm CLI | `--cf-token` / `init --cf-token` |
| Session env | `CF_TUNNEL_TOKEN` |

Then your URLs are whatever hostnames you routed in Cloudflare —
stable, memorable, and the same every run. Create the tunnel once in
the Cloudflare dashboard (`cloudflared tunnel create`), route DNS,
paste the token at launch.

<details>
<summary>Why the summary says "your Cloudflare hostname" instead of a link</summary>

With a named tunnel the boot script cannot know your hostnames from
the token alone — connect on the domain you configured. QR codes are
skipped there (nothing to encode).
</details>

## Mask mode (streamer mode)

| Where | Setting |
|---|---|
| Workflow UI | `mask` |
| npm CLI | `--mask` |
| Push trigger | `[mask]` in the commit message |

Hostnames become `https://****.trycloudflare.com` in logs, summaries
and reports. The session still works; the QR in the raw log still
connects. Use it when you screen-share a session live.

## Latency — the honest part

Typing lag is the round trip **you → Cloudflare edge → runner → back**.
Nothing in the software can beat the speed of light:

- the runner region is printed at boot (`US/Virginia`, `US/Arizona`, ...)
- the IDE buffers keystrokes locally, so it feels better than the raw
  terminal on far runners
- the real fix is a [self-hosted runner](Development.md) near you
- GitHub does not let you choose regions for hosted runners — it is
  physics roulette

## What is exposed

| Exposed | Not exposed |
|---|---|
| the terminal page (with the session password) | the runner's GitHub token |
| the IDE page (same password) | the VNC port directly |
| the desktop web page (same password) | any other runner port |
| your session's public URLs in logs | your local machine (nothing runs there) |

All services bind to loopback on the runner; only the tunnels are
public. More in [Security](Security.md).

## Reconnects

Tunnels survive runner hiccups; the browser pages reconnect; tmux keeps
the shell. If a tunnel genuinely dies, the session report says so —
relaunching is the fix (a run is one machine, not a fleet).

---

← [File Transfer](File-Transfer.md) · [Security](Security.md) →
