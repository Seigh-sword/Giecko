# Stacks

![type](https://img.shields.io/badge/type-guide-3FB950?labelColor=0B111C&style=flat-square)

> One session, four shapes. Pick per launch — the same runner, the same
> URLs pattern, the same save system.

## The four stacks

| | Terminal | IDE | VS Code | Desktop |
|---|---|---|---|---|
| Icon | <img src="https://cdn.simpleicons.org/gnometerminal/3FB950" width="16"> | <img src="https://cdn.simpleicons.org/visualstudiocode/3FB950" width="16"> <img src="https://cdn.simpleicons.org/gnometerminal/3FB950" width="16"> | <img src="https://cdn.simpleicons.org/visualstudiocode/3FB950" width="16"> | <img src="https://cdn.simpleicons.org/linux/3FB950" width="16"> |
| What runs | GIECKO Terminal in tmux | GIECKO Terminal + GIECKO IDE | GIECKO IDE only | XFCE + noVNC (+ terminal, + IDE optional) |
| URLs | 1 | 2 | 1 | 1-3 |
| Boot time | fastest | fast | fast | slowest (GUI stack) |
| Memory fit | tiny | medium | medium | large |
| Use when | shell chores, servers, CI debugging | building software | writing/editing | GUI apps, browsers, experiments |

## How to pick one

- **Terminal** — you live in a shell and want it now
- **IDE** — the default; the best of both, one password, two tabs
- **VS Code** — same IDE, no terminal tab (cleaner for pair editing)
- **Desktop** — you need a GUI, not a text editor

## Setting the stack

**Workflow UI** — the `stack` input: `terminal` / `ide` / `vscode` /
`desktop`

**npm CLI** — `giecko init --mode cli|ide|desktop` or
`giecko launch --stack terminal|ide|vscode|desktop`

**Push trigger** — commit message tags:

```text
[stack=terminal]   [stack=vscode]   [stack=desktop]
```

See [Commit Triggers](Commit-Triggers.md) for the full list.

## Stack details

- [GIECKO Terminal](GIECKO-Terminal.md) — what the terminal stack gives you
- [GIECKO IDE](GIECKO-IDE.md) — what is inside the IDE
- [Desktop Mode](Desktop-Mode.md) — the GUI stack, VNC, and logins
- On macOS and Windows runners the desktop uses the real OS desktop
  over VNC; on Linux it is XFCE inside Xvfb

## Rules the stacks share

- login: one user + one password for every URL of the session
- all URLs are HTTPS via Cloudflare tunnels
- autosave, rooms, file transfer, and `giecko save` work everywhere
- the runner is the same machine — switching stack is a relaunch, not a
  setting (your saved files come along via `--restore`)

---

← [Architecture](Architecture.md) · [GIECKO IDE](GIECKO-IDE.md) →
