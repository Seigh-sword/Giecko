GIECKO 0.7.0: GIECKO IDE + GIECKO Terminal

Remade code-server as GIECKO IDE and ttyd as GIECKO Terminal.

GIECKO IDE (code-server 4.139.1 based):
- Rebranded: GIECKO IDE names, gecko favicon and icons everywhere
- Copilot and chat extensions stripped completely
- Open VSX gallery, telemetry off, update checks off
- 34 extensions bundled: Python, C/C++ (clangd), Go, Rust, Java, Lua, Ruby, PHP, Dart, YAML, TOML, Vue, Svelte, themes (One Dark, Dracula, Night Owl, GitHub), icon themes, Prettier, ESLint, Error Lens, GitLens, Code Runner, Live Server, Docker and more
- GIECKO IDE extension: status bar with run info + time left, control panel with session URLs, QR codes, save / rooms / timeleft / persist commands, opt-in autosave
- GIECKO terminal: xterm with fit addon, mobile friendly, gecko UI

GIECKO Terminal (ttyd 1.7.7 based):
- Rebranded UI, inline gecko favicon, xterm + FitAddon inlined
- Static libwebsockets build, no SSL needed (cloudflared tunnels provide TLS)

New in sessions:
- giecko timeleft / room NAME / rooms / persist commands
- Opt-in persistent home: dotfiles and config saved to the giecko-home branch between runs (workflow input persist_home)
- GIECKO_* environment for IDE and terminal: session, URLs, autosave, end time
- IDE settings seeded with the GIECKO palette

Mobile app unchanged; APK for this release is attached below.

Released: 2026-09-26
