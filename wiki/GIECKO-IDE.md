# <img src="https://cdn.simpleicons.org/visualstudiocode/3FB950" width="28" valign="middle"> GIECKO IDE

![base](https://img.shields.io/badge/code--server-4.139.1-3FB950?labelColor=0B111C&style=flat-square)
![vscode](https://img.shields.io/badge/VS_Code-1.139.1-3FB950?labelColor=0B111C&style=flat-square)
![copilot](https://img.shields.io/badge/copilot-removed-0B111C?labelColor=3FB950&style=flat-square)
![gallery](https://img.shields.io/badge/gallery-Open_VSX-3FB950?labelColor=0B111C&style=flat-square)

> VS Code in your browser, remade as GIECKO: our names, our gecko icons,
> no Copilot, no chat, no telemetry — and 34 useful extensions already
> inside.

## What is different from stock code-server

| Area | Stock | GIECKO IDE |
|---|---|---|
| Names and icons | VS Code / coder | GIECKO IDE, gecko favicon everywhere |
| Copilot and chat | bundled | stripped completely |
| Gallery | configured per user | Open VSX, preconfigured |
| Telemetry and updates | on | off, `update.mode: none` |
| Extensions | ~20 built-ins | built-ins + 34 curated |
| Session integration | none | the GIECKO extension (below) |
| Data dir | `~/.local/share/code-server` | same (clean separation per run) |

## The GIECKO extension

Bundled into the IDE (and installed for upstream fallbacks). It gives
the IDE the same powers as the session CLI:

- **Status bar** — run id, region, stack, user, and a countdown of the
  time left, updated live
- **Control panel** — Command Palette → `GIECKO: open panel`:
  - session URLs (terminal / IDE / desktop) with copy buttons
  - QR codes, drawn client-side, for phone handoff
  - `giecko save`, room switching, `timeleft`, restore buttons
  - autosave state
- **Commands** — `GIECKO: save`, `GIECKO: session info`, `GIECKO: urls`,
  `GIECKO: switch room`, `GIECKO: restore`
- **Opt-in autosave** — `giecko.autosaveMinutes` in settings

The extension reads session facts from the `GIECKO_*` environment (set
at launch) and falls back to the env file written by the boot script —
so URLs show up even though they were only known after the IDE started.

## Bundled extensions (34)

<details>
<summary><b>Languages (12)</b></summary>

| Extension | Language |
|---|---|
| ms-python.python + ms-python.debugpy | Python |
| llvm-vs-code-extensions.vscode-clangd | C / C++ (clangd is apt-installed in IDE sessions) |
| golang.go | Go |
| rust-lang.rust-analyzer | Rust |
| redhat.java + vscjava.vscode-java-pack | Java |
| sumneko.lua | Lua |
| shopify.ruby-lsp | Ruby |
| devsense.phptools-vscode | PHP |
| dart-code.dart-code | Dart |
| redhat.vscode-yaml | YAML |
| tamasfe.even-better-toml | TOML |
| vue.volar, svelte.svelte-vscode | Vue, Svelte |
</details>

<details>
<summary><b>Themes and icons (5)</b></summary>

| Extension | What |
|---|---|
| zhuangtongfa.material-theme | One Dark Pro |
| dracula-theme.theme-dracula | Dracula |
| sdras.night-owl | Night Owl |
| github.github-vscode-theme | GitHub themes |
| pkief.material-icon-theme, vscode-icons-team.vscode-icons | file icon themes |
</details>

<details>
<summary><b>Tools and utilities (17)</b></summary>

Prettier, ESLint, Error Lens, GitLens, Path Intellisense, npm
Intellisense, Code Runner, Live Server, Spell Checker, Todo Tree,
Better Comments, Markdown All in One, Docker — plus the built-in git,
terminal, and remote tooling.
</details>

C# is the one gap: Microsoft's extension is marketplace-only and not on
Open VSX. It returns when there is an open C# language server there.

## Seeded settings

Fresh sessions start with the GIECKO palette (deep `#0B0F14` /
`#0B111C` panels), Default Dark Modern + material icons, JetBrains Mono
with ligatures, format-on-save, auto-fetch, files auto-save after 2s,
bracket pair colorization, and a clean startup (no editor tabs). Change
anything — settings live in `~/.local/share/code-server/User/` and can
be kept across runs with the [persistent home](Persistence.md).

## Install more

Command Palette → `Extensions: Install Extensions` — the Open VSX
gallery is one click away. Anything you install lives for the run;
with persistent home on, the user-data and extension dirs are snapshotted
with your dotfiles.

## Where the bundles come from

`giecko-ide-0.7.0-{linux-amd64,linux-arm64,macos-amd64,macos-arm64}.tar.gz`
built by the `ide` workflow — see [Releases](Releases.md) and
[Development](Development.md). Sessions try our release first; upstream
code-server remains the fallback.

---

← [Stacks](Stacks.md) · [GIECKO Terminal](GIECKO-Terminal.md) →
