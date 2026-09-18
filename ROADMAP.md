# Giecko Roadmap

Where Giecko is headed. The big one is 0.5.0, the daily-driver release.
Current release: 0.3.0.

## Done

- 0.1.0 - first working version: terminal + VS Code in the browser via GitHub Actions
- 0.1.1 - npm packaging fixes
- 0.2.0 - Windows and macOS runners fully supported; GIECKO_UPSTREAM env; patient downloads
- 0.3.0 - session plan with interactive review at launch (mask, URL naming,
  duration visible); named Cloudflare tunnels for your own domain
  (`--cf-token` / `cf_token` input); this roadmap

## 0.4.0 - foundations (next)

- TypeScript CLI: the whole cli/ package rewritten in TypeScript and
  compiled to plain JavaScript for npm. Same commands, same config,
  static types to kill whole classes of bugs.
- Desktop mode: a full GUI OS in the browser (noVNC + a lightweight
  Linux desktop) as a third mode next to cli and ide.
- Session resume: reconnect a browser to a still-running session after
  a tab crash without losing the shell.
- `giecko logs`: tail the runner log from your laptop.
- Checksums for every binary the runner downloads.

## 0.5.0 - the daily driver

- Region picker: show runner regions before launch and retry until you
  land close to home.
- The honest lag fix. A VPN cannot beat the speed of light: typing
  latency is the round trip from you to the runner and back. What
  actually helps: region choice, local keystroke buffering (the VS Code
  link already does this), and self-hosted runners near you.
- Desktop mode with audio and clipboard sync.
- Persistent home directories between sessions (opt-in).
- One-command localhost mode, no GitHub at all: `giecko local`.
- First-class mobile layout for the terminal.
- Multi-session workspaces: one runner, several named rooms.
- Release automation: tagged commits publish to npm after tests pass.

## Parked / research

- Self-hosted runner installer (the true lag fix; needs your own machine)
- WebRTC transport as a lower-latency alternative to tunnels
- Multi-user pairing sessions (share a shell with a friend)

## Non-goals

- Being a free VPS. Runners are ephemeral, capped at about 6 hours, and
  meant for hacking, learning, and demos. See TERMS.md.
- Mining, crypto, 24/7 hosting. No.
