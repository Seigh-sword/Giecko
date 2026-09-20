# Changelog

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
