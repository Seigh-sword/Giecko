#!/usr/bin/env python3
import base64
import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("GIECKO_CONSOLE_PORT", "7900"))
RUNDIR = os.environ.get("GIECKO_CONSOLE_RUNDIR", os.path.join(os.getcwd(), ".giecko"))
BOOT_LOG = os.path.join(RUNDIR, "boot.log")
OWN_LOG = os.path.join(RUNDIR, "gieckovnc.log")
ICON_PATH = os.environ.get("GIECKO_CONSOLE_ICON", "")
AUTH = os.environ.get("GIECKO_CONSOLE_AUTH", "")
SESS_USER = os.environ.get("GIECKO_CONSOLE_USER", "")
DISTRO_MODE = os.environ.get("GIECKO_CONSOLE_DISTRO", "0") == "1"
END_EPOCH = int(os.environ.get("GIECKO_CONSOLE_END", "0") or 0)

try:
    UNAME = " ".join(os.uname())
except Exception:
    UNAME = sys.platform

META = {
    "run": os.environ.get("GIECKO_CONSOLE_RUN", "local"),
    "region": os.environ.get("GIECKO_CONSOLE_REGION", "unknown"),
    "stack": os.environ.get("GIECKO_CONSOLE_STACK", "?"),
    "distro": os.environ.get("GIECKO_CONSOLE_DISTRO_NAME", "runner"),
    "user": SESS_USER or "?",
    "branch": os.environ.get("GIECKO_CONSOLE_BRANCH", ""),
    "host": UNAME.split()[1] if len(UNAME.split()) > 1 else "runner",
    "os": UNAME,
    "end": END_EPOCH,
    "auth": "on" if AUTH else "off",
}


class Bus:
    def __init__(self, cap=6000):
        self.lock = threading.Lock()
        self.ring = []
        self.cap = cap
        self.seq = 0
        self.clients = []

    def publish(self, source, text):
        with self.lock:
            self.seq += 1
            event = {"i": self.seq, "s": source, "m": text}
            self.ring.append(event)
            if len(self.ring) > self.cap:
                del self.ring[: len(self.ring) - self.cap]
            for q in list(self.clients):
                try:
                    q.put_nowait(event)
                except queue.Full:
                    pass
            return event

    def snapshot(self, after_seq):
        with self.lock:
            return [e for e in self.ring if e["i"] > after_seq]

    def subscribe(self):
        q = queue.Queue(maxsize=4000)
        with self.lock:
            self.clients.append(q)
        return q

    def unsubscribe(self, q):
        with self.lock:
            if q in self.clients:
                self.clients.remove(q)


BUS = Bus()


def tail_file(source, path, from_start=True):
    def run():
        while True:
            try:
                if not os.path.exists(path):
                    time.sleep(1)
                    continue
                fh = open(path, "r", errors="replace")
                if not from_start:
                    fh.seek(0, 2)
                while True:
                    line = fh.readline()
                    if line:
                        BUS.publish(source, line.rstrip("\n"))
                        continue
                    try:
                        pos = fh.tell()
                        if os.path.getsize(path) < pos:
                            fh.close()
                            break
                    except OSError:
                        break
                    time.sleep(0.4)
                try:
                    fh.close()
                except Exception:
                    pass
            except OSError:
                pass
            time.sleep(1)

    threading.Thread(target=run, daemon=True).start()


def stream_dmesg():
    def run():
        cmd = ["dmesg", "--follow", "--time-format", "iso"]
        if os.geteuid() != 0:
            cmd = ["sudo", "-n"] + cmd
        while True:
            try:
                p = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    errors="replace",
                )
                for line in p.stdout:
                    BUS.publish("dmesg", line.rstrip("\n"))
                p.wait()
            except Exception:
                pass
            BUS.publish("dmesg", "[dmesg stream ended, retrying in 10s]")
            time.sleep(10)

    threading.Thread(target=run, daemon=True).start()


