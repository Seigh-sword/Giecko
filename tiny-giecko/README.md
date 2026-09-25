# tiny-giecko

A native client for Giecko sessions, written in C99 with no runtime
dependencies. If a machine has internet and a display, tiny-giecko can
show your Giecko desktop on it — no browser needed.

The heavy lifting (terminal, VS Code, the desktop, the tunnel) already
happens in the GitHub Actions workflow. tiny-giecko is the same
experience on the client side: it speaks the session's WebSocket/VNC
protocol directly and draws the framebuffer itself.

## What works today

- `ws://` and `wss://` endpoints (the noVNC/websockify path your
  session URL uses), plus direct `vnc://host:port`
- Classic VNC authentication (security type 2): the DES
  challenge-response, including the VNC password bit-flip key setup
- Open sessions (security type 1)
- Raw framebuffer updates, headless verification mode and a Linux
  fbdev display backend (`/dev/fb0`, 32bpp)
- Built-in selftest: `tiny-giecko --selftest` runs the DES, SHA-1 and
  base64 known-answer vectors and prints PASS/FAIL for each

## Placeholders (honest list)

- macOS/ARD authentication (security type 30): the browser uses it on
  macOS, but macOS also offers type 2, which tiny-giecko uses — so
  macOS sessions still connect
- Tight, ZRLE and other encodings: only Raw is decoded
- Input (keyboard/mouse) is not sent yet: today it is a viewer
- The SDL backend and non-fbdev display paths are not implemented
- `wss://` needs an OpenSSL build (`make tls`); the default build
  refuses it with a clear message

## Usage

```
tiny-giecko <url> [--password PW] [--seconds N] [--display headless|fbdev]
tiny-giecko --selftest

url: vnc://host[:port] | ws://host[:port]/path | wss://host[:port]/path
```

Example against a live session:

```
tiny-giecko wss://something.trycloudflare.com/websockify --password 1234
```

The password is the first 8 characters of your session password (the
VNC protocol limit).

## Build

Native build (needs any C99 compiler):

```
make
```

With TLS (needs OpenSSL headers):

```
make tls
```

Run the protocol tests (starts a local mock RFB/WebSocket server):

```
make test
```

## The matrix

Every target cross-compiles with `zig cc` (install zig, then
`make <target>`); native targets also build with the platform cc:

| Target | Runs on |
|---|---|
| `make rasp0` `make rasp1` | Raspberry Pi Zero / 1 (armv6) |
| `make rasp2` | Raspberry Pi 2 (armv7) |
| `make rasp3` `make rasp4` `make rasp5` | Raspberry Pi 3/4/5 (aarch64) |
| `make linux-x86_64` `make linux-arm64` `make linux-arm` | any Linux |
| `make win64` `make win-arm64` | Windows |
| `make apple-silicon64` `make darwin-intel64` | macOS |
| `make freebsd-amd64` `make freebsd-arm64` | FreeBSD (build natively on the BSD box: zig ships no BSD libc for cross builds) |
| `make openbsd-amd64` `make netbsd-amd64` | OpenBSD, NetBSD (same: native builds) |
| `make android-arm64` | Android (needs an NDK to link, not in the CI matrix) |

`make matrix` builds everything the CI covers. The CI workflow
(`tiny-giecko.yml`) builds the whole matrix on every `[tiny]` push and
runs the protocol tests on Linux, macOS and Windows.

## Test credentials used by the mock

The mock server (`test/mock_server.py`) is dependency-free Python: it
serves raw RFB, WebSocket-wrapped RFB and TLS WebSocket, with the same
DES tables as the client (cross-checked against FIPS 81 vectors at
startup).
