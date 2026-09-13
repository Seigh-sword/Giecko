#!/bin/bash
#
# 🦎 Giecko v0.2 — turn this machine (GitHub Actions runner or your laptop)
# into a browser-accessible dev environment:
#   Terminal (ttyd + tmux) + optional VS Code (code-server),
#   exposed via Cloudflare Quick Tunnels.
#
# Usage:
#   ./giecko.sh [password] [duration_minutes] [extra_apt_packages] [stack] [autosave_minutes]
#   stack: terminal | ide (default: ide)
#
set -e

PASSWORD="${1:-giecko}"
DURATION_MIN="${2:-180}"
EXTRA_PKGS="${3:-}"
STACK="${4:-ide}"
AUTOSAVE_MIN="${5:-15}"

TERM_PORT=7681
CODE_PORT=8080
USER="giecko"
RUN_ID="${GITHUB_RUN_ID:-local}"
REPO_SLUG="${GITHUB_REPOSITORY:-}"
WORKSPACE="${GITHUB_WORKSPACE:-$PWD}"
BOOT_START=$SECONDS
HEARTBEATS=0
URL_TERM=""
URL_CODE=""
CODE_OK=0
CODE_WARNED=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNDIR="$PWD/.giecko"
CODER_VER_FALLBACK="4.137.0"
mkdir -p "$RUNDIR"

# ------------------------------------------------------------------ helpers
if [ "$(id -u)" -eq 0 ]; then SUDO=""; CAN_ROOT=1
elif command -v sudo >/dev/null 2>&1; then SUDO="sudo"; CAN_ROOT=1
else SUDO=""; CAN_ROOT=0; fi
priv() { if [ -n "$SUDO" ]; then $SUDO "$@"; else "$@"; fi; }

if [ "$CAN_ROOT" = 1 ]; then BIN_DIR="/usr/local/bin"; else BIN_DIR="$HOME/.local/bin"; mkdir -p "$BIN_DIR"; fi
export PATH="$BIN_DIR:$HOME/.local/bin:$PATH"
if [ "$CAN_ROOT" = 1 ]; then ENV_FILE="/etc/giecko.env"; else ENV_FILE="$HOME/.giecko.env"; fi

fail() {
  trap - ERR
  echo "❌ $1"
  publish_report failed "$1" || true
  exit 1
}
trap 'fail "error at line $LINENO: $BASH_COMMAND"' ERR
trap 'kill $(cat "$RUNDIR"/*.pid 2>/dev/null) 2>/dev/null || true' EXIT

http_up() { # $1=port, $@=extra curl args → 0 if any HTTP response
  local port="$1"; shift
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$@" "http://127.0.0.1:$port/" 2>/dev/null || echo "000")
  [ -n "$code" ] && [ "$code" != "000" ]
}

tunnel_url() { # $1=logfile → prints first trycloudflare URL or empty
  grep -oE 'https://[A-Za-z0-9.-]+\.trycloudflare\.com' "$1" 2>/dev/null | head -n 1 || true
}

redact() { # stdin→stdout, scrub password + tunnel hostnames (for published reports)
  if command -v python3 >/dev/null 2>&1; then
    GIECKO_PW="$PASSWORD" python3 -c '
import sys, os, re
d = sys.stdin.read()
pw = os.environ.get("GIECKO_PW", "")
if pw: d = d.replace(pw, "REDACTED")
d = re.sub(r"https://[A-Za-z0-9.-]+\.trycloudflare\.com", "https://REDACTED.trycloudflare.com", d)
sys.stdout.write(d)'
  else
    sed -E 's|https://[A-Za-z0-9.-]+\.trycloudflare\.com|https://REDACTED.trycloudflare.com|g'
  fi
}