def sys_stats():
    def one():
        parts = []
        try:
            parts.append("up %s" % time.strftime("%H:%M:%S", time.gmtime(int(time.time() - kernel_boot()))))
        except Exception:
            pass
        try:
            l1 = os.getloadavg()
            parts.append("load %.2f" % l1[0])
        except Exception:
            pass
        try:
            with open("/proc/meminfo") as fh:
                mi = {}
                for line in fh:
                    k, v = line.split(":", 1)
                    mi[k] = int(v.strip().split()[0])
            total = mi.get("MemTotal", 0)
            avail = mi.get("MemAvailable", 0)
            if total:
                parts.append("mem %.0f%% free" % (100.0 * avail / total))
        except Exception:
            pass
        try:
            du = shutil.disk_usage(os.getcwd())
            parts.append("disk %.0f%% used" % (100.0 * du.used / du.total))
        except Exception:
            pass
        if END_EPOCH:
            left = int((END_EPOCH - time.time()) / 60)
            parts.append("session %d min left" % max(left, 0))
        return " · ".join(parts)

    def run():
        while True:
            BUS.publish("sys", one())
            time.sleep(5)

    threading.Thread(target=run, daemon=True).start()


def kernel_boot():
    with open("/proc/stat") as fh:
        for line in fh:
            if line.startswith("btime "):
                return int(line.split()[1])
    return time.time()


def watch_logs():
    def run():
        seen = set()
        while True:
            try:
                names = sorted(os.listdir(RUNDIR))
            except OSError:
                names = []
            for name in names:
                if not name.endswith(".log") or name in seen:
                    continue
                seen.add(name)
                if name == os.path.basename(BOOT_LOG) or name == os.path.basename(OWN_LOG):
                    continue
                src = name.replace(".log", "").replace("-tunnel", "").replace(".log", "")
                tail_file(src, os.path.join(RUNDIR, name))
            time.sleep(3)

    threading.Thread(target=run, daemon=True).start()


def new_shell_cmd():
    if DISTRO_MODE:
        if SESS_USER:
            return ["docker", "exec", "giecko-box", "su", "-", SESS_USER, "-c", "tmux kill-server"]
        return ["docker", "exec", "giecko-box", "tmux", "kill-server"]
    if SESS_USER and SESS_USER != os.environ.get("GIECKO_CONSOLE_OWNER", ""):
        if os.geteuid() == 0:
            return ["sudo", "-u", SESS_USER, "-H", "tmux", "kill-server"]
        return ["sudo", "-n", "-u", SESS_USER, "-H", "tmux", "kill-server"]
    return ["tmux", "kill-server"]


def do_new_shell():
    cmd = new_shell_cmd()
    try:
        p = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
            timeout=20,
        )
        out = (p.stdout or "").strip()
        ok = p.returncode == 0
    except Exception as e:
        out = str(e)
        ok = False
    if not ok and "no server running" in out.lower():
        ok = True
        out = "no tmux server was running"
    line = "new shell: tmux server reset" if ok else "new shell failed: %s" % out
    BUS.publish("console", line + (" (%s)" % " ".join(cmd[:6]) if not ok else ""))
    return {"ok": ok, "message": line}


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" type="image/png" href="favicon.ico">
<title>GIECKO VNC</title>
<style>
:root {
  --gg-bg: #070b12; --gg-bar: #0b111c; --gg-card: #101827; --gg-line: #1e2b42;
  --gg-text: #eaf1fb; --gg-dim: #8fa1bd; --gg-green: #3ddc84; --gg-cyan: #38d6f5;
  --gg-red: #f85149; --gg-amber: #fbbf24;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: var(--gg-bg); color: var(--gg-text);
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif; overflow: hidden; }
#gg-app { display: flex; flex-direction: column; height: 100%; }
#gg-bar { display: flex; align-items: center; gap: 10px; padding: 6px 10px;
  background: linear-gradient(180deg, #101a2b 0%, var(--gg-bar) 100%);
  border-bottom: 1px solid var(--gg-line); flex: 0 0 auto; }
#gg-dot { width: 16px; height: 16px; border-radius: 8px; flex: 0 0 auto;
  background: radial-gradient(circle at 35% 35%, #7bf0ad 0%, #3ddc84 45%, #16522e 100%);
  box-shadow: 0 0 10px #3ddc8488; }
#gg-brand { color: var(--gg-green); font-weight: 800; font-size: 14px; letter-spacing: 2.5px; white-space: nowrap; }
#gg-title { color: var(--gg-dim); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; min-width: 0; }
#gg-status { font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 9px; border-radius: 999px;
  border: 1px solid var(--gg-line); color: var(--gg-dim); white-space: nowrap; flex: 0 0 auto; }
