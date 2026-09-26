# File Transfer

![up](https://img.shields.io/badge/upload-drag_%C2%B7_drop-3FB950?labelColor=0B111C&style=flat-square)
![down](https://img.shields.io/badge/download-tsz-3FB950?labelColor=0B111C&style=flat-square)

> Files in and out of a session: drag them onto the terminal page, or
> pull them down with one command. trzsz is preinstalled.

## Download (session → you)

```bash
tsz report.pdf           # progress bar in the browser
tsz build/*.zip          # multiple files
```

The GIECKO Terminal page receives the transfer and saves it via the
browser. Fallback if trzsz is unavailable: `sz file` (lrzsz, also
installed).

## Upload (you → session)

| Way | How |
|---|---|
| Drag and drop | drop files **onto the terminal page** — the transfer starts |
| File picker | the terminal's upload action |
| Classic | `trz` then pick files (zmodem) |

Files land in the directory the shell is in.

## When you should not

| Bigger than | Better idea |
|---|---|
| ~50 MB | git (LFS if needed) — it survives the run |
| secrets | never through a session; see [Security](Security.md) |
| huge datasets | mount/clone from the source instead |

The tunnel is fine for tens of MB; zmodem over WebSocket tops out at
roughly DSL-era speeds. The workspace autosaves as git — binaries in
git are the slow path too.

## The terminal and the IDE

- **Terminal** — trzsz works out of the box (page + shell side)
- **IDE** — the built-in git, and drag-drop onto the editor file tree;
  the integrated terminal has trzsz as well

## Sanity checks

```bash
ls -la          # did it land?
df -h .         # space left on the runner
giecko save     # keep it after a transfer session
```

---

← [Persistence](Persistence.md) · [Networking](Networking.md) →
