# <img src="https://cdn.simpleicons.org/linux/3FB950" width="28" valign="middle"> GIECKO VNC

![server](https://img.shields.io/badge/python3-stdlib_only-3FB950?labelColor=0B111C&style=flat-square)
![port](https://img.shields.io/badge/port-7900-3FB950?labelColor=0B111C&style=flat-square)
![auth](https://img.shields.io/badge/auth-basic_(same_as_terminal)-3FB950?labelColor=0B111C&style=flat-square)
![deps](https://img.shields.io/badge/dependencies-zero-3FB950?labelColor=0B111C&style=flat-square)

> gieckoVNC is the console for the machine itself: a single-file
> python3 server that starts in the first second of the session and
> keeps watching the runner long after your shell, tmux and IDE have
> moved on. Boot replay, live kernel messages, every service log,
> live stats and a NEW SHELL button — in one page, from any browser.

## Why it exists

The [terminal](GIECKO-Terminal.md) and the [IDE](GIECKO-IDE.md) are
windows into your *session*. When tmux dies, when the shell hangs,
when boot fails before a tunnel ever opens — those windows go dark
exactly when you need them most.

gieckoVNC is a window into the *machine*. It is its own process with
its own tunnel, started before the terminal and kept alive by a
watchdog, so there is always one surface that shows the truth:

| Event | Terminal | IDE | Desktop | gieckoVNC |
|---|---|---|---|---|
| tmux killed | gone | gone | gone | alive, NEW SHELL fixes it |
| code-server crash | alive | gone | alive | alive, log on screen |
| boot failure (no tunnel up) | nothing to open | nothing to open | nothing to open | nothing to open |
| `sudo reboot` | gone | gone | gone | gone — [see the limit](#the-honest-limit) |

## Opening it

The console URL appears everywhere the other surfaces do:

- the Actions run summary — row **Console** in the table
- the boot banner and its QR code (square — scan it)
- `giecko urls` inside a session
- the env file, as `GIECKO_URL_CONSOLE`

Login is the same basic auth as the terminal: your `user` and
`password` inputs. In a no-password session the console is open too.
On Windows runners there is no console — it needs a unix runner.

## What is on the page

| Panel | Source | Notes |
|---|---|---|
| Boot | `boot.log` | replayed from byte zero — the full session start, even the parts that happened before the console started |
| Kernel | `dmesg --follow` | live, ISO timestamps; needs `sudo -n`, degrades to a retry message if not allowed |
| Service logs | every `*.log` in the run dir | terminal, vscode, desktop, tunnels, distro setup — tailed as they grow |
| Stats | `/proc` | uptime, load, memory, disk and a countdown of the session time left |
| NEW SHELL | button | kills your tmux *server*; the terminal's next keypress respawns a fresh one — nothing else is touched |

Filter chips narrow the stream to one source; FOLLOW toggles
auto-scroll; CLEAR wipes the screen (the server's history is kept, so
a reload or a reconnect picks up where the stream left off).

## How it stays alive

- **Started first** — the console comes up before the terminal, so
  early-boot problems are captured in its ring buffer
- **Own process, own tunnel** — it is not a child of tmux or the
  IDE; killing those leaves it untouched
- **Watchdog** — the session loop checks it every heartbeat and
  restarts it if it ever dies (see [Architecture](Architecture.md))
- **Reconnect without loss** — the stream is SSE with numbered
  events; the browser sends the last id it saw and the server fills
  the gap from its 6000-event ring buffer

## The honest limit

gieckoVNC survives every *process* in the session. It cannot survive
the *machine* going away: `sudo reboot`, the runner being reclaimed,
or the workflow job ending takes the VM — and everything on it —
down. No tool can see a machine that no longer exists; on hosted
GitHub runners that moment is simply outside anyone's reach. When it
happens, the console URL stops answering and the Actions log is the
only record left.

## Under the hood

One file, `scripts/giecko-vnc.py`, python3 standard library only —
no pip, no venv, nothing to install:

- `ThreadingHTTPServer` on `127.0.0.1:7900` (localhost only; the
  outside world reaches it through the same
  [Cloudflare quick tunnel](Networking.md) pattern as the other
  surfaces)
- `GET /` serves the page (and the gecko favicon) from memory
- `GET /events` is the stream: server-sent events with sequence ids
  and a keepalive every 5 s
- `POST /ctl` carries the NEW SHELL action — inside a distro box it
  targets the container's tmux, otherwise the session user's
- log tails are pollers (3 s) — inotify would be cleverer, polling
  is unbreakable

It runs as the session script user, not root: kernel messages are
fetched with `sudo -n dmesg` and simply retry if passwordless sudo
is not available on the runner.