publish_report() { # $1 = live|completed|failed, $2 = note
  [ "${GITHUB_ACTIONS:-}" = "true" ] || return 0
  [ -n "${GITHUB_TOKEN:-}" ] || { echo "⚠️  no GITHUB_TOKEN, skipping report publish"; return 0; }
  [ -n "$REPO_SLUG" ] || { echo "⚠️  no GITHUB_REPOSITORY, skipping report publish"; return 0; }
  local out
  if out=$( ( _publish_report_inner "$@" ) 2>&1 ); then
    echo "$out"
    echo "::notice::giecko report [$1]: term=$([ -n "$URL_TERM" ] && echo YES || echo NO) code=$([ -n "$URL_CODE" ] && echo YES || echo NO) boot=$((SECONDS - BOOT_START))s heartbeats=$HEARTBEATS"
  else
    out="${out//$GITHUB_TOKEN/REDACTED}"
    echo "::warning::giecko report publish failed ($1): ${out:0:500}"
    echo "⚠️  report publish failed (non-fatal): ${out:0:300}"
  fi
}
_publish_report_inner() { # runs in subshell; ERR trap is reset there
  local status="$1" note="$2"
  local rdir auth_url
  rdir=$(mktemp -d) || return 1
  auth_url="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"
  if ! git clone -q --depth 1 --branch giecko-reports "$auth_url" "$rdir" 2>/dev/null; then
    rm -rf "$rdir"; rdir=$(mktemp -d) || return 1
    git clone -q --depth 1 "$auth_url" "$rdir" 2>/dev/null || { rm -rf "$rdir"; return 1; }
    ( cd "$rdir" && git checkout -q --orphan giecko-reports && git rm -q -rf . >/dev/null ) || { rm -rf "$rdir"; return 1; }
  fi
  mkdir -p "$rdir/reports"
  {
    echo "# 🦎 Giecko report — run \`$RUN_ID\`"
    echo ""
    echo "- status: **$status** ${note:+($note)}"
    echo "- time_utc: $(date -u '+%Y-%m-%d %H:%M:%S')"
    echo "- stack: $STACK, duration_min: $DURATION_MIN, autosave_min: $AUTOSAVE_MIN"
    echo "- region: ${REGION:-unknown}, egress_ip: ${EGRESS_IP:-?}"
    echo "- boot_seconds: $((SECONDS - BOOT_START)), heartbeats: $HEARTBEATS"
    echo "- url_terminal: $([ -n "$URL_TERM" ] && echo "YES (redacted)" || echo "NO")"
    echo "- url_code: $([ -n "$URL_CODE" ] && echo "YES (redacted)" || echo "NO")"
    echo "- versions: $(cloudflared --version 2>/dev/null | head -n 1) / $(ttyd --version 2>/dev/null) / $([ "$CODE_OK" = 1 ] && "$CODE_BIN" --version 2>/dev/null | head -n 1 || echo "code-server: n/a")"
    for f in ttyd.log term-tunnel.log code-server.log code-tunnel.log; do
      if [ -f "$RUNDIR/$f" ]; then
        echo ""
        echo "## $f (tail, redacted)"
        echo '```'
        tail -n 12 "$RUNDIR/$f" | redact || true
        echo '```'
      fi
    done
  } > "$rdir/reports/run-$RUN_ID.md"
  ( cd "$rdir" \
    && git add "reports/run-$RUN_ID.md" \
    && git -c user.email="giecko@local" -c user.name="giecko" commit -qm "report $RUN_ID: $status" \
    && ( git push -q -u origin giecko-reports 2>/dev/null || ( git pull -q --rebase origin giecko-reports 2>/dev/null && git push -q origin giecko-reports 2>/dev/null ) ) ) \
    || { rm -rf "$rdir"; return 1; }
  rm -rf "$rdir"
  echo "📋 report published (status=$status)"
}

# ------------------------------------------------------------------ hello
echo "🦎 Giecko booting..."
echo "   user      : $USER"
echo "   auth      : $([ -n "$PASSWORD" ] && echo "enabled ✅" || echo "DISABLED ⚠️  (public!)")"
echo "   stack     : $STACK"
echo "   duration  : ${DURATION_MIN} min"
echo "   autosave  : $([ "${AUTOSAVE_MIN:-0}" -gt 0 ] 2>/dev/null && echo "every ${AUTOSAVE_MIN} min" || echo "off")"
echo "   extras    : ${EXTRA_PKGS:-none}"
echo "   run_id    : $RUN_ID"
[ -n "$PASSWORD" ] && echo "::add-mask::$PASSWORD" 2>/dev/null || true

