#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX="${PREFIX:-/tmp/ggdeps/prefix}"
JOBS="${JOBS:-$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)}"
LWS_VER="v4.3-stable"
OS="$(uname -s)"
MACHINE="$(uname -m)"

mkdir -p "$PREFIX"

case "$OS" in
  Linux)
    sudo apt-get update -qq
    sudo apt-get install -y -qq libjson-c-dev libuv1-dev zlib1g-dev
    ;;
  Darwin)
    brew install cmake json-c libuv zlib 2>/dev/null || true
    ;;
esac

if [ ! -f "$PREFIX/lib/libwebsockets.a" ]; then
  rm -rf /tmp/lws-src /tmp/lws-build
  git clone -q --depth 1 --branch "$LWS_VER" https://github.com/warmcat/libwebsockets /tmp/lws-src
  HINTS="$PREFIX"
  if [ "$OS" = "Darwin" ]; then
    HINTS="$(brew --prefix)/opt/json-c;$(brew --prefix)/opt/libuv;$(brew --prefix)/opt/zlib;$PREFIX"
  fi
  cmake -S /tmp/lws-src -B /tmp/lws-build \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="$PREFIX" \
    -DCMAKE_PREFIX_PATH="$HINTS" \
    -DLWS_WITH_SSL=OFF \
    -DLWS_WITH_SHARED=OFF \
    -DLWS_WITH_LIBUV=ON \
    -DLWS_WITHOUT_TESTAPPS=ON
  cmake --build /tmp/lws-build -j"$JOBS"
  cmake --install /tmp/lws-build
  sed -i.bak 's/set(LIBWEBSOCKETS_LIBRARIES websockets websockets_shared)/set(LIBWEBSOCKETS_LIBRARIES websockets)/' \
    "$PREFIX/lib/cmake/libwebsockets/libwebsockets-config.cmake" 2>/dev/null || true
fi

HINTS="$PREFIX"
if [ "$OS" = "Darwin" ]; then
  HINTS="$(brew --prefix)/opt/json-c;$(brew --prefix)/opt/libuv;$(brew --prefix)/opt/zlib;$PREFIX"
fi

rm -rf "$ROOT/giecko-terminal/build"
cmake -S "$ROOT/giecko-terminal" -B "$ROOT/giecko-terminal/build" \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_PREFIX_PATH="$HINTS"
cmake --build "$ROOT/giecko-terminal/build" -j"$JOBS"

NAME=""
case "$OS" in
  Linux)
    case "$MACHINE" in
      x86_64) NAME="x86_64" ;;
      aarch64) NAME="aarch64" ;;
    esac
    ;;
  Darwin)
    case "$MACHINE" in
      arm64) NAME="darwin-arm64" ;;
      x86_64) NAME="darwin-amd64" ;;
    esac
    ;;
esac
[ -n "$NAME" ] || { echo "unknown platform $OS/$MACHINE"; exit 1; }

mkdir -p "$ROOT/ide/dist"
strip "$ROOT/giecko-terminal/build/ttyd" 2>/dev/null || true
cp "$ROOT/giecko-terminal/build/ttyd" "$ROOT/ide/dist/giecko-terminal-$NAME"
"$ROOT/ide/dist/giecko-terminal-$NAME" --version
echo "built ide/dist/giecko-terminal-$NAME"
