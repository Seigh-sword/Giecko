# <img src="https://cdn.simpleicons.org/docker/3FB950" width="28" valign="middle"> Distros & OS

![runner](https://img.shields.io/badge/runner-ubuntu_%C2%B7_macos_%C2%B7_windows-3FB950?labelColor=0B111C&style=flat-square)
![distro](https://img.shields.io/badge/distro-docker_-3FB950?labelColor=0B111C&style=flat-square)

> Same Giecko on every machine: pick the runner OS, and on Linux pick
> the shell environment — the runner itself, or a docker distro inside
> it.

## Runner OS

| OS | Runner label | Notes |
|---|---|---|
| <img src="https://cdn.simpleicons.org/ubuntu/3FB950" width="14"> Ubuntu | `ubuntu-latest` | default; fastest boot; docker distros available |
| <img src="https://cdn.simpleicons.org/macos/3FB950" width="14"> macOS | `macos-latest` | real macOS; brew for extras; desktop = the OS itself |
| <img src="https://cdn.simpleicons.org/windows/3FB950" width="14"> Windows | `windows-latest` | PowerShell session path (`giecko.ps1`); GIECKO IDE not bundled there yet (upstream code-server is used) |

## Docker distros (Linux runners only)

| Distro | Image base | Good for |
|---|---|---|
| `runner` | none (the runner's own ubuntu) | fastest, default |
| <img src="https://cdn.simpleicons.org/ubuntu/3FB950" width="14"> `ubuntu` | ubuntu container | clean apt world |
| <img src="https://cdn.simpleicons.org/debian/3FB950" width="14"> `debian` | debian container | stable, familiar |
| <img src="https://cdn.simpleicons.org/fedora/3FB950" width="14"> `fedora` | fedora container | dnf, fresh kernels/userspace |
| <img src="https://cdn.simpleicons.org/archlinux/3FB950" width="14"> `arch` | arch container | pacman, rolling, AUR mindset |
| <img src="https://cdn.simpleicons.org/alpinelinux/3FB950" width="14"> `alpine` | alpine container | tiny, busybox + apk, quick to boot |

Rules:

- Desktop mode always runs on the runner host (distro forced to
  `runner`)
- On macOS and Windows runners, distros are not available
- Inside a distro you are root in the container; the runner outside it
  is untouched

## Choosing

- **Not sure?** `runner` on ubuntu — it is what the defaults do
- **Need a specific package manager?** the matching distro
- **Testing install scripts?** the distro closest to production
- **Want a GUI?** any OS, desktop stack, `runner` distro

## How it is set

- Workflow UI: `os` + `distro` inputs
- npm CLI: `giecko init --os ubuntu-latest --distro alpine`
- Push trigger: `[os=macos]`, `[os=windows]`,
  `[distro=alpine|arch|fedora|ubuntu|debian]`

The distro downloads and starts before the session services; the boot
log shows which shell environment you actually got.

---

← [Desktop Mode](Desktop-Mode.md) · [Mobile App](Mobile-App.md) →
