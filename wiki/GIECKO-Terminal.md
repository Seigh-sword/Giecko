# <img src="https://cdn.simpleicons.org/gnometerminal/3FB950" width="28" valign="middle"> GIECKO Terminal

![base](https://img.shields.io/badge/ttyd-1.7.7-3FB950?labelColor=0B111C&style=flat-square)
![libwebsockets](https://img.shields.io/badge/libwebsockets-4.3_static-3FB950?labelColor=0B111C&style=flat-square)
![binary](https://img.shields.io/badge/binary-~430KB-3FB950?labelColor=0B111C&style=flat-square)

> The terminal in every GIECKO session — ttyd rebuilt with the GIECKO
> UI, our favicon, xterm that fits any screen, and tmux underneath.

## What it is

A single static binary that serves a terminal over HTTPS/WebSocket.
Each session downloads it from our releases (a fraction of a second)
and runs it behind the tunnel. If our release is unreachable, the boot
script falls back to upstream ttyd — same protocol, plainer looks.

## What is different from stock ttyd

| Area | Stock | GIECKO Terminal |
|---|---|---|
| Page | ttyd demo page | GIECKO UI, GIECKO branding |
| Favicon | ttyd icon | the gecko, inlined (no extra request) |
| xterm.js | CDN scripts | inlined, with the Fit Addon |
| Mobile | usable-ish | layout that actually fits phones |
| Build | dynamic libs, SSL | static libwebsockets (SSL off — the tunnel provides TLS) |

## Features you will notice

- **Fit addon** — the terminal resizes to the window, on every device
- **tmux inside** — your shell survives tab crashes and phone lock
  screens; reconnect and it is where you left it
- **trzsz built in** — drag a file onto the page to upload; see
  [File Transfer](File-Transfer.md)
- **Writable / read-only** — the boot uses a writable session; the
  upstream `-W` flag exists for your own runs
- **Rooms** — multiple named terminals in one session via tmux, see
  [Rooms](Rooms.md)

## The protocol (for the curious)

```text
browser ── HTTPS (cloudflare tunnel) ──▶ ttyd :7681
          WebSocket, subprotocol "tty"

server frames:  "1" + title      "2" + preferences    "0" + output
client frames:  JSON init {columns, rows, AuthToken}  "0"/"1"/"2" + input
```

The auth token is the session password by default; the page prompts
via basic auth at the tunnel level as well.

## Reconnect behavior

The browser page reconnects automatically; the shell is in tmux, so a
crashed tab costs you nothing. Full offline periods (runner network
hiccups) also survive — as long as the runner lives, tmux lives.

## Building it yourself

```bash
./scripts/build-terminal.sh
```

Builds libwebsockets (static, SSL off, libuv on) and our ttyd fork, and
drops `ide/dist/giecko-terminal-<arch>` with a version check. Targets:
`x86_64`, `aarch64`, `darwin-amd64`, `darwin-arm64` (built in CI on
matching runners). See [Development](Development.md).

---

← [GIECKO IDE](GIECKO-IDE.md) · [Desktop Mode](Desktop-Mode.md) →
