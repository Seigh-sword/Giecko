# <img src="https://cdn.simpleicons.org/json/3FB950" width="28" valign="middle"> Configuration

![file](https://img.shields.io/badge/config-.giecko.json-3FB950?labelColor=0B111C&style=flat-square)
![dir](https://img.shields.io/badge/dir-GIECKO_CONFIG_DIR-3FB950?labelColor=0B111C&style=flat-square)

> Three layers of configuration: the repo config file (what to launch),
> the config directory (accounts and history), and the session
> environment (facts the session knows about itself).

## 1. The repo config — `.giecko.json`

Created by `giecko init` in the current directory (or anywhere with
`--config PATH`). One project, one file:

```json
{
  "repo": "you/giecko-sessions",
  "account": "main",
  "username": "giecko",
  "auth": true,
  "password": null,
  "os": "ubuntu-latest",
  "distro": "runner",
  "mode": "ide",
  "mask": false,
  "cfToken": null,
  "duration": 180,
  "autosave": 15,
  "packages": ""
}
```

Every field is also a flag on `init` and `launch` — see
[CLI Reference](CLI-Reference.md).

## 2. The config directory

| Order | Location | Notes |
|---|---|---|
| 1 | `$GIECKO_CONFIG_DIR` | used as-is — the whole directory moves |
| 2 | `$XDG_CONFIG_HOME/giecko` | XDG standard |
| 3 | `~/.config/giecko` | default |

Inside it:

| File | Contents |
|---|---|
| `config.json` | accounts, tokens (mode 0600), accepted terms |
| `sessions/<run-id>/` | per-run records (URLs, branches) — what `giecko ls` reads |

The same override works **inside** sessions: the boot script writes
`giecko.env` to `$GIECKO_CONFIG_DIR/` when it is set, and the
in-session CLI looks there first.

## 3. The session environment

Written by the boot script to `/etc/giecko.env` (root) or
`~/.giecko.env` (or the config dir override). Full variable list:

| Variable | Meaning |
|---|---|
| `GIECKO_URL_TERM` / `GIECKO_URL_CODE` / `GIECKO_URL_DESK` | the session's public URLs |
| `GIECKO_RUN_ID` | the Actions run id |
| `GIECKO_REGION` | runner region (lag reality check) |
| `GIECKO_STACK` / `GIECKO_DISTRO` / `GIECKO_USER` | what was launched |
| `GIECKO_WORK_BRANCH` | the save branch for this run |
| `GIECKO_END_EPOCH` | unix time the runner dies (`giecko timeleft`) |
| `GIECKO_BOOT_SECS` | how long boot took |
| `GIECKO_AUTOSAVE_MIN` | autosave interval (0 = off) |
| `GIECKO_NAMED` | 1 when a named tunnel is used |
| `GIECKO_PERSIST` | 1 when the persistent home is on |

Scripts you write inside a session can rely on all of them.

## Launch-time environment (your laptop)

| Variable | Effect |
|---|---|
| `GIECKO_CONFIG_DIR` | move the CLI config directory |
| `GITHUB_TOKEN` | ambient token if you skip `giecko auth` |
| `CF_TUNNEL_TOKEN` | named-tunnel token for `giecko local` / sessions |
| `GIECKO_RESTORE` / `GIECKO_PLUGINS` | restore run / plugin list for local runs |

## Changing the session files in a repo

`giecko launch --reinstall` refreshes the workflow and scripts in the
repo from upstream; `--nr` keeps the repo's own versions. Files update
themselves by default — fork-and-edit is for
[Development](Development.md) people.

---

← [Security](Security.md) · [Workflow Inputs](Workflow-Inputs.md) →
