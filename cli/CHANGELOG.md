# Changelog

## 0.7.0

- New: GIECKO IDE, our remade code-server. Rebranded end to end with
  the gecko icons, Copilot and chat stripped completely, Open VSX
  gallery, telemetry off, and 36 extensions bundled (10+ languages,
  themes, icon themes, utilities and tooling). Builds for
  linux-x86_64, linux-aarch64, darwin-x86_64 and darwin-aarch64 via
  ide/build-ide.sh, attached to releases by the ide workflow
- New: GIECKO Terminal, our remade ttyd 1.7.7 with the GIECKO UI,
  inline favicon, xterm + FitAddon and mobile friendly layout.
  Sessions install it from our releases first
- New: the GIECKO IDE extension (status bar countdown, control panel
  with session URLs and QR codes, giecko save / rooms / timeleft
  buttons, opt-in autosave)
- New: giecko timeleft, giecko room NAME, giecko rooms and
  giecko persist commands
- New: opt-in persistent home (workflow input persist_home): your
  dotfiles and config are snapshotted to the giecko-home branch and
  restored on your next run
- New: GIECKO_* environment exported to the IDE and terminal with
  session info, URLs, autosave and end time; the IDE extension also
  reads it from the env file

## 0.6.0

- New: tiny-giecko, a native client in portable C99 with no runtime
  dependencies. It connects to your session over WebSocket or raw VNC,
  does the classic VNC DES authentication itself and draws the
  framebuffer - no browser needed. 18 make targets from Raspberry Pi
  Zero to Windows, macOS and the BSDs (cross-builds via zig cc), a
  built-in --selftest with FIPS DES vectors, and a mock-server protocol
  test suite that CI runs on Linux, macOS and Windows. Today it is a
  viewer: Raw encoding, headless and Linux fbdev display; input and
  more encodings come next
- New: the mobile app (React Native + Expo) for iOS and Android:
  built-in guide, one-tap session launch, run list and the session
  opening inside the app. CI builds the Android APK on [mobile] pushes
  and attaches it to v* releases
- CI: tiny-giecko.yml (build the whole cross matrix, run the protocol
  tests) and mobile.yml (APK release builds)

## 0.5.1

- Fixed: the macOS desktop login rejected the right password. The
  browser uses the macOS login scheme first, which checks a real macOS
  account - the runner now creates that account with the session
  username and the full session password. The 8 character VNC limit no
  longer applies through the browser (external VNC clients still use
  the first 8 characters)
- Fixed: the Windows desktop never worked through the browser. TightVNC
  refuses connections from the same machine by default, which is exactly
  how the web client reaches it, and the VNC password was never actually
  set. The runner now enables loopback, sets the password through the
  installer and restarts the service
- Fixed: auth-off desktop sessions on macOS never booted (the random
  password generator hung on macOS). The generator is replaced and the
  login it makes is printed in the run log
- New: every desktop session checks its own VNC login at boot (both the
  classic VNC handshake and the macOS one the browser uses) and reports
  the result as vnc_auth in the session report

## 0.5.0

- The CLI is TypeScript now: typed config, flags, API results and session
  records (source in cli/src, compiled to cli/dist for npm)
- Fixed: desktop sessions on macOS and Windows died at the first
  heartbeat (the watchdog probed an Xvfb pid that only exists on Linux)
- `giecko logs <run-id> [--tail N]`: tail a run's log from your laptop
- Session records: every launch writes ~/.config/giecko/sessions/<run-id>/
  (session.json + a copy of the config); `giecko ls` lists them
- `giecko init --config PATH`: keep the session config wherever you want
- Checksums: the runner records the sha256 of every downloaded binary
  (cloudflared, ttyd, code-server) in the boot log and the session report
- Desktop favicon: the noVNC web app shows the Giecko lizard with the
  repo owner's GitHub avatar in a circle frame. The ttyd and code-server
  favicons are baked into their binaries and cannot be replaced
- Browser reconnect: a closed tab does not end the session - the shell
  lives in tmux on the runner, reopen the URL and you are back in it
- License changed from MIT to ISC
- Fixed: `giecko help` printed an @BRAND@ placeholder in two spots
- Bundled runner templates re-synced (the bundled copies had missed the
  Windows websockify fix and the desktop on-box CLI lines)

## 0.4.5

- Desktop mode on every runner OS: Linux gets an XFCE desktop, macOS and
  Windows get the runner's real desktop over VNC
- Session files update themselves on launch: no more --reinstall every
  time. Use --nr (or --no-reinstall) for one launch without updating
- Auto update: the CLI checks npm for a newer release on every launch
  (off: giecko update --off, one-off: GIECKO_NO_UPDATE=1)
- giecko update / giecko -upd: manual update. Refreshes the session files
  in your repo, checks the CLI version, --self installs the latest CLI
- Plugins: giecko plugin -i gcko.pkg-<name> installs npm packages into
  your sessions. The gcko.pkg tag is required, anything else is an
  invalid id. -l lists, -r removes
- giecko changelog: this file, in your terminal
- The npm package now ships the scripts folder too

## 0.4.0

- Desktop mode (XFCE + noVNC, Linux)
- giecko cancel: stop a running session from your laptop
- giecko local: the whole stack on your own machine, no GitHub
- giecko launch --restore <run-id>: continue a previous session's files

## 0.3.0

- Session plan with interactive review at launch (mask, URL naming,
  duration)
- Named Cloudflare tunnels for your own domain (--cf-token / cf_token)
- ROADMAP.md

## 0.2.0

- Windows and macOS runners fully supported
- GIECKO_UPSTREAM environment variable, patient downloads

## 0.1.x

- Terminal + VS Code in the browser via GitHub Actions
- ttyd, code-server, cloudflared quick tunnels, QR codes, mask mode
- Linux distros in docker, giecko save + autosave
- npm CLI: auth, init, launch, ls, watch