REGION=$(curl -s -m 5 -H Metadata:true 'http://169.254.169.254/metadata/instance/compute/location?api-version=2021-02-01&format=text' 2>/dev/null | grep -oE '^[a-z0-9-]+$' | head -c 32 || true)
[ -n "$REGION" ] || REGION="unknown"
EGRESS_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || echo "?")
echo "   region    : $REGION (runner) — if that's far from you, that's the typing lag. Physics! 🌍"
echo ""

# ------------------------------------------------- install (all parallel)
apt_job() {
  command -v apt-get >/dev/null 2>&1 || { echo "⚠️  no apt-get, skipping system packages"; return 0; }
  [ "$CAN_ROOT" = 1 ] || { echo "⚠️  no root, skipping system packages"; return 0; }
  echo "📦 apt: updating..."
  priv apt-get update -qq || echo "⚠️  apt update had issues, continuing"
  echo "📦 apt: installing core tools..."
  # shellcheck disable=SC2086
  priv apt-get install -y -qq tmux tree jq htop zip unzip sqlite3 qrencode lrzsz $EXTRA_PKGS \
    || echo "⚠️  some apt packages failed (run 'apt install <name>' live to retry)"
  priv apt-get install -y -qq fastfetch 2>/dev/null || true
}
dl_cloudflared() {
  command -v cloudflared >/dev/null 2>&1 && return 0
  echo "📥 downloading cloudflared..."
  curl -fsSL -o /tmp/giecko-cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    || return 1
  chmod +x /tmp/giecko-cloudflared && priv mv /tmp/giecko-cloudflared "$BIN_DIR/cloudflared"
}
dl_ttyd() {
  command -v ttyd >/dev/null 2>&1 && return 0
  echo "📥 downloading ttyd..."
  curl -fsSL -o /tmp/giecko-ttyd https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.x86_64 \
    || return 1
  chmod +x /tmp/giecko-ttyd && priv mv /tmp/giecko-ttyd "$BIN_DIR/ttyd"
}
dl_code() {
  [ "$STACK" = "ide" ] || return 0
  [ -n "${CODE_BIN:-}" ] && [ -x "$CODE_BIN" ] && return 0
  echo "📥 resolving code-server..."
  local url auth=()
  [ -n "${GITHUB_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $GITHUB_TOKEN")
  url=$(curl -fsSL -m 20 "${auth[@]}" https://api.github.com/repos/coder/code-server/releases/latest 2>/dev/null \
    | grep -o 'https://[^"]*linux-amd64\.tar\.gz' | head -n 1 || true)
  [ -n "$url" ] || { echo "⚠️  code-server API lookup failed, using pinned v$CODER_VER_FALLBACK"; url="https://github.com/coder/code-server/releases/download/v$CODER_VER_FALLBACK/code-server-$CODER_VER_FALLBACK-linux-amd64.tar.gz"; }
  echo "📥 downloading code-server (~100MB)..."
  curl -fsSL -o /tmp/giecko-code.tar.gz "$url" || return 1
}
pip_trzsz() {
  (command -v trz >/dev/null 2>&1 && command -v tsz >/dev/null 2>&1) && return 0
  command -v python3 >/dev/null 2>&1 || return 0
  echo "📥 installing trzsz (fast file transfer)..."
  python3 -m pip install -q --user --break-system-packages trzsz 2>/dev/null \
    || echo "⚠️  trzsz install failed, ZMODEM (sz/rz) still available"
}

apt_job & AP=$!
dl_cloudflared & P1=$!
dl_ttyd & P2=$!
dl_code & P3=$!
pip_trzsz & P4=$!
wait $AP || echo "⚠️  apt job had issues"
wait $P1 || fail "cloudflared download failed"
wait $P2 || fail "ttyd download failed"
wait $P3 || fail "code-server download failed"
wait $P4 || true
cloudflared --version
ttyd --version

CODE_BIN=""
if [ "$STACK" = "ide" ]; then
  echo "📂 extracting code-server..."
  rm -rf /tmp/code-server-*-linux-amd64
  tar -xzf /tmp/giecko-code.tar.gz -C /tmp || fail "code-server extract failed"
  CODE_BIN="$(echo /tmp/code-server-*-linux-amd64/bin/code-server | head -n 1)"
  [ -x "$CODE_BIN" ] || fail "code-server binary not found after extract"
  "$CODE_BIN" --version | head -n 1
