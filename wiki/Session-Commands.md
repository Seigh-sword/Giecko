# <img src="https://cdn.simpleicons.org/zsh/3FB950" width="28" valign="middle"> Session Commands

![where](https://img.shields.io/badge/where-inside_the_session-3FB950?labelColor=0B111C&style=flat-square)
![name](https://img.shields.io/badge/command-giecko-3FB950?labelColor=0B111C&style=flat-square)

> The `giecko` CLI that lives inside every session — everything the UI
> can do, from the shell.

## The commands

| Command | What it does |
|---|---|
| `giecko info` | run id, region, stack, user, distro, work branch |
| `giecko urls` | this session's URLs (terminal / IDE / desktop) |
| `giecko save` | snapshot the workspace to `giecko-work/run-<id>` |
| `giecko timeleft` | minutes until the runner dies (from `GIECKO_END_EPOCH`) |
| `giecko room NAME` | switch to (or create) a named [room](Rooms.md) |
| `giecko rooms` | list rooms, `*` marks the one you are in |
| `giecko persist` | persistent-home help and status |
| `giecko up`, `giecko ls`, `giecko watch` | runner-side run info |
| `giecko` or `giecko help` | the list |

## Examples

```bash
giecko info
#  run: 36252138043
#    region: US/Virginia
#    stack: ide ...

giecko timeleft
#  173 minutes left

giecko save
#  saved to giecko-work/run-36252138043 (12 files)

giecko room scratch
#  switched to room scratch (new)

giecko rooms
#  * scratch
#    giecko
```

## Aliases ready in the shell

| Alias | Expands to |
|---|---|
| `ll` | `ls -la` |
| `gs` | `git status --short --branch` |
| `save` | `giecko save` |

## How it knows things

The boot script writes an env file — `$GIECKO_CONFIG_DIR/giecko.env`
if set, `/etc/giecko.env`, or `~/.giecko.env` — with every session
fact:

```text
GIECKO_URL_TERM='https://....trycloudflare.com'
GIECKO_URL_CODE='https://....trycloudflare.com'
GIECKO_RUN_ID='36252138043'
GIECKO_REGION='US/Virginia'
GIECKO_STACK='ide'
GIECKO_WORK_BRANCH='giecko-work/run-36252138043'
GIECKO_END_EPOCH='1790000000'
...
```

`giecko` sources it at startup; the
[GIECKO IDE extension](GIECKO-IDE.md) reads the same file as a fallback.
The full variable list lives in [Configuration](Configuration.md).

## tmux essentials

The shell runs inside tmux (that is why tab crashes are free):

| Keys | Action |
|---|---|
| `Ctrl-b` `d` | detach (the session keeps running) |
| `Ctrl-b` `[` | scrollback (q to exit) |
| `Ctrl-b` `c` | new window |
| `Ctrl-b` `%` | split right |
| `tmux attach` | back in after a disconnect |

Rooms (`giecko room`) are tmux sessions under the hood — see
[Rooms](Rooms.md).

---

← [tiny-giecko](tiny-giecko.md) · [Rooms](Rooms.md) →
