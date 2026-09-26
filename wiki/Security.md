# <img src="https://cdn.simpleicons.org/openssl/3FB950" width="28" valign="middle"> Security

![posture](https://img.shields.io/badge/posture-readable_before_launching-3FB950?labelColor=0B111C&style=flat-square)

> A session is a computer on the public internet with a password. Here
> is exactly what that means, and how to not become a story.

## The auth model

| Layer | Mechanism |
|---|---|
| Tunnel | Cloudflare HTTPS — the only public surface |
| Terminal page | basic auth (session user + password) |
| IDE page | password auth (code-server) |
| Desktop page | the VNC login, self-checked at boot |
| WebSocket | the same session password as the auth token |

- **Blank password = no auth.** Anyone with the URL gets a shell. Fine
  for a 1-minute demo; catastrophic for anything else
- Default push-trigger sessions use a test password; **always set a
  real one** for real use
- One password per session for everything — there is no per-user
  granularity

## What runs where

| Machine | What Giecko puts there |
|---|---|
| the runner | ttyd, code-server, tunnels, tmux, your packages |
| your laptop | nothing (web) — or the CLI's config and tokens (npm way) |
| Cloudflare | an encrypted tunnel, no content inspection |

The session uses the repository's `GITHUB_TOKEN` for saves (contents:
write on that repo only). It cannot touch your other repositories,
account settings, or secrets beyond the workflow's own scope.

## Your responsibilities

| Threat | Mitigation |
|---|---|
| URL leaks (chat, screenshot, history) | strong password; mask mode on stream; short duration |
| Malicious "viewers" | never run a blank-password session in a public repo's logs |
| secrets in the session | they live on the runner only while it lives; do not paste production keys into someone else's session |
| persistent home | `.ssh` keys go to the `giecko-home` branch — use a throwaway key |
| packages input | it runs `apt install` with what you type — you are the administrator, act like one |

## What Giecko does for you

- passwords are never echoed into logs or reports (masked as `on`/`off`)
- QR codes appear in logs — rotate the password if you streamed the log
- `giecko cancel` kills a session from your laptop the moment you want
- the runner dies by itself at the duration limit — no zombie exposure
- IDE telemetry off, update checks off, no marketplace accounts

## Threats that are just true

- A public URL + weak password **will** be found and used
- A session you walk away from is a public computer until it expires
- Anything you type into a session may end up in the run log (it is a
  GitHub Actions log) — including passwords you type into prompts

## Terms

The fine print lives in [TERMS](../TERMS.md). Short version: free
runners and tunnels are for hacking, learning and demos — not a VPS,
not mining, not 24/7 hosting.

---

← [Networking](Networking.md) · [Configuration](Configuration.md) →
