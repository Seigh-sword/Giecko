# Giecko Roadmap

Where Giecko is headed. Current release: 0.7.0.

## Done

- 0.1.0 - first working version: terminal + VS Code in the browser via GitHub Actions
- 0.1.1 - npm packaging fixes
- 0.2.0 - Windows and macOS runners fully supported; GIECKO_UPSTREAM env; patient downloads
- 0.3.0 - session plan with interactive review at launch (mask, URL naming,
  duration visible); named Cloudflare tunnels for your own domain
  (`--cf-token` / `cf_token` input); this roadmap
- 0.4.0 - desktop mode (XFCE + noVNC: the whole GUI OS in the browser);
  `giecko cancel`; `giecko local`; `launch --restore <run-id>`
- 0.4.5 - desktop mode on every runner OS (macOS and Windows get the
  real desktop over VNC); session files update themselves (--nr opts
  out); auto update + `giecko update` / `-upd`; plugins (`gcko.pkg-*`);
  `giecko changelog`; npm package ships the scripts folder
- 0.5.0 - the whole CLI rewritten in TypeScript (cli/src, compiled to
  cli/dist); desktop watchdog fix (macOS and Windows sessions no longer
  die at the first heartbeat); `giecko logs`; session records under
  `~/.config/giecko/sessions/<run-id>/`; `init --config`; sha256
  checksums for every downloaded binary; desktop favicon (lizard + your
  GitHub avatar); browser reconnect (tmux keeps the shell alive across
  tab crashes); ISC license
- 0.5.1 - desktop login fixes: the macOS desktop login works (a real
  runner account, full password through the browser), the Windows
  desktop connects at all now (TightVNC loopback and password were
  both broken), and every desktop session self-checks its VNC login at
  boot (the vnc_auth line in the report)
- 0.6.0 - tiny-giecko (the native C99 client) and the mobile app
  (React Native + Expo, APK attached to releases); mobile CLI parity
  with in-app WebView sessions
- 0.7.0 - GIECKO IDE (code-server remade: gecko branding, no Copilot,
  Open VSX, 34 extensions bundled, our IDE extension with panel and
  status bar) and GIECKO Terminal (ttyd remade: GIECKO UI, mobile
  friendly, our favicons baked in - no proxy needed); sessions install
  both from our releases first; giecko timeleft / room / rooms /
  persist; opt-in persistent home (giecko-home branch); release
  automation via the ide workflow ([release] commits build and attach
  all bundles; npm stays manual); GIECKO_CONFIG_DIR override

## Next

- The honest lag fix. A VPN cannot beat the speed of light: typing
  latency is the round trip from you to the runner and back. What
  actually helps: local keystroke buffering (the VS Code link already
  does this) and self-hosted runners near you.
- Desktop mode with audio sync (the noVNC clipboard panel already
  syncs text; audio needs a different transport).
- C# support in GIECKO IDE (needs an open language server on Open VSX).

## Parked / research

- Self-hosted runner installer (the true lag fix; needs your own machine)
- WebRTC transport as a lower-latency alternative to tunnels
- Multi-user pairing sessions (share a shell with a friend)

## Non-goals

- Being a free VPS. Runners are ephemeral, capped at about 6 hours, and
  meant for hacking, learning, and demos. See TERMS.md.
- Mining, crypto, 24/7 hosting. No.
