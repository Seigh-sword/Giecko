import base64
import hashlib
import os
import socket
import ssl
import struct
import subprocess
import sys
import threading
import time

IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
FP = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25]
E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4]
PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
SBOX = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
]
PP = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]


def log_input(line):
    path = os.environ.get("GG_MOCK_INPUT_LOG", "")
    if not path:
        return
    with open(path, "a") as fh:
        fh.write(line + "\n")


def bit(v, width, n):
    return (v >> (width - n)) & 1


def keysched(key):
    cd = 0
    for i in range(56):
        cd = (cd << 1) | bit(key, 64, PC1[i])
    c = cd >> 28
    d = cd & 0x0FFFFFFF
    subs = []
    for i in range(16):
        s = SHIFTS[i]
        c = ((c << s) | (c >> (28 - s))) & 0x0FFFFFFF
        d = ((d << s) | (d >> (28 - s))) & 0x0FFFFFFF
        cd2 = (c << 28) | d
        k = 0
        for j in range(48):
            k = (k << 1) | bit(cd2, 56, PC2[j])
        subs.append(k)
    return subs


def ffunc(r, k):
    e = 0
    for i in range(48):
        e = (e << 1) | bit(r, 32, E[i])
    e ^= k
    s = 0
    for i in range(8):
        b = [bit(e, 48, i * 6 + j + 1) for j in range(6)]
        row = b[0] * 2 + b[5]
        col = b[1] * 8 + b[2] * 4 + b[3] * 2 + b[4]
        s = (s << 4) | SBOX[i][row * 16 + col]
    p = 0
    for i in range(32):
        p = (p << 1) | bit(s, 32, PP[i])
    return p


def des_block(block, subs):
    ip = 0
    for i in range(64):
        ip = (ip << 1) | bit(block, 64, IP[i])
    l = ip >> 32
    r = ip & 0xFFFFFFFF
    for i in range(16):
        l, r = r, l ^ ffunc(r, subs[i])
    pre = (r << 32) | l
    out = 0
    for i in range(64):
        out = (out << 1) | bit(pre, 64, FP[i])
    return out


def des_ecb_encrypt(data, key):
    subs = keysched(key)
    out = b""
    for i in range(0, len(data) - len(data) % 8, 8):
        b = int.from_bytes(data[i:i + 8], "big")
        out += des_block(b, subs).to_bytes(8, "big")
    return out


def vnc_key(pw):
    raw = (pw.encode()[:8]).ljust(8, b"\x00")
    out = b""
    for v in raw:
        r = 0
        for _ in range(8):
            r = (r << 1) | (v & 1)
            v >>= 1
        out += bytes([r])
    return out


assert des_block(0x0123456789ABCDEF, keysched(0x133457799BBCDFF1)) == 0x85E813540F0AB405
assert des_block(0x4E6F772069732074, keysched(0x0123456789ABCDEF)) == 0x3FA40E8A984D4815
assert vnc_key("test-gie").hex() == "2ea6ce2eb4e696a6"

WIDTH = 1024
HEIGHT = 768


def serve_rfb(read, write, password, open_session):
    write(b"RFB 003.008\n")
    ver = read(12)
    if ver[:4] != b"RFB ":
        return
    if open_session:
        write(bytes([1, 1]))
    else:
        write(bytes([1, 2]))
    choice = read(1)[0]
    if choice == 2:
        if open_session:
            return
        challenge = os.urandom(16)
        write(challenge)
        response = read(16)
        key = int.from_bytes(vnc_key(password), "big")
        expected = des_ecb_encrypt(challenge, key)
        if response != expected:
            write(struct.pack(">I", 1) + struct.pack(">I", 13) + b"wrong password")
            return
        write(struct.pack(">I", 0))
    elif choice == 1:
        if not open_session:
            return
        write(struct.pack(">I", 0))
    else:
        return
    pf = struct.pack(">BBBBHHHBBBxxx", 32, 24, 0, 1, 255, 255, 255, 16, 8, 0)
    name = b"giecko-mock"
    write(struct.pack(">HH", WIDTH, HEIGHT) + pf + struct.pack(">I", len(name)) + name)
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            msg = read(1)
        except Exception:
            return
        if not msg:
            return
        t = msg[0]
        if t == 0:
            read(3 + 16)
        elif t == 2:
            read(1)
            n = struct.unpack(">H", read(2))[0]
            read(n * 4)
        elif t == 3:
            read(9)
            rw, rh = 64, 48
            write(struct.pack(">BBH", 0, 0, 1) + struct.pack(">HHHHi", 0, 0, rw, rh, 0) + os.urandom(rw * rh * 4))
        elif t == 4:
            body = read(7)
            log_input("key %d %d" % (body[0], struct.unpack(">I", body[3:7])[0]))
        elif t == 5:
            body = read(5)
            log_input("ptr %d %d %d" % (body[0], struct.unpack(">H", body[1:3])[0], struct.unpack(">H", body[3:5])[0]))
        else:
            return


