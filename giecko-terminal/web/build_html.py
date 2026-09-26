import base64
import gzip
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")
VENDOR = os.path.join(WEB, "vendor")
TEMPLATE = os.path.join(WEB, "index.template.html")
FAVICON = os.path.join(ROOT, "..", "assets", "icons", "gecko-32.png")
OUT_HTML = os.path.join(WEB, "index.html")
OUT_HEADER = os.path.join(ROOT, "src", "html.h")


def read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def main():
    page = read(TEMPLATE)
    favicon = "data:image/png;base64," + base64.b64encode(open(FAVICON, "rb").read()).decode()
    page = page.replace("__FAVICON__", favicon)
    page = page.replace("__XTERM_CSS__", read(os.path.join(VENDOR, "xterm.css")))
    page = page.replace("__XTERM_JS__", read(os.path.join(VENDOR, "xterm.js")))
    page = page.replace("__ADDON_FIT__", read(os.path.join(VENDOR, "addon-fit.js")))
    page = page.replace("__ADDON_WEBLINKS__", read(os.path.join(VENDOR, "addon-web-links.js")))
    page = page.replace("__ADDON_UNICODE11__", read(os.path.join(VENDOR, "addon-unicode11.js")))
    page = page.replace("__ADDON_CLIPBOARD__", read(os.path.join(VENDOR, "addon-clipboard.js")))
    for marker in ["__FAVICON__", "__XTERM_CSS__", "__XTERM_JS__", "__ADDON_FIT__", "__ADDON_WEBLINKS__", "__ADDON_UNICODE11__", "__ADDON_CLIPBOARD__"]:
        if marker in page:
            print("unresolved marker: " + marker)
            return 1
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(page)
    raw = page.encode("utf-8")
    packed = gzip.compress(raw, 9)
    lines = []
    for i in range(0, len(packed), 12):
        chunk = packed[i : i + 12]
        lines.append("  " + ", ".join("0x%02x" % b for b in chunk) + ",")
    if lines:
        lines[-1] = lines[-1].rstrip(",")
    body = "unsigned char index_html[] = {\n" + "\n".join(lines) + "\n};\n"
    body += "unsigned int index_html_len = %d;\n" % len(packed)
    body += "unsigned int index_html_size = %d;\n" % len(raw)
    with open(OUT_HEADER, "w", encoding="utf-8") as fh:
        fh.write(body)
    print("index.html %d bytes -> html.h %d bytes (gzip %d)" % (len(raw), len(body), len(packed)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
