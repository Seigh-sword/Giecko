# <img src="https://cdn.simpleicons.org/raspberrypi/3FB950" width="28" valign="middle"> tiny-giecko

![lang](https://img.shields.io/badge/language-C99-3FB950?labelColor=0B111C&style=flat-square)
![deps](https://img.shields.io/badge/dependencies-zero-3FB950?labelColor=0B111C&style=flat-square)
![size](https://img.shields.io/badge/binary-small-3FB950?labelColor=0B111C&style=flat-square)

> A native client in portable C99 with no runtime dependencies. If a
> machine has internet and a display, it can show your Giecko desktop —
> no browser, no Node, no frameworks.

## Why it exists

Browsers are heavy. A Raspberry Pi Zero with a screen is not a browser
machine — but it is a perfectly good framebuffer. tiny-giecko speaks
the session's VNC protocol directly (including the classic VNC DES
authentication, implemented from the spec, FIPS test vectors in
`--selftest`), and draws the framebuffer itself.

## Targets (18 make targets)

```text
make rasp0 rasp1 rasp2 rasp3 rasp4 rasp5     Raspberry Pi Zero to 5
make linux-x86_64 linux-arm64 linux-arm      any Linux
make win64 win-arm64                         Windows
make apple-silicon64 darwin-intel64          macOS
make freebsd-amd64 freebsd-arm64              FreeBSD
make openbsd-amd64 netbsd-amd64 android-arm64  and more
```

Cross-builds go through `zig cc` — one toolchain, every target.

## Status

| Capability | State |
|---|---|
| VNC DES auth | done, self-tested |
| Raw encoding | done |
| Headless display | done |
| Linux fbdev display | done |
| Keyboard / mouse input | in progress |
| More encodings (Tight, ZRLE) | planned |

Today it is a **viewer** — perfect for dashboards, kiosks, and
"my session on the TV" moments. Input lands soon.

## Testing

- `make test` — protocol tests against a local mock server
- `./tiny-giecko --selftest` — FIPS DES vectors
- CI (`tiny-giecko.yml`) builds the whole cross matrix on `[tiny]`
  pushes and on `v*` tags

## Build and run

```bash
cd tiny-giecko
make linux-x86_64        # or your target
./build/tiny-giecko <session-url-or-host> --port 5900 --password <pw>
```

For VNC you need the session's desktop reachable (see
[Desktop Mode](Desktop-Mode.md) — on `giecko local` the VNC port is
open on your machine).

---

← [Mobile App](Mobile-App.md) · [CLI Reference](CLI-Reference.md) →
