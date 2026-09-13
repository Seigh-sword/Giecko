#!/bin/bash
#
# 🦎 Giecko — turn this machine (GitHub Actions runner or your laptop)
# into a browser-accessible Linux terminal via ttyd + Cloudflare Quick Tunnel.
#
# Usage:
#   ./giecko.sh [password] [duration_minutes] [extra_apt_packages]
#
# Examples:
#   ./giecko.sh mysecret 180 "neovim golang"
#   ./giecko.sh "" 60            # no auth (dangerous, anyone with link gets a shell)
#
set -e

PASSWORD="${1:-giecko}"
DURATION_MIN="${2:-180}"
EXTRA_PKGS="${3:-}"
PORT=7681
USER="giecko"

echo "🦎 Giecko booting..."
echo "   user      : $USER"
echo "   auth      : $([ -n "$PASSWORD" ] && echo "enabled ✅" || echo "DISABLED ⚠️  (public shell!)")"
echo "   duration  : ${DURATION_MIN} min"
echo "   extras    : ${EXTRA_PKGS:-none}"
echo ""

if [ -n "$PASSWORD" ]; then
  # keep the password out of the Actions log
  echo "::add-mask::$PASSWORD" 2>/dev/null || true
fi

# ---------------------------------------------------------------- install deps
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "📥 Installing cloudflared..."
  curl -fsSL -o /tmp/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /tmp/cloudflared
  if command -v sudo >/dev/null 2>&1; then
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
  else
    mkdir -p "$HOME/.local/bin"
    mv /tmp/cloudflared "$HOME/.local/bin/cloudflared"
    export PATH="$HOME/.local/bin:$PATH"
  fi
fi
cloudflared --version

if ! command -v ttyd >/dev/null 2>&1; then
  echo "📥 Installing ttyd..."
  curl -fsSL -o /tmp/ttyd \
    https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.x86_64
  chmod +x /tmp/ttyd
  if command -v sudo >/dev/null 2>&1; then
    sudo mv /tmp/ttyd /usr/local/bin/ttyd
  else
    mkdir -p "$HOME/.local/bin"
    mv /tmp/ttyd "$HOME/.local/bin/ttyd"
    export PATH="$HOME/.local/bin:$PATH"
  fi
fi
ttyd --version

if ! command -v tmux >/dev/null 2>&1; then
  echo "📥 Installing tmux..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq tmux
  else
    echo "⚠️  no apt-get, skipping tmux install (sessions won't persist across reconnects)"
  fi
fi

if [ -n "$EXTRA_PKGS" ]; then
  # shellcheck disable=SC2086
  echo "📦 Installing extra packages: $EXTRA_PKGS"
  sudo apt-get update -qq
  # shellcheck disable=SC2086
  sudo apt-get install -y $EXTRA_PKGS
fi

# ----------------------------------------------------------- fun boot banner
cat <<'BANNER'
   ____ _           _
  / ___(_) ___  ___| | _____
 | |  _| |/ _ \/ __| |/ / _ \
 | |_| | |  __/ (__|   < (_) |
  \____|_|\___|\___|_|\_\___/
  virtual linux terminal 🦎
BANNER
uname -a
echo ""

# ---------------------------------------------------------------- start ttyd
# tmux as the default command = your shell survives tab closes / reconnects
if command -v tmux >/dev/null 2>&1; then
  SHELL_CMD="tmux new -A -s giecko"
else
  SHELL_CMD="bash -l"
fi

TTYD_ARGS="-p $PORT --writable"
if [ -n "$PASSWORD" ]; then
  TTYD_ARGS="$TTYD_ARGS -c $USER:$PASSWORD"
fi

echo "🖥️  Starting ttyd on port $PORT (cmd: $SHELL_CMD)..."
rm -f ttyd.log
# shellcheck disable=SC2086
nohup ttyd $TTYD_ARGS $SHELL_CMD > ttyd.log 2>&1 &
echo "$!" > ttyd.pid

echo "⏳ Waiting for ttyd to listen..."
for _ in $(seq 1 20); do
  if curl -fs -o /dev/null "http://localhost:$PORT/"; then
    echo "✅ ttyd is up"
    break
  fi
  sleep 1
done
if ! curl -fs -o /dev/null "http://localhost:$PORT/"; then
  echo "❌ ttyd failed to start. Log:"
  cat ttyd.log
  exit 1
fi

# -------------------------------------------------------- start cloudflared
echo "☁️  Opening Cloudflare Quick Tunnel..."
rm -f cloudflared.log
nohup cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > cloudflared.log 2>&1 &
echo "$!" > cloudflared.pid

echo "⏳ Waiting for trycloudflare.com URL (up to ~2 min)..."
URL=""
for _ in $(seq 1 60); do
  URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' cloudflared.log | head -n 1 || true)
  if [ -n "$URL" ]; then break; fi
  # fail fast if cloudflared already died
  if ! kill -0 "$(cat cloudflared.pid)" 2>/dev/null; then
    echo "❌ cloudflared died early. Log:"
    cat cloudflared.log
    exit 1
  fi
  sleep 2
done

if [ -z "$URL" ]; then
  echo "❌ No tunnel URL appeared. cloudflared log:"
  cat cloudflared.log
  exit 1
fi

# ------------------------------------------------------------------ GO LIVE
cat <<EOF

============================================================
 🦎  GIECKO IS LIVE!
============================================================
 👉  $URL
 👤  user: $USER
 🔑  pass: $([ -n "$PASSWORD" ] && echo "(the password you gave the workflow)" || echo "(none — public!)")
 ⏱️   alive for ~${DURATION_MIN} min from now
============================================================
 Open the URL in your browser. You now have a Linux terminal.
 Tip: your shell runs inside tmux, so closing the tab is safe —
 just reopen the URL and you're back where you left off.
============================================================

EOF

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## 🦎 Giecko is live!"
    echo ""
    echo "| | |"
    echo "|---|---|"
    echo "| **URL** | \`$URL\` |"
    echo "| **User** | \`$USER\` |"
    echo "| **Password** | $([ -n "$PASSWORD" ] && echo "the one you entered when dispatching" || echo "none ⚠️") |"
    echo "| **Expires in** | ~${DURATION_MIN} min |"
    echo ""
    echo "👉 Open **[$URL]($URL)** in your browser."
    echo ""
    echo "> Your shell runs inside tmux — closing the tab is safe, just reopen the URL."
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "url=$URL" >> "$GITHUB_OUTPUT"
fi

# --------------------------------------------------------------- keep alive
END=$((SECONDS + DURATION_MIN * 60))
while [ "$SECONDS" -lt "$END" ]; do
  # fail visibly if either side dies
  if ! kill -0 "$(cat ttyd.pid)" 2>/dev/null; then
    echo "❌ ttyd died. Last lines of ttyd.log:"
    tail -n 50 ttyd.log || true
    exit 1
  fi
  if ! kill -0 "$(cat cloudflared.pid)" 2>/dev/null; then
    echo "❌ cloudflared died. Last lines of cloudflared.log:"
    tail -n 50 cloudflared.log || true
    exit 1
  fi
  REM_MIN=$(((END - SECONDS) / 60))
  echo "💓 Giecko alive — ~${REM_MIN} min left — $URL — $(date -u '+%H:%M:%S UTC')"
  sleep 60
done

echo "⏰ Time's up (${DURATION_MIN} min). Shutting down. Bye! 🦎"
kill "$(cat cloudflared.pid)" "$(cat ttyd.pid)" 2>/dev/null || true