fi

# giecko CLI
if [ -f "$SCRIPT_DIR/giecko" ]; then
  priv cp "$SCRIPT_DIR/giecko" "$BIN_DIR/giecko" && priv chmod +x "$BIN_DIR/giecko" && echo "✅ giecko CLI installed"
else
  echo "⚠️  scripts/giecko not found next to installer, 'giecko save' disabled"
fi
command -v tmux >/dev/null 2>&1 || echo "⚠️  no tmux, shell won't persist across reconnects"

# ------------------------------------------------------- fun boot banner
if command -v fastfetch >/dev/null 2>&1; then fastfetch --logo none 2>/dev/null | head -n 12 || true; fi
cat <<'BANNER'
   ____ _           _
  / ___(_) ___  ___| | _____
 | |  _| |/ _ \/ __| |/ / _ \
 | |_| | |  __/ (__|   < (_) |
  \____|_|\___|\___|_|\_\___/
  virtual dev environment 🦎
BANNER
uname -a
echo ""

# ------------------------------------------------------------- shell candy
install_shell_candy() {
  local snip="$RUNDIR/shell.sh"
  cat > "$snip" <<EOF
# 🦎 Giecko shell candy (safe to delete)
[ -f "$ENV_FILE" ] && . "$ENV_FILE"
export PATH="\$HOME/.local/bin:/usr/local/bin:\$PATH"
alias ll='ls -la' gs='git status --short --branch' save='giecko save' 2>/dev/null || true
if [ -n "\$PS1" ]; then export PS1='🦎 \[\e[1;32m\]giecko\[\e[0m\]:\[\e[1;34m\]\W\[\e[0m\]\$ '; fi
giecko_motd() {
  echo "🦎 Giecko run \$GIECKO_RUN_ID · region \$GIECKO_REGION · stack \$GIECKO_STACK"
  [ -n "\$GIECKO_URL_TERM" ] && echo "   terminal: \$GIECKO_URL_TERM"
  [ -n "\$GIECKO_URL_CODE" ] && echo "   vscode:   \$GIECKO_URL_CODE"
  echo "   save work: giecko save · download: tsz <file> · upload: trz (or drag-drop)"
}
case \$- in *i*) giecko_motd 2>/dev/null || true;; esac
EOF
  if [ "$CAN_ROOT" = 1 ]; then
    priv cp "$snip" /etc/profile.d/giecko.sh || true
    grep -q "profile.d/giecko.sh" "$HOME/.bashrc" 2>/dev/null \
      || echo '[ -f /etc/profile.d/giecko.sh ] && . /etc/profile.d/giecko.sh' >> "$HOME/.bashrc"
  else
    cp "$snip" "$HOME/.giecko.sh"
    grep -q ".giecko.sh" "$HOME/.bashrc" 2>/dev/null \
      || echo '[ -f $HOME/.giecko.sh ] && . $HOME/.giecko.sh' >> "$HOME/.bashrc"
  fi
}
install_shell_candy || true

# --------------------------------------------------------------- start ttyd
if command -v tmux >/dev/null 2>&1; then SHELL_CMD="tmux new -A -s giecko"; else SHELL_CMD="bash -l"; fi
CURL_AUTH=()
TTYD_OPTS=(-p "$TERM_PORT" --writable)
if [ -n "$PASSWORD" ]; then
  TTYD_OPTS+=(-c "$USER:$PASSWORD")
  CURL_AUTH=(-u "$USER:$PASSWORD")