#gg-status.live { color: var(--gg-green); border-color: #3ddc8466; background: #3ddc8418; }
#gg-status.dead { color: var(--gg-red); border-color: #f8514966; background: #f8514918; }
.gg-btn { background: var(--gg-card); color: var(--gg-dim); border: 1px solid var(--gg-line); border-radius: 8px;
  font-size: 13px; font-weight: 700; min-width: 30px; height: 30px; padding: 0 8px; cursor: pointer; flex: 0 0 auto; }
.gg-btn:active { background: #1a2740; color: var(--gg-text); }
#gg-meta { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 10px; background: var(--gg-bar);
  border-bottom: 1px solid var(--gg-line); flex: 0 0 auto; }
.gg-chip { font-size: 11px; color: var(--gg-dim); background: var(--gg-card); border: 1px solid var(--gg-line);
  border-radius: 999px; padding: 2px 10px; white-space: nowrap; cursor: pointer; user-select: none; }
.gg-chip.on { color: var(--gg-green); border-color: #3ddc8466; }
.gg-chip.off { opacity: 0.35; }
.gg-chip b { color: var(--gg-text); font-weight: 700; }
#gg-out { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 8px 10px; font-family: "JetBrains Mono", Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.5; }
.ln { white-space: pre-wrap; word-break: break-all; }
.ln .src { color: var(--gg-dim); background: #8fa1bd15; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; border-radius: 4px; padding: 0 5px; margin-right: 7px; }
.src-boot { color: var(--gg-green); background: #3ddc8415; }
.src-dmesg { color: var(--gg-cyan); background: #38d6f515; }
.src-sys { color: var(--gg-amber); background: #fbbf2415; }
.src-console { color: var(--gg-red); background: #f8514915; }
.src-ttyd, .src-code-server, .src-distro-setup, .src-novnc, .src-term, .src-code, .src-desk { color: var(--gg-dim); background: #8fa1bd15; }
#gg-foot { flex: 0 0 auto; padding: 5px 10px; background: var(--gg-bar); border-top: 1px solid var(--gg-line);
  color: var(--gg-dim); font-size: 11px; }
</style>
</head>
<body>
<div id="gg-app">
  <div id="gg-bar">
    <div id="gg-dot"></div>
    <span id="gg-brand">GIECKO</span>
    <span id="gg-title">vnc · machine console</span>
    <span id="gg-status">CONNECTING</span>
    <button class="gg-btn" id="gg-new">NEW SHELL</button>
    <button class="gg-btn" id="gg-follow">FOLLOW</button>
    <button class="gg-btn" id="gg-clear">CLEAR</button>
  </div>
  <div id="gg-meta"></div>
  <div id="gg-out"></div>
  <div id="gg-foot">gieckoVNC watches this machine live: boot log, kernel messages, service logs.
    The VM itself resets when the job ends; a real reboot or shutdown ends the run.</div>
</div>
<script>
var META = __META__;
var filters = {};
var follow = true;
var out = document.getElementById('gg-out');
var statusEl = document.getElementById('gg-status');
var metaEl = document.getElementById('gg-meta');

function chip(k, v, cls) {
  return '<span class="gg-chip' + (cls ? ' ' + cls : '') + '"><b>' + k + '</b> ' + v + '</span>';
}
metaEl.innerHTML = chip('run', META.run) + chip('region', META.region) + chip('stack', META.stack) +
  chip('distro', META.distro) + chip('user', META.user) + chip('branch', META.branch) + chip('os', META.host);

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function append(d) {
  if (filters[d.s] === false) return;
  var div = document.createElement('div');
  div.className = 'ln';
  div.setAttribute('data-src', d.s);
  div.innerHTML = '<span class="src src-' + esc(d.s) + '">' + esc(d.s) + '</span>' + esc(d.m);
  out.appendChild(div);
  while (out.childNodes.length > 4000) out.removeChild(out.firstChild);
  if (follow) out.scrollTop = out.scrollHeight;
}
metaEl.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('.gg-chip[data-src]') : null;
  if (!el) return;
  var s = el.getAttribute('data-src');
  filters[s] = !filters[s];
  el.classList.toggle('off', filters[s] === false);
  var kids = out.querySelectorAll('[data-src="' + s + '"]');
  for (var i = 0; i < kids.length; i++) kids[i].style.display = filters[s] === false ? 'none' : '';
});
var sources = ['boot', 'dmesg', 'sys', 'console'];
function addFilterChips() {
  sources.forEach(function (s) {
    var el = document.createElement('span');
    el.className = 'gg-chip on';
    el.setAttribute('data-src', s);
    el.textContent = s;
    metaEl.appendChild(el);
  });
}
addFilterChips();
var es = new EventSource('events');
es.onopen = function () { statusEl.className = 'live'; statusEl.textContent = 'LIVE'; };
es.onerror = function () { statusEl.className = 'dead'; statusEl.textContent = 'RECONNECTING'; };
es.onmessage = function (ev) {
  try { append(JSON.parse(ev.data)); } catch (e) {}
};
document.getElementById('gg-follow').addEventListener('click', function () {
  follow = !follow;
  this.style.color = follow ? '' : '#8fa1bd';
  if (follow) out.scrollTop = out.scrollHeight;
});
document.getElementById('gg-clear').addEventListener('click', function () { out.innerHTML = ''; });
document.getElementById('gg-new').addEventListener('click', function () {
  fetch('ctl', { method: 'POST', body: JSON.stringify({ action: 'newshell' }) })
    .then(function (r) { return r.json(); })
    .then(function (j) { append({ s: 'console', m: j.message }); })
    .catch(function (e) { append({ s: 'console', m: 'request failed: ' + e }); });
});
</script>
</body>
</html>
"""

ICON_BYTES = b""
try:
    with open(ICON_PATH, "rb") as _fh:
        ICON_BYTES = _fh.read()
except OSError:
    pass
PAGE = PAGE.replace("__META__", json.dumps(META))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def authed(self):
        if not AUTH:
            return True
        header = self.headers.get("Authorization", "")
        want = "Basic " + base64.b64encode(AUTH.encode()).decode()
        return header == want

    def deny(self):
        body = b"auth required\n"
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="GIECKO VNC"')
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, code, ctype, body, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(body)
        except Exception:
            pass

    def do_GET(self):
        if not self.authed():
            self.deny()
            return
        if self.path in ("/", "/index.html"):
            self.send_bytes(200, "text/html; charset=utf-8", PAGE.encode())
            return
        if self.path == "/favicon.ico":
            if ICON_BYTES:
                self.send_bytes(200, "image/png", ICON_BYTES)
            else:
                self.send_bytes(404, "image/png", b"")
            return
        if self.path.startswith("/events"):
            self.stream_events()
            return
        self.send_bytes(404, "text/plain", b"not found\n")

    def stream_events(self):
        last = self.headers.get("Last-Event-ID", "")
        try:
            after = int(last)
        except ValueError:
            after = 0
        q = BUS.subscribe()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            self.wfile.write(b": giecko vnc\n\n")
            self.wfile.flush()
            for ev in BUS.snapshot(after):
                self.write_event(ev)
            self.wfile.flush()
            idle = 0
            while True:
                try:
                    ev = q.get(timeout=5)
                    self.write_event(ev)
                    idle = 0
                except queue.Empty:
                    idle += 5
                    self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()
        except Exception:
            pass
        finally:
            BUS.unsubscribe(q)

    def write_event(self, ev):
        data = json.dumps(ev, separators=(",", ":"))
        self.wfile.write(("id: %d\ndata: %s\n\n" % (ev["i"], data)).encode())

    def do_POST(self):
        if not self.authed():
            self.deny()
            return
        if self.path != "/ctl":
            self.send_bytes(404, "text/plain", b"not found\n")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode() or "{}")
        except Exception:
            body = {}
        if body.get("action") == "newshell":
            result = do_new_shell()
            payload = json.dumps(result).encode()
        else:
            payload = json.dumps({"ok": False, "message": "unknown action"}).encode()
        self.send_bytes(200, "application/json", payload)


def main():
    os.makedirs(RUNDIR, exist_ok=True)
    tail_file("boot", BOOT_LOG, from_start=True)
    stream_dmesg()
    sys_stats()
    watch_logs()
    BUS.publish("console", "gieckoVNC watching this machine (run %s, %s on %s)" % (META["run"], META["stack"], META["distro"]))
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    BUS.publish("console", "gieckoVNC listening on 127.0.0.1:%d" % PORT)
    server.serve_forever()


if __name__ == "__main__":
    main()
