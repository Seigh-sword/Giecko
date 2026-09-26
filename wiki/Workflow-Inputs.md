# <img src="https://cdn.simpleicons.org/githubactions/3FB950" width="28" valign="middle"> Workflow Inputs

![where](https://img.shields.io/badge/where-Actions_tab_%E2%86%92_Run_workflow-3FB950?labelColor=0B111C&style=flat-square)

> Every field of the *Giecko Terminal* workflow form, what it does, and
> its default.

## Session inputs

| Input | Type / values | Default | What it controls |
|---|---|---|---|
| `stack` | `ide` `terminal` `vscode` `desktop` | `ide` | what runs (see [Stacks](Stacks.md)) |
| `os` | `ubuntu-latest` `macos-latest` `windows-latest` | `ubuntu-latest` | runner OS (see [Distros](Distros.md)) |
| `distro` | `runner` `ubuntu` `debian` `fedora` `arch` `alpine` | `runner` | shell environment (linux only) |
| `user` | text, `[A-Za-z0-9_-]{1,16}` | `giecko` | login username |
| `password` | text | `giecko` | login password — **blank = no auth** |
| `mask` | boolean | `false` | hide tunnel hostnames in output |
| `duration_minutes` | number, max 360 | `180` | how long the runner lives |
| `packages` | text, space-separated | — | extra system packages (apt/brew) |
| `autosave_minutes` | number | `15` | workspace snapshot interval (0 = off) |
| `restore` | run id | — | copy that run's saved files in at boot |
| `plugins` | text, space-separated | — | npm packages tagged `gcko.pkg-<name>` |
| `cf_token` | Cloudflare tunnel token | — | named tunnel on your domain |
| `persist_home` | boolean | `false` | dotfiles snapshot to `giecko-home` |

## Positional form (`giecko.sh`)

The script behind the workflow takes the same things positionally:

```bash
./scripts/giecko.sh PASSWORD DURATION PACKAGES STACK AUTOSAVE USER MASK DISTRO PERSIST_HOME
```

(`giecko local` on your machine uses exactly this.)

## What is not configurable (by design)

| Thing | Why |
|---|---|
| runner region | GitHub assigns it; it is printed at boot |
| the tunnel provider | Cloudflare quick tunnels / your named tunnel |
| multiple sessions per run | one run is one machine — launch twice for two |
| port numbers | fixed (7681 / 8080 / 6080), and only loopback anyway |

## Defaults at a glance

```text
stack=ide  os=ubuntu  distro=runner  user=giecko  password=giecko
duration=180  autosave=15  mask=off  persist_home=off
```

Push-trigger sessions override these with commit-message tags — see
[Commit Triggers](Commit-Triggers.md).

---

← [Configuration](Configuration.md) · [Commit Triggers](Commit-Triggers.md) →
