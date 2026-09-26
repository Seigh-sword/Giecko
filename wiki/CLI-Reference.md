# <img src="https://cdn.simpleicons.org/npm/3FB950" width="28" valign="middle"> CLI Reference

![package](https://img.shields.io/badge/npm-giecko-3FB950?labelColor=0B111C&style=flat-square&logo=npm&logoColor=white)
![lang](https://img.shields.io/badge/language-TypeScript-3FB950?labelColor=0B111C&style=flat-square&logo=typescript&logoColor=white)
![node](https://img.shields.io/badge/node-%3E%3D18-3FB950?labelColor=0B111C&style=flat-square&logo=node.js&logoColor=white)

> The laptop-side CLI: configure once per project, then launch, watch
> and control sessions without the browser.

```bash
npm install -g giecko
```

## Commands

| Command | One line |
|---|---|
| `giecko auth` | save GitHub tokens as named accounts |
| `giecko init` | create `.giecko.json` (wizard or flags) |
| `giecko launch` | install, review the plan, dispatch, wait, print URL + QR |
| `giecko ls` | recent sessions + save branches |
| `giecko watch <run-id>` | wait for a run to go live |
| `giecko logs <run-id>` | tail a run's log from your laptop |
| `giecko cancel [run-id]` | stop a session (latest, or by id) |
| `giecko local` | the whole stack on your own machine |
| `giecko update` | update CLI + session files |
| `giecko plugin` | install session npm plugins (`gcko.pkg-*`) |
| `giecko changelog` | print the changelog |

## auth

```text
giecko auth                          interactive menu
giecko auth add <name> --token T     save a token (prompts if omitted)
giecko auth list                     list accounts
giecko auth use <name>               set the active account
giecko auth remove <name>            delete an account
giecko auth current                  show the active account
```

Tokens live in `~/.config/giecko/config.json` with mode 0600 (see
[Configuration](Configuration.md)). With no account, the CLI uses your
ambient `gh` / `GITHUB_TOKEN` auth.

## init

Creates `.giecko.json` in the current directory. Every question is also
a flag:

| Flag | Values / default |
|---|---|
| `--config PATH` | config file location (default `.giecko.json`) |
| `--account NAME` | saved account, or `none` for ambient gh auth |
| `--repo owner/name` | existing repository for sessions |
| `--create NAME` | create a new repository instead |
| `--org ORG` | owner for `--create` |
| `--private` / `--public` | visibility for `--create` |
| `--username NAME` | session login (default `giecko`) |
| `--auth` / `--no-auth` | password on/off (default off) |
| `--password PW` | the password (empty = generate) |
| `--os OS` | `ubuntu-latest` / `macos-latest` / `windows-latest` |
| `--distro D` | `runner` `ubuntu` `debian` `fedora` `arch` `alpine` |
| `--mode M` | `cli` / `ide` / `desktop` |
| `--mask` / `--no-mask` | hide hostnames in output |
| `--cf-token TOKEN` | named Cloudflare tunnel |
| `--random-url` | random trycloudflare.com URL (default) |
| `--duration MIN` | 1-360 (default 180) |
| `--packages LIST` | extra system packages |
| `--autosave MIN` | snapshot interval, 0 = off (default 15) |
| `--accept-terms` | accept the terms without prompting |
| `--force` | overwrite an existing config |

## launch

Reviews the plan, installs Giecko into the repo if needed, dispatches
the session, waits until it is live, prints the URL and QR code, and
opens the browser. All `init` flags work as overrides, plus:

| Flag | Effect |
|---|---|
| `--stack S` | `terminal` / `ide` / `vscode` / `desktop` (overrides `--mode`) |
| `--restore RUN-ID` | copy that run's saved files into the new session |
| `--reinstall` | refresh the repo's Giecko files from upstream |
| `--nr` | keep the repo's existing Giecko files untouched |
| `--open` / `--no-open` | open the URL in a browser (default open) |
| `--dry-run` | print the plan, change nothing |
| `--yes` | skip the interactive review |
| `--verbose` | print every install/dispatch/poll step |

## local

The whole stack on your machine, no GitHub:

```bash
giecko local --stack ide --duration 120
```

| Flag | Default |
|---|---|
| `--stack S` | `terminal` |
| `--password PW` | generated and printed |
| `--duration MIN` | 120 (max 360) |
| `--packages LIST` | — |
| `--dry-run` | print the command only |

## update / -upd

| Form | Effect |
|---|---|
| `giecko update` | check npm for a newer CLI, refresh session files |
| `giecko update --self` | install the latest CLI right now |
| `giecko update --on` / `--off` | toggle the launch-time check |

## plugin

```bash
giecko plugin -i gcko.pkg-<name>     install
giecko plugin -r gcko.pkg-<name>     remove
giecko plugin -l                     list
```

Plugins are npm packages the session installs at boot.

## ls / watch / logs / cancel

```bash
giecko ls --repo you/repo
giecko watch 36252138043
giecko logs 36252138043 --tail 50
giecko cancel
```

`ls` reads your local session records
(`~/.config/giecko/sessions/`), so it works offline.

## Exit codes and quiet use

The CLI is script-friendly: `--yes --no-open --dry-run` compose, and
launch prints the session URL on the last line when it succeeds.

---

← [tiny-giecko](tiny-giecko.md) · [Session Commands](Session-Commands.md) →