def ws_upgrade(sock):
    req = b""
    while b"\r\n\r\n" not in req:
        chunk = sock.recv(1)
        if not chunk:
            return None
        req += chunk
    if len(req) > 8192:
        return None
    key = None
    for line in req.split(b"\r\n"):
        if line.lower().startswith(b"sec-websocket-key:"):
            key = line.split(b":", 1)[1].strip()
    if not key:
        return None
    accept = base64.b64encode(hashlib.sha1(key + b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest())
    resp = b"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + b"\r\n\r\n"
    sock.sendall(resp)
    return True


class WsIo:
    def __init__(self, sock):
        self.sock = sock
        self.buf = b""

    def read(self, n):
        while len(self.buf) < n:
            data = self._recv_frame()
            if data is None:
                raise OSError("closed")
            self.buf += data
        out = self.buf[:n]
        self.buf = self.buf[n:]
        return out

    def _recv_frame(self):
        hdr = self._read_raw(2)
        opcode = hdr[0] & 0x0F
        ln = hdr[1] & 0x7F
        if ln == 126:
            ln = struct.unpack(">H", self._read_raw(2))[0]
        elif ln == 127:
            ln = struct.unpack(">Q", self._read_raw(8))[0]
        mask = b""
        if hdr[1] & 0x80:
            mask = self._read_raw(4)
        payload = self._read_raw(ln) if ln else b""
        if mask:
            payload = bytes(payload[i] ^ mask[i % 4] for i in range(len(payload)))
        if opcode == 8:
            return None
        if opcode == 9:
            self._send_frame(10, payload)
            return b""
        return payload

    def _read_raw(self, n):
        data = b""
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise OSError("eof")
            data += chunk
        return data

    def _send_frame(self, opcode, payload):
        hdr = bytes([0x80 | opcode])
        n = len(payload)
        if n < 126:
            hdr += bytes([n])
        elif n < 65536:
            hdr += bytes([126]) + struct.pack(">H", n)
        else:
            hdr += bytes([127]) + struct.pack(">Q", n)
        self.sock.sendall(hdr + payload)

    def write(self, data):
        self._send_frame(2, data)


def handle(conn, mode, password, open_session):
    try:
        conn.settimeout(30)
        if mode in ("ws", "wstls"):
            if ws_upgrade(conn) is None:
                return
            io = WsIo(conn)
            serve_rfb(io.read, io.write, password, open_session)
        else:
            def read(n):
                data = b""
                while len(data) < n:
                    chunk = conn.recv(n - len(data))
                    if not chunk:
                        raise OSError("eof")
                    data += chunk
                return data

            serve_rfb(read, conn.sendall, password, open_session)
    except Exception as exc:
        sys.stderr.write("mock connection error: %r\n" % (exc,))
        sys.stderr.flush()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def gen_certs():
    d = os.path.dirname(os.path.abspath(__file__))
    keyf = os.path.join(d, "mock-key.pem")
    certf = os.path.join(d, "mock-cert.pem")
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-keyout", keyf, "-out", certf, "-days", "2", "-nodes", "-subj", "/CN=localhost"], check=True, capture_output=True)
    return certf, keyf


def main():
    mode = "rfb"
    port = 15900
    password = "test-gie"
    open_session = False
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--mode":
            mode = args[i + 1]
        elif args[i] == "--port":
            port = int(args[i + 1])
        elif args[i] == "--password":
            password = args[i + 1]
        elif args[i] == "--open":
            open_session = True
        i += 1
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", port))
    srv.listen(8)
    sys.stderr.write("mock %s on %d\n" % (mode, port))
    sys.stderr.flush()
    if mode == "wstls":
        certf, keyf = gen_certs()
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certf, keyf)
        while True:
            conn, _ = srv.accept()
            try:
                tls_conn = ctx.wrap_socket(conn, server_side=True)
            except Exception:
                continue
            threading.Thread(target=handle, args=(tls_conn, mode, password, open_session), daemon=True).start()
    else:
        while True:
            conn, _ = srv.accept()
            threading.Thread(target=handle, args=(conn, mode, password, open_session), daemon=True).start()


if __name__ == "__main__":
    main()
