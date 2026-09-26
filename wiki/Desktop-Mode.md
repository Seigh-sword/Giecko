# <img src="https://cdn.simpleicons.org/linux/3FB950" width="28" valign="middle"> Desktop Mode

![stack](https://img.shields.io/badge/stack-desktop-3FB950?labelColor=0B111C&style=flat-square)
![gui](https://img.shields.io/badge/gui-XFCE_%2B_noVNC-3FB950?labelColor=0B111C&style=flat-square)

> The whole OS in a browser tab: XFCE on Linux, the real desktop on
> macOS and Windows, streamed over VNC through the same tunnels.

## What you get per OS

| Runner | Desktop | How it streams |
|---|---|---|
| ubuntu | XFCE inside Xvfb | x11vnc → noVNC in the browser |
| macos | the real macOS desktop (VNC enabled on a runner account) | macOS VNC server → noVNC |
| windows | the real Windows desktop (TightVNC service) | TightVNC → noVNC |

Same session password, same URL pattern (`.../vnc.html?autoconnect=true&resize=scale`).

## The browser experience

- **noVNC page** — connects automatically, scales to your window
- **Clipboard** — the noVNC clipboard panel syncs text both ways
- **Keyboard** — most shortcuts pass through; see the noVNC help panel
  for the escape hatch menu
- **Mobile** — pinch to zoom, drag to pan; rough but works

## External VNC clients

The tunnel only exposes the web endpoint. For native VNC clients,
point them at your own named-tunnel hostname (VNC port 5900 is not
published; quick tunnels are HTTP-only — use the browser, or run
`giecko local` on your own machine where 5900 is reachable).

<details>
<summary>Password quirk on macOS</summary>

Classic VNC DES auth truncates passwords to 8 characters. Through the
browser (noVNC) you type the **full** session password — the runner
provisions a real macOS account with it. External VNC clients that use
classic VNC auth must use the **first 8 characters**.
</details>

## Self-check at boot

Every desktop session verifies its own VNC login before going live and
reports it in the summary (`vnc_auth: ok`). If the check fails you see
it immediately in the boot log, not at first click.

## When to use it

- GUI apps: browsers, IDEs with windows, image tools, packet captures
- Testing on a "real" OS desktop without spinning up a VM
- Showing someone a demo in a link

When you do not need pixels, the [IDE](GIECKO-IDE.md) and
[Terminal](GIECKO-Terminal.md) stacks boot much faster.

## Desktop + rooms

Rooms (tmux) apply to the terminal side. The desktop is one shared
screen per session — several browser tabs see the same desktop.

---

← [GIECKO Terminal](GIECKO-Terminal.md) · [Distros & OS](Distros.md) →