fi
TTYD_OPTS+=(
  -t 'fontSize=15'
  -t 'fontFamily=JetBrains Mono, Fira Code, Menlo, Consolas, monospace'
  -t 'theme={"background":"#0B0F14","foreground":"#E6EDF3","cursor":"#FFB454","selection":"#1E3A5F"}'
  -t 'titleFixed=Giecko Terminal'
)
echo "🖥️  starting ttyd on :$TERM_PORT (cmd: $SHELL_CMD)..."
rm -f "$RUNDIR"/ttyd.log "$RUNDIR"/ttyd.pid
# shellcheck disable=SC2086
nohup ttyd "${TTYD_OPTS[@]}" $SHELL_CMD > "$RUNDIR/ttyd.log" 2>&1 &
echo "$!" > "$RUNDIR/ttyd.pid"
echo "⏳ waiting for ttyd..."
up=0
for _ in $(seq 1 20); do http_up "$TERM_PORT" "${CURL_AUTH[@]}" && { up=1; break; }; sleep 1; done
[ "$up" = 1 ] || { echo "❌ ttyd failed. Log:"; cat "$RUNDIR/ttyd.log"; fail "ttyd failed to start"; }
echo "✅ ttyd is up"

# ---------------------------------------------------------- start code-server
if [ "$STACK" = "ide" ]; then
  echo "💻 starting code-server on :$CODE_PORT..."
  rm -f "$RUNDIR"/code-server.log "$RUNDIR"/code.pid
  PASSWORD="$PASSWORD" nohup "$CODE_BIN" --bind-addr "127.0.0.1:$CODE_PORT" \
    --auth password --disable-telemetry "$WORKSPACE" > "$RUNDIR/code-server.log" 2>&1 &
  echo "$!" > "$RUNDIR/code.pid"
  echo "⏳ waiting for code-server..."
  up=0
  for _ in $(seq 1 45); do http_up "$CODE_PORT" && { up=1; break; }; sleep 2; done
  if [ "$up" = 1 ]; then CODE_OK=1; echo "✅ code-server is up"; else echo "⚠️  code-server didn't start, continuing terminal-only:"; tail -n 10 "$RUNDIR/code-server.log" || true; fi
fi

# --------------------------------------------------------------- tunnels
start_tunnel() { # $1=port $2=log $3=pidfile
  rm -f "$2" "$3"
  nohup cloudflared tunnel --url "http://127.0.0.1:$1" --no-autoupdate > "$2" 2>&1 &
  echo "$!" > "$3"
}
wait_tunnel() { # $1=log $2=pidfile → prints URL or empty
  local url="" i
  for i in $(seq 1 60); do
    url=$(tunnel_url "$1")
    [ -n "$url" ] && { echo "$url"; return 0; }
    kill -0 "$(cat "$2" 2>/dev/null)" 2>/dev/null || return 1
    sleep 2
  done
  return 1
}

echo "☁️  opening terminal tunnel..."
start_tunnel "$TERM_PORT" "$RUNDIR/term-tunnel.log" "$RUNDIR/term-tunnel.pid"
URL_TERM=$(wait_tunnel "$RUNDIR/term-tunnel.log" "$RUNDIR/term-tunnel.pid") \
  || { echo "❌ terminal tunnel failed. Log:"; cat "$RUNDIR/term-tunnel.log"; fail "terminal tunnel failed"; }

if [ "$CODE_OK" = 1 ]; then
  echo "☁️  opening vscode tunnel..."
  start_tunnel "$CODE_PORT" "$RUNDIR/code-tunnel.log" "$RUNDIR/code-tunnel.pid"
  URL_CODE=$(wait_tunnel "$RUNDIR/code-tunnel.log" "$RUNDIR/code-tunnel.pid" || true)
  [ -n "$URL_CODE" ] || { echo "⚠️  vscode tunnel failed, continuing terminal-only"; CODE_OK=0; }
fi

# ------------------------------------------------- env file for shells
{
  echo "GIECKO_URL_TERM='$URL_TERM'"
  echo "GIECKO_URL_CODE='$URL_CODE'"
  echo "GIECKO_USER='$USER'"
  echo "GIECKO_RUN_ID='$RUN_ID'"
  echo "GIECKO_REGION='$REGION'"
  echo "GIECKO_STACK='$STACK'"
} > /tmp/giecko.env && (priv mv /tmp/giecko.env "$ENV_FILE" || mv /tmp/giecko.env "$ENV_FILE") || true

# ---------------------------------------------------------------- GO LIVE
BOOT_SECS=$((SECONDS - BOOT_START))
cat <<EOF

============================================================
 🦎  GIECKO IS LIVE! (booted in ${BOOT_SECS}s)
============================================================
 🖥️   terminal: $URL_TERM
