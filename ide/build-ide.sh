#!/bin/bash
set -e

CS_VERSION="${CS_VERSION:-4.139.1}"
GIECKO_IDE_VERSION="${GIECKO_IDE_VERSION:-0.7.0}"
IDE_ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$IDE_ROOT")"
ICON_DIR="$REPO_ROOT/assets/icons"
OUT_DIR="${OUT_DIR:-$IDE_ROOT/dist}"
WORK_DIR="${WORK_DIR:-$(mktemp -d)}"
TARGETS="${TARGETS:-linux-amd64 linux-arm64 macos-amd64 macos-arm64}"

mkdir -p "$OUT_DIR"

patch_product() {
  local vscode_dir="$1"
  local version="$2"
  python3 - "$vscode_dir/product.json" "$IDE_ROOT/product-overrides.json" "$version" <<'PYEOF'
import json
import sys

path, overrides_path, version = sys.argv[1], sys.argv[2], sys.argv[3]
product = json.load(open(path, encoding="utf-8"))
overrides = json.load(open(overrides_path, encoding="utf-8"))
for k, v in overrides.items():
    product[k] = v
product["gieckoIdeVersion"] = version
json.dump(product, open(path, "w", encoding="utf-8"), indent=2)
print("patched product.json: " + product["nameLong"])
PYEOF
}

replace_icons() {
  local vscode_dir="$1"
  local media_dir="$vscode_dir/out/browser/media"
  [ -d "$media_dir" ] || return 0
  find "$media_dir" -maxdepth 1 -type f \( -name 'favicon*' -o -name 'code.ico' -o -name 'code.png' -o -name 'default.png' \) | while read -r f; do
    case "$f" in
      *.ico) cp "$ICON_DIR/favicon.ico" "$f" ;;
      *favicon-1024*.png|*favicon-512*.png) cp "$ICON_DIR/gecko-512.png" "$f" ;;
      *favicon-256*.png) cp "$ICON_DIR/gecko-256.png" "$f" ;;
      *favicon-128*.png) cp "$ICON_DIR/gecko-128.png" "$f" ;;
      *favicon-64*.png) cp "$ICON_DIR/gecko-64.png" "$f" ;;
      *favicon-48*.png) cp "$ICON_DIR/gecko-48.png" "$f" ;;
      *favicon-32*.png) cp "$ICON_DIR/gecko-32.png" "$f" ;;
      *favicon-16*.png) cp "$ICON_DIR/gecko-16.png" "$f" ;;
      *.svg) cp "$ICON_DIR/favicon.svg" "$f" ;;
      */code.png|*/default.png) cp "$ICON_DIR/gecko-128.png" "$f" ;;
    esac
  done
  echo "  icons replaced in $media_dir"
}

strip_copilot() {
  local vscode_dir="$1"
  rm -rf "$vscode_dir/extensions/"*copilot* 2>/dev/null || true
  rm -rf "$vscode_dir/extensions/"*chat* 2>/dev/null || true
  echo "  copilot and chat extensions stripped"
}

install_extensions() {
  local cs_bin="$1"
  local ext_dir="$2"
  while read -r ext; do
    [ -z "$ext" ] && continue
    "$cs_bin" --extensions-dir "$ext_dir" --install-extension "$ext" >/dev/null 2>&1 && echo "  ext ok: $ext" || echo "  ext MISS: $ext"
  done < "$IDE_ROOT/extensions.txt"
  "$cs_bin" --extensions-dir "$ext_dir" --install-extension "$OUT_DIR/giecko-ide-$GIECKO_IDE_VERSION.vsix" >/dev/null 2>&1 && echo "  ext ok: giecko-ide" || echo "  ext MISS: giecko-ide"
}

if [ ! -f "$OUT_DIR/giecko-ide-$GIECKO_IDE_VERSION.vsix" ]; then
  echo "== building giecko-ide extension vsix"
  python3 "$IDE_ROOT/build-vsix.py"
fi

HOST_STAGE="$WORK_DIR/host"
rm -rf "$HOST_STAGE"
mkdir -p "$HOST_STAGE"
echo "== fetching host code-server (linux-amd64) for extension installs"
curl -fsSL "https://github.com/coder/code-server/releases/download/v$CS_VERSION/code-server-$CS_VERSION-linux-amd64.tar.gz" -o "$HOST_STAGE/cs.tar.gz"
tar -xzf "$HOST_STAGE/cs.tar.gz" -C "$HOST_STAGE"
HOST_CS_DIR="$(find "$HOST_STAGE" -maxdepth 1 -type d -name 'code-server-*' | head -n 1)"
[ -n "$HOST_CS_DIR" ] || { echo "  host code-server extract failed"; exit 1; }
HOST_BIN="$HOST_CS_DIR/bin/code-server"
"$HOST_BIN" --version || { echo "  host code-server unusable"; exit 1; }

for target in $TARGETS; do
  echo "== building GIECKO IDE $GIECKO_IDE_VERSION for $target (code-server $CS_VERSION)"
  stage="$WORK_DIR/$target"
  rm -rf "$stage"
  mkdir -p "$stage"
  if [ "$target" = "linux-amd64" ]; then
    cp -a "$HOST_CS_DIR" "$stage/"
  else
    url="https://github.com/coder/code-server/releases/download/v$CS_VERSION/code-server-$CS_VERSION-$target.tar.gz"
    curl -fsSL "$url" -o "$stage/cs.tar.gz"
    tar -xzf "$stage/cs.tar.gz" -C "$stage"
  fi
  cs_dir="$(find "$stage" -maxdepth 1 -type d -name 'code-server-*' | head -n 1)"
  [ -n "$cs_dir" ] || { echo "  extract failed for $target"; exit 1; }
  vscode_dir="$cs_dir/lib/vscode"
  patch_product "$vscode_dir" "$GIECKO_IDE_VERSION"
  replace_icons "$vscode_dir"
  strip_copilot "$vscode_dir"
  install_extensions "$HOST_BIN" "$vscode_dir/extensions"
  mv "$cs_dir" "$stage/giecko-ide-$GIECKO_IDE_VERSION-$target"
  tar -czf "$OUT_DIR/giecko-ide-$GIECKO_IDE_VERSION-$target.tar.gz" -C "$stage" "giecko-ide-$GIECKO_IDE_VERSION-$target"
  echo "  packaged $OUT_DIR/giecko-ide-$GIECKO_IDE_VERSION-$target.tar.gz ($(du -h "$OUT_DIR/giecko-ide-$GIECKO_IDE_VERSION-$target.tar.gz" | cut -f1))"
  rm -rf "$stage"
done

echo "GIECKO IDE build complete"
