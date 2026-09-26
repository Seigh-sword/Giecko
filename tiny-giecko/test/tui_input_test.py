import os
import pty
import select
import shutil
import socket
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(ROOT, "build", "tiny-giecko")
MOCK = os.path.join(ROOT, "test", "mock_server.py")


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def main():
    if not os.path.exists(BIN):
        print("FAIL tui input: binary missing")
        return 1
    port = free_port()
    logdir = tempfile.mkdtemp()
    logpath = os.path.join(logdir, "input.log")
    env = dict(os.environ)
    env["GG_MOCK_INPUT_LOG"] = logpath
    mock = subprocess.Popen(
        [sys.executable, MOCK, "--mode", "rfb", "--port", str(port), "--password", "test-gie"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    try:
        wait_port(port)
        return run(port, logpath)
    finally:
        mock.terminate()
        mock.wait()
        shutil.rmtree(logdir, ignore_errors=True)


def wait_port(port):
    deadline = time.time() + 10
    while time.time() < deadline:
        try:
            s = socket.create_connection(("127.0.0.1", port), 0.5)
            s.close()
            return True
        except OSError:
            time.sleep(0.1)
    return False


def run(port, logpath):
    pid, fd = pty.fork()
    if pid == 0:
        os.environ["TERM"] = "xterm-256color"
        os.execv(BIN, [BIN, "vnc://127.0.0.1:%d" % port, "--password", "test-gie", "--tui"])
    import fcntl
    import struct as st
    import termios
    fcntl.ioctl(fd, termios.TIOCSWINSZ, st.pack("HHHH", 30, 100, 0, 0))
    script = [
        (3.0, b"abc"),
        (3.5, b"\x1b[A"),
        (4.0, b"\x1b[<0;20;10M"),
        (4.1, b"\x1b[<0;20;10m"),
        (4.6, b"\x1b[<64;30;12M"),
        (4.7, b"\x1b[<0;30;12m"),
        (5.2, b"\x11"),
    ]
    start = time.time()
    si = 0
    out = b""
    status = None
    while time.time() - start < 20:
        while si < len(script) and time.time() - start >= script[si][0]:
            os.write(fd, script[si][1])
            si += 1
        r, _, _ = select.select([fd], [], [], 0.2)
        if r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                data = b""
            if not data:
                break
            out += data
        p, st2 = os.waitpid(pid, os.WNOHANG)
        if p == pid:
            status = st2
            break
    if status is None:
        deadline = time.time() + 5
        while time.time() < deadline:
            p, st2 = os.waitpid(pid, os.WNOHANG)
            if p == pid:
                status = st2
                break
            time.sleep(0.1)
    if status is None:
        os.kill(pid, 9)
        os.waitpid(pid, 0)
        print("FAIL tui input: client did not exit")
        return 1
    if status != 0:
        print("FAIL tui input: exit status %d" % status)
        return 1
    fails = 0
    text = out.decode("utf-8", "replace")
    if "GIECKO" not in text:
        print("FAIL tui input: status bar missing")
        fails += 1
    lines = []
    try:
        with open(logpath) as fh:
            lines = fh.read().splitlines()
    except OSError:
        pass
    expect = [
        "key 1 97",
        "key 0 97",
        "key 1 98",
        "key 0 98",
        "key 1 99",
        "key 0 99",
        "key 1 65362",
        "key 0 65362",
        "ptr 1 194 119",
        "ptr 0 194 119",
        "ptr 8 296 145",
        "ptr 0 296 145",
    ]
    for e in expect:
        if e not in lines:
            print("FAIL tui input: missing %s" % e)
            fails += 1
    ptrs = [l for l in lines if l.startswith("ptr ")]
    if not ptrs or not ptrs[-1].startswith("ptr 0 "):
        print("FAIL tui input: button left pressed")
        fails += 1
    if fails:
        return 1
    print("PASS tui keyboard mouse wheel")
    return 0


if __name__ == "__main__":
    sys.exit(main())
