# <img src="https://cdn.simpleicons.org/cmake/3FB950" width="28" valign="middle"> Development

![repo](https://img.shields.io/badge/layout-monorepo-3FB950?labelColor=0B111C&style=flat-square)
![ci](https://img.shields.io/badge/ci-4_workflows-3FB950?labelColor=0B111C&style=flat-square&logo=githubactions&logoColor=white)

> Hacking on Giecko itself: where things live, how to build them, and
> how CI proves they work.

## Repository layout

| Path | What |
|---|---|
| `scripts/` | `giecko.sh` + `giecko.ps1` (session boot), `giecko` (in-session CLI), `build-terminal.sh` |
| `giecko-terminal/` | our ttyd 1.7.7 fork (C, static lws) |
| `ide/` | GIECKO IDE build: `build-ide.sh`, `build-vsix.py`, extension source, extension list, product overrides, seeded settings |
| `assets/icons/` | the gecko icons and favicons (every surface uses them) |
| `cli/` | the npm CLI (TypeScript, `cli/src` → `cli/dist`) |
| `mobile/` | React Native + Expo app |
| `tiny-giecko/` | the native C99 client |
| `.github/workflows/` | giecko (sessions), ide (builds + releases), mobile (APK), tiny-giecko (matrix) |
| `wiki/` | this wiki |

## Building GIECKO Terminal

```bash
./scripts/build-terminal.sh
```

- installs deps (apt on linux, brew on macOS)
- builds libwebsockets v4.3-stable: static, SSL off, **libuv on**
  (ttyd requires it — the classic CI failure)
- patches the installed lws CMake config (drops `websockets_shared`)
- builds the fork → `ide/dist/giecko-terminal-<arch>` + version check

## Building GIECKO IDE

```bash
bash ide/build-ide.sh
```

- downloads code-server per target
  (`CS_VERSION`, default 4.139.1)
- patches `product.json` (names, Open VSX gallery, telemetry off)
- replaces favicons with the gecko set
- strips copilot/chat extensions
- installs the 34 extensions + our vsix with the host code-server
- repacks `giecko-ide-<version>-<target>.tar.gz` (4 targets)

The extension alone: `python3 ide/build-vsix.py`.

## CI pipelines

| Workflow | Triggers | Proves |
|---|---|---|
| giecko.yml | every push, `[skip giecko]` opts out | a real session boots and serves (with `[d=1]` tags: quick smoke) |
| ide.yml | build-file pushes, `[release]` | terminal builds on 4 native runners; IDE bundles verify (product.json, extensions, no copilot, binary runs); release upload |
| mobile.yml | `[mobile]`, tags | APK builds and attaches |
| tiny-giecko.yml | `[tiny]`, tags | 18-target cross matrix + protocol tests |

The session smoke is the dogfood: every push boots the actual product
with the change in it.

## Conventions

- emoji-free, comment-free code (sh / py / yml / js-ts / C / RN / ps1)
  — the wiki and READMEs carry the personality
- placeholders and full structures over stubs — ship the whole thing
- commit tags drive CI (`[d=1]`, `[release]`, ...) — see
  [Commit Triggers](Commit-Triggers.md)
- version bumps touch `cli/package.json`, `cli/CHANGELOG.md` and
  `ide/build-ide.sh` together

## Local end-to-end (no GitHub)

```bash
./scripts/giecko.sh mysecret 60 "" ide 0 myuser false runner false
```

boots terminal + IDE + tunnels on your machine — the same code the
runner executes. Stop with Ctrl-C when done.

## Turning this wiki into the GitHub wiki

The `wiki/` folder is plain markdown with relative links and works in
the repo. To use it as the repository wiki instead:

```bash
git clone https://github.com/Seigh-sword/Giecko.wiki.git
cp wiki/*.md Giecko.wiki/ && cd Giecko.wiki && git add -A && git commit -m "wiki" && git push
```

`_Sidebar.md` and `_Footer.md` are already wiki-shaped.

---

← [Releases](Releases.md) · [Troubleshooting](Troubleshooting.md) →
