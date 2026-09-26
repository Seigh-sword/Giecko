<p align="center">
  <img src="../assets/icons/gecko-256.png" width="120" alt="GIECKO">
</p>

<h1 align="center">GIECKO</h1>

<p align="center">
  <img src="https://img.shields.io/badge/GIECKO-0.7.0-3FB950?labelColor=0B111C&style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/license-ISC-3FB950?labelColor=0B111C&style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/platforms-linux%20%20macos%20%20windows-3FB950?labelColor=0B111C&style=flat-square" alt="platforms">
  <img src="https://img.shields.io/badge/runtime-GitHub_Actions-3FB950?labelColor=0B111C&style=flat-square&logo=githubactions&logoColor=white" alt="runtime">
</p>

<p align="center">
  <b>Turn GitHub Actions into a browser-accessible dev environment.</b><br>
  A terminal, a full IDE, or an entire desktop OS — booted from a workflow,<br>
  reachable from any browser, gone when you are done.
</p>

---

## What you get

| Stack | What it is | Best for |
|---|---|---|
| <img src="https://cdn.simpleicons.org/gnometerminal/3FB950" width="16"> **Terminal** | GIECKO Terminal — our remade ttyd, in tmux | quick shell work, servers, one-liners |
| <img src="https://cdn.simpleicons.org/visualstudiocode/3FB950" width="16"> **IDE** | GIECKO IDE — our remade code-server, terminal included | real coding sessions |
| <img src="https://cdn.simpleicons.org/visualstudiocode/3FB950" width="16"> **VS Code** | IDE without the terminal tab | focused editing |
| <img src="https://cdn.simpleicons.org/linux/3FB950" width="16"> **Desktop** | XFCE + noVNC — the whole GUI OS in the browser | GUI apps, browsers, experiments |

Every session gets public HTTPS URLs (random `trycloudflare.com` or your own
domain), QR codes for phones, login passwords, autosave of your work to git
branches, and a `giecko` CLI inside the session.

## Start here

| Path | How | Where |
|---|---|---|
| <img src="https://cdn.simpleicons.org/github/3FB950" width="16"> No install | Actions → *Giecko Terminal* → Run workflow | [Getting Started](Getting-Started.md) |
| <img src="https://cdn.simpleicons.org/npm/3FB950" width="16"> npm CLI | `npm install -g giecko` | [CLI Reference](CLI-Reference.md) |
| <img src="https://cdn.simpleicons.org/android/3FB950" width="16"> Phone | APK from the releases page | [Mobile App](Mobile-App.md) |
| <img src="https://cdn.simpleicons.org/raspberrypi/3FB950" width="16"> No browser | native C99 client | [tiny-giecko](tiny-giecko.md) |

## The wiki

**Basics** — [Getting Started](Getting-Started.md) · [Architecture](Architecture.md) · [Stacks](Stacks.md) · [Distros & OS](Distros.md) · [Networking](Networking.md)

**The apps** — [GIECKO IDE](GIECKO-IDE.md) · [GIECKO Terminal](GIECKO-Terminal.md) · [Desktop Mode](Desktop-Mode.md) · [Mobile App](Mobile-App.md) · [tiny-giecko](tiny-giecko.md)

**Working inside** — [Session Commands](Session-Commands.md) · [Rooms](Rooms.md) · [Persistence](Persistence.md) · [File Transfer](File-Transfer.md)

**Control from outside** — [CLI Reference](CLI-Reference.md) · [Configuration](Configuration.md) · [Workflow Inputs](Workflow-Inputs.md) · [Commit Triggers](Commit-Triggers.md)

**Under the hood** — [Security](Security.md) · [Releases](Releases.md) · [Development](Development.md)

**Help** — [Troubleshooting](Troubleshooting.md) · [FAQ](FAQ.md)

## The honest pitch

- It is free (public repos get free runners and Cloudflare tunnels)
- It is ephemeral (max ~6h, disk wiped, URLs change every run)
- It is public by URL (set a password, always)
- It is not a VPS (see [TERMS](../TERMS.md) and [Security](Security.md))

---

[Getting Started](Getting-Started.md) is three minutes away.
