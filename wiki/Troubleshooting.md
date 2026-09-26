# Troubleshooting

![status](https://img.shields.io/badge/status-symptom_%E2%86%92_fix-3FB950?labelColor=0B111C&style=flat-square)

> The things that actually go wrong, and what to do about them.

## Boot and login

| Symptom | Cause | Fix |
|---|---|---|
| run fails at `cloudflared download failed` | network flake | re-run the workflow |
| `code-server extract failed` in the log | release/network hiccup mid-download | re-run; the fallback path retries next boot |
| page asks for password, rejects it | password > 8 chars on **external** VNC clients (macOS desktop) | use the **first 8 characters** in the VNC client; full password in the browser |
| IDE never comes up, terminal fine | IDE stack on a windows runner (IDE not bundled there yet) | use `stack=terminal` on windows, or an ubuntu/macos runner |
| boot takes minutes | far region + distro image pull | check the `region:` line; try `distro=runner` |
| `GIECKO IS LIVE` but the URL 404s | tunnel still warming (rare) | wait ~30s, refresh; check the run summary for updated URLs |

## During the session

| Symptom | Cause | Fix |
|---|---|---|
| typing lags | physics (you ↔ runner round trip) | see [Networking](Networking.md); IDE buffers better than terminal |
| tab froze / crashed | browser being a browser | reopen the URL — tmux kept the shell |
| terminal shows nothing after reconnect | you detached into a dead pane | `giecko rooms` then re-enter, or `tmux attach` |
| file upload stalls | zmodem over a far tunnel | prefer git for big things ([File Transfer](File-Transfer.md)) |
| `command not found: giecko` in a docker distro | CLI installs into the runner, distro PATH may differ | re-login or `source ~/.profile`; it is at `~/.local/bin/giecko` |
| desktop clipboard not syncing | noVNC panel collapsed | open the noVNC sidebar → clipboard icon |

## Saves and persistence

| Symptom | Cause | Fix |
|---|---|---|
| `giecko save` fails | no git identity in the session | `git config user.email` inside, or set it in persistent home |
| restore brought nothing | run id wrong or branch was never saved | `giecko ls` (laptop) lists branches; check the run's summary |
| persistent home skipped: `too big (NNMB)` | snapshot over 25 MB | clean `~/.cache` and big dotdirs, or leave persist off |
| home restored but settings gone | IDE user data lives in `~/.local/share/code-server` | it rides along only in the snapshot set — keep dotfiles lean |

## The runner itself

| Symptom | Cause | Fix |
|---|---|---|
| session died before the duration | job failure (packages input typo, disk) | read the tail of the run log; the report says `failed` with the last step |
| session died at exactly 6h | GitHub's cap | relaunch with `--restore` (the final save ran) |
| runner out of disk | huge packages or datasets | trim the `packages` input; keep data in git/LFS |

## Reading the logs

| Place | What you find |
|---|---|
| run summary (top of the run) | URLs, QR codes, boot time, region, countdown |
| annotations (`giecko-live`) | the moment the session became reachable |
| job log | the full boot: downloads, versions, checksums, services |
| session report (published files) | status, heartbeats, save branches |

The boot log prints sha256 checksums for every downloaded binary —
if you are ever unsure what ran, hash what you have.

Still stuck? [FAQ](FAQ.md) or open an issue with the run id.

---

← [Development](Development.md) · [FAQ](FAQ.md) →
