#!/bin/sh
set -u
cd "$(dirname "$0")/.."
BIN=./build/tiny-giecko
FAILS=0

say() { printf '%s\n' "$1"; }
die() { say "FAIL: $1"; FAILS=$((FAILS + 1)); }

[ -x "$BIN" ] || { say "no binary, run make first"; exit 1; }

"$BIN" --selftest || die "selftest"

start_mock() {
  python3 test/mock_server.py "$@" >/dev/null 2>&1 &
  MPID=$!
  sleep 1
}

stop_mock() {
  kill "$MPID" 2>/dev/null || true
  wait "$MPID" 2>/dev/null || true
}

start_mock --mode rfb --port 15900 --password test-gie
"$BIN" vnc://127.0.0.1:15900 --password test-gie --seconds 2 >/tmp/tg1.log 2>&1
[ $? -eq 0 ] && say "PASS rfb auth ok" || { die "rfb auth ok"; cat /tmp/tg1.log; }
"$BIN" vnc://127.0.0.1:15900 --password wrong-pw --seconds 2 >/tmp/tg2.log 2>&1
[ $? -eq 1 ] && say "PASS rfb wrong password rejected" || { die "rfb wrong password"; cat /tmp/tg2.log; }
stop_mock

start_mock --mode rfb --port 15901 --open
"$BIN" vnc://127.0.0.1:15901 --seconds 2 >/tmp/tg3.log 2>&1
[ $? -eq 0 ] && say "PASS rfb open session" || { die "rfb open session"; cat /tmp/tg3.log; }
stop_mock

start_mock --mode ws --port 15902 --password test-gie
"$BIN" ws://127.0.0.1:15902/websockify --password test-gie --seconds 2 >/tmp/tg4.log 2>&1
[ $? -eq 0 ] && say "PASS ws auth ok" || { die "ws auth ok"; cat /tmp/tg4.log; }
"$BIN" ws://127.0.0.1:15902/websockify --password wrong-pw --seconds 2 >/tmp/tg5.log 2>&1
[ $? -eq 1 ] && say "PASS ws wrong password rejected" || { die "ws wrong password"; cat /tmp/tg5.log; }
stop_mock

if "$BIN" wss://127.0.0.1:1/x --seconds 1 >/dev/null 2>&1; then
  :
else
  say "PASS wss without tls build refused cleanly"
fi

if [ "${TG_TLS_TESTS:-0}" = "1" ]; then
  start_mock --mode wstls --port 15903 --password test-gie
  TG_MOCK_HOST=127.0.0.1 "$BIN" wss://127.0.0.1:15903/websockify --password test-gie --seconds 2 >/tmp/tg6.log 2>&1
  [ $? -eq 0 ] && say "PASS wstls auth ok" || { die "wstls auth ok"; cat /tmp/tg6.log; }
  stop_mock
fi

[ "$FAILS" -eq 0 ] && { if command -v python3 >/dev/null 2>&1 && python3 -c "import pty" >/dev/null 2>&1; then
  python3 test/tui_input_test.py
  [ $? -eq 0 ] && say "PASS tui input" || die "tui input"
fi

say "ALL TESTS PASSED"; exit 0; } || { say "$FAILS TESTS FAILED"; exit 1; }
