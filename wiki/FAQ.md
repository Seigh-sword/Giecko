# <img src="https://cdn.simpleicons.org/stackoverflow/3FB950" width="28" valign="middle"> FAQ

![answers](https://img.shields.io/badge/count-20-3FB950?labelColor=0B111C&style=flat-square)

> The questions that come up in the first five minutes of using
> Giecko.

**Is this allowed by GitHub?**
Actions on your own repos is the intended use of Actions. Giecko is a
workflow you run in a repository you control — the terms of the trade
are in [TERMS](../TERMS.md): no VPS-ing, no mining, no 24/7 hosting.

**Does it cost money?**
No. Public repositories get free runners and Cloudflare quick tunnels
are free. Private repos burn your Actions minutes.

**Where does my code live?**
On the runner while it lives, in `giecko-work/run-<id>` branches when
you save, and wherever you push it. The runner disk is wiped at the
end — see [Persistence](Persistence.md).

**Why is typing slow?**
The speed of light. Your keys travel to a Cloudflare edge and a runner
region and back. The runner region is printed at boot; the IDE buffers
locally and feels tighter than the terminal. The real fix is a
self-hosted runner near you.

**Can I keep the same URL?**
Yes — a Cloudflare named tunnel (`cf_token`) gives you your own
hostname every run. Random URLs are per-run by design.

**Is my session private?**
As private as your password. Blank password = a public computer.
Strong password + short duration + mask mode when sharing screens:
[Security](Security.md).

**Can I run several sessions at once?**
Yes — launch the workflow several times. Each run is its own runner,
its own URLs, its own save branch. Inside one session, use
[Rooms](Rooms.md) instead.

**Can I install my own software?**
Yes: the `packages` input at launch, `apt install` live in the
session, `npm`/`pip` freely, and the IDE can install any Open VSX
extension. Installed packages do not survive the run — bake them into
`packages` or the persistent home.

**Windows? macOS? Alpine?**
All supported — see [Distros & OS](Distros.md). On Windows runners the
session is PowerShell-based and GIECKO IDE falls back to upstream
code-server for now.

**What is GIECKO IDE exactly?**
code-server (VS Code in the browser) rebuilt as ours: GIECKO branding
and gecko icons, Copilot and chat removed, Open VSX gallery, 34
extensions preinstalled, plus the GIECKO session extension. See
[GIECKO IDE](GIECKO-IDE.md).

**Did you remove Copilot?**
Completely — the extensions are stripped at build time and the gallery
is Open VSX, which does not carry it.

**Can I use my VS Code themes and settings?**
The session seeds the GIECKO palette; change anything live. With the
persistent home on, your settings and dotfiles return next run.

**What happens when time runs out?**
A final save runs, a final report is published, and the runner shuts
down. Links die with it. `giecko launch --restore <run-id>` brings the
files back.

**Can I extend a running session?**
Not in place (the duration is set at dispatch). Save + relaunch with
`--restore` is the round trip — it takes about a minute.

**Why did my session die at 6 hours?**
GitHub caps jobs at 6 hours (360 minutes) on hosted runners. That is
the ceiling of the duration input.

**Is my GitHub token exposed to the session?**
The session gets the workflow's own `GITHUB_TOKEN` — contents:write on
that repository only. It cannot read your other repos or account. It
is used for the save branches and the persistent home.

**Can someone else join my session?**
Anyone with the URL **and** the password. There is no read-only guest
mode — a joiner is you, as far as the shell is concerned.

**Does it work on a phone?**
Three ways: the browser (scan the QR), the [Mobile App](Mobile-App.md)
(APK in releases), and for the adventurous, [tiny-giecko](tiny-giecko.md)
on Android framebuffer.

**How do I shut it down early?**
`giecko cancel` from your laptop, or cancel the run on GitHub — a
final save still runs.

**Where do I report bugs?**
Issues on the repository, with the run id (it is in `giecko info` and
the run summary).

---

← [Troubleshooting](Troubleshooting.md) · [Home](Home.md) →