EOF
[ -n "$URL_CODE" ] && echo " 💻  vscode:    $URL_CODE"
cat <<EOF
 👤  login: $USER / (your workflow password)
 🌍  runner region: $REGION — typing lag ≈ your distance to here
 ⏱️   alive ~${DURATION_MIN} min · 💾 backup: run 'giecko save' (autosave: $([ "${AUTOSAVE_MIN:-0}" -gt 0 ] 2>/dev/null && echo "every ${AUTOSAVE_MIN}m" || echo "off"))
============================================================
EOF
if command -v qrencode >/dev/null 2>&1; then
  echo "📱 scan for terminal:"
  qrencode -t ANSIUTF8 -m 1 "$URL_TERM" || true
  if [ -n "$URL_CODE" ]; then echo "📱 scan for vscode:"; qrencode -t ANSIUTF8 -m 1 "$URL_CODE" || true; fi
fi
echo "💡 code feels laggy in raw terminal? Use the vscode URL — the editor types instantly."
echo ""

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## 🦎 Giecko is live!"
    echo ""
    echo "| | |"
    echo "|---|---|"
    echo "| **Terminal** | [$URL_TERM]($URL_TERM) |"
    [ -n "$URL_CODE" ] && echo "| **VS Code** | [$URL_CODE]($URL_CODE) |"
    echo "| **Login** | \`$USER\` + your workflow password |"
    echo "| **Region** | \`$REGION\` |"
    echo "| **Stack** | \`$STACK\` |"
    echo "| **Expires in** | ~${DURATION_MIN} min |"
    echo ""
    echo "💾 Save work with \`giecko save\` · 📥 download files with \`tsz <file>\` · 📤 upload with \`trz\`"
  } >> "$GITHUB_STEP_SUMMARY"
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "url=$URL_TERM" >> "$GITHUB_OUTPUT"
  [ -n "$URL_CODE" ] && echo "url_code=$URL_CODE" >> "$GITHUB_OUTPUT"
fi

publish_report live "booted in ${BOOT_SECS}s" || true

# ---------------------------------------------------------------- autosave
if [ "${AUTOSAVE_MIN:-0}" -gt 0 ] 2>/dev/null && command -v giecko >/dev/null 2>&1; then
  ( while true; do sleep $((AUTOSAVE_MIN * 60)); giecko save --quiet || true; done ) &
  echo "$!" > "$RUNDIR/autosave.pid"
  echo "💾 autosave armed (every ${AUTOSAVE_MIN}m)"
fi

# -------------------------------------------------------------- keep alive
END=$((SECONDS + DURATION_MIN * 60))
while [ "$SECONDS" -lt "$END" ]; do
  kill -0 "$(cat "$RUNDIR/ttyd.pid" 2>/dev/null)" 2>/dev/null || { tail -n 20 "$RUNDIR/ttyd.log" || true; fail "ttyd died mid-run"; }
  kill -0 "$(cat "$RUNDIR/term-tunnel.pid" 2>/dev/null)" 2>/dev/null || { tail -n 20 "$RUNDIR/term-tunnel.log" || true; fail "terminal tunnel died mid-run"; }
  if [ "$CODE_OK" = 1 ]; then
    if ! kill -0 "$(cat "$RUNDIR/code.pid" 2>/dev/null)" 2>/dev/null \
       || ! kill -0 "$(cat "$RUNDIR/code-tunnel.pid" 2>/dev/null)" 2>/dev/null; then
      CODE_OK=0
      [ "$CODE_WARNED" = 0 ] && { echo "⚠️  vscode side died mid-run, terminal continues"; CODE_WARNED=1; }
    fi
  fi
  HEARTBEATS=$((HEARTBEATS + 1))
  REM_MIN=$(((END - SECONDS) / 60))
  echo "💓 alive — ~${REM_MIN}m left — $URL_TERM — $(date -u '+%H:%M:%S UTC')"
  sleep 60
done

echo "⏰ time's up (${DURATION_MIN} min). Final backup..."
command -v giecko >/dev/null 2>&1 && giecko save --quiet || true
publish_report completed "$HEARTBEATS heartbeats" || true
echo "Bye! 🦎"
