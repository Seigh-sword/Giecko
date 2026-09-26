# Rooms

![type](https://img.shields.io/badge/type-guide-3FB950?labelColor=0B111C&style=flat-square)
![backing](https://img.shields.io/badge/backing-tmux-3FB950?labelColor=0B111C&style=flat-square)

> One session, several named workspaces. Each room is its own shell
> with its own working directory — like tabs for your runner.

## The idea

A session is one runner. Normally one terminal (`tmux` session
`giecko`) lives in it. Rooms add more: `scratch`, `builds`, `docs` —
each a full shell you can switch between instantly, from the terminal
or from the IDE panel.

## Commands

```bash
giecko room builds     # switch to "builds" (created if missing)
giecko rooms           # list rooms, * = current
giecko room scratch    # another one
giecko rooms
#  * scratch
#    builds
#    giecko
```

- Room names: letters, numbers, `_` and `-`
- Creating happens on first switch — `tmux new-session -A`
- Already inside tmux? the switch is seamless (`switch-client`),
  otherwise it attaches

## Per-room working directory

A room starts in the directory you created it from:

```bash
cd ~/projects/api && giecko room api
cd ~/projects/web && giecko room web
```

Two shells, two trees, one session, one URL.

## Rooms in the IDE

The [GIECKO extension](GIECKO-IDE.md) panel lists rooms with a switch
button — no terminal needed. The IDE's integrated terminal follows the
same tmux sessions.

## Rooms and saves

`giecko save` snapshots the **whole workspace** (all rooms share one
filesystem) to the run's work branch. Rooms are about shells, not
storage — see [Persistence](Persistence.md) for what happens to files.

## Desktop sessions

Rooms are a terminal/IDE concept. The desktop is one shared screen —
every tab sees the same pixels.

## Why not just tmux?

It is tmux — with names, a listing command, IDE integration, and no
`tmux ls | grep` archaeology. Use raw tmux freely underneath; rooms
are the friendly layer.

---

← [Session Commands](Session-Commands.md) · [Persistence](Persistence.md) →
