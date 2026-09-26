# <img src="https://cdn.simpleicons.org/github/3FB950" width="28" valign="middle"> Getting Started

![time](https://img.shields.io/badge/time-~3_minutes-3FB950?labelColor=0B111C&style=flat-square)
![need](https://img.shields.io/badge/need-a_GitHub_account-3FB950?labelColor=0B111C&style=flat-square)
![install](https://img.shields.io/badge/install-none-3FB950?labelColor=0B111C&style=flat-square)

> Launch your first browser dev environment from the GitHub web UI, no
> local install needed. For the CLI way (nicer) see
> [CLI Reference](CLI-Reference.md).

## 1. Open the workflow

In the repository on GitHub:

1. Go to the **Actions** tab
2. Pick **Giecko Terminal** in the left sidebar
3. Click **Run workflow**

<details>
<summary>Do I need permissions?</summary>

You need write access to the repository (or your own fork). Giecko runs
on `workflow_dispatch`, so it appears in the Run workflow dropdown only
for people who can dispatch workflows. Fork it if you just want to try.
</details>

## 2. Fill the form (or accept the defaults)

| Input | Default | Try |
|---|---|---|
| stack | `ide` | keep it — terminal + IDE |
| password | `giecko` | set your own, or leave blank for **no auth (risky)** |
| duration_minutes | `180` | `30` for a first taste |
| distro | `runner` | `alpine` to see docker distros |
| persist_home | `false` | leave off for now |

Everything else is optional. Click **Run workflow**.

## 3. Watch it boot

Open the run while it runs. In the log you will see:

```text
GIECKO Terminal installed (ours)
GIECKO IDE installed (ours, 0.7.0)
GIECKO IS LIVE! (booted in 26s)
```

The summary at the top of the run page shows your URLs (terminal, IDE,
desktop), QR codes, the boot time, and the countdown. A
`giecko-live` annotation marks the moment it is reachable.

## 4. Log in

Open the **terminal** URL:

- user: whatever you set (default `giecko`)
- password: whatever you set

You land in `bash` inside `tmux` with the GIECKO prompt. The **IDE** URL
takes you to GIECKO IDE — same password.

<details>
<summary>On a phone?</summary>

Scan the QR from the run summary, or install the
[Mobile App](Mobile-App.md) and launch sessions from your pocket.
</details>

## 5. Do something, then save

Inside the session:

```bash
giecko save
```

Your workspace is snapshotted to the `giecko-work/run-<id>` branch. Next
time, `--restore <run-id>` (CLI) or the `restore` workflow input brings
the files back. See [Persistence](Persistence.md).

## What just happened

A GitHub runner booted, downloaded GIECKO Terminal and GIECKO IDE from
our releases, started them behind Cloudflare tunnels, and printed the
public URLs. When the duration ends, the runner dies — your work
survives only where you saved it. The full story:
[Architecture](Architecture.md).

## Next steps

- [Stacks](Stacks.md) — pick terminal / IDE / desktop
- [Session Commands](Session-Commands.md) — the `giecko` command inside
- [Rooms](Rooms.md) — several named workspaces in one session
- [Networking](Networking.md) — your own domain, mask mode, lag

---

← [Home](Home.md) · [Architecture](Architecture.md) →
