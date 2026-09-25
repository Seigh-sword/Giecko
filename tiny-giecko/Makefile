NAME = tiny-giecko
CC ?= cc
CFLAGS ?= -std=c99 -O2 -Wall -Wextra
INCLUDES = -Isrc
SRC = src/main.c src/des.c src/sha1.c src/b64.c src/net.c src/tls.c src/ws.c src/rfb.c src/display.c
HDR = src/des.h src/sha1.h src/b64.h src/net.h src/tls.h src/ws.h src/rfb.h src/display.h
BIN = build/$(NAME)

ZIG = $(shell command -v zig 2>/dev/null || true)

.PHONY: all test tls matrix clean rasp0 rasp1 rasp2 rasp3 rasp4 rasp5 linux-x86_64 linux-arm64 linux-arm win64 win-arm64 apple-silicon64 darwin-intel64 freebsd-amd64 freebsd-arm64 openbsd-amd64 netbsd-amd64 android-arm64

all: $(BIN)

$(BIN): $(SRC) $(HDR)
	@mkdir -p build
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $(SRC)

test: $(BIN)
	sh test/run_tests.sh

tls: $(SRC) $(HDR)
	@mkdir -p build
	$(CC) $(CFLAGS) $(INCLUDES) -DGG_TLS -o build/$(NAME)-tls $(SRC) -lssl -lcrypto
	TG_TLS_TESTS=1 sh -c 'cp build/$(NAME)-tls build/$(NAME) && sh test/run_tests.sh; rc=$$?; rm -f build/$(NAME); exit $$rc'

clean:
	rm -rf build

define CROSS_RULE
build/tiny-giecko-$(1): $(SRC) $(HDR)
	@mkdir -p build
ifeq ($$(ZIG),)
	@echo "zig not found: $(1) cross-builds with zig cc (https://ziglang.org)"; exit 1
else
	$(ZIG) cc -target $(2) -std=c99 -O2 -Wall -Wextra $(INCLUDES) -o $$@ $(SRC) $(3)
endif
endef

$(eval $(call CROSS_RULE,rasp0,arm-linux-musleabihf -mcpu=arm1176jzf_s))
$(eval $(call CROSS_RULE,rasp1,arm-linux-musleabihf -mcpu=arm1176jzf_s))
$(eval $(call CROSS_RULE,rasp2,arm-linux-musleabihf -mcpu=cortex_a7))
$(eval $(call CROSS_RULE,rasp3,aarch64-linux-musl -mcpu=cortex_a53))
$(eval $(call CROSS_RULE,rasp4,aarch64-linux-musl -mcpu=cortex_a72))
$(eval $(call CROSS_RULE,rasp5,aarch64-linux-musl -mcpu=cortex_a76))
$(eval $(call CROSS_RULE,linux-x86_64,x86_64-linux-musl))
$(eval $(call CROSS_RULE,linux-arm64,aarch64-linux-musl))
$(eval $(call CROSS_RULE,linux-arm,arm-linux-musleabihf))
$(eval $(call CROSS_RULE,win64,x86_64-windows-gnu,-lws2_32))
$(eval $(call CROSS_RULE,win-arm64,aarch64-windows-gnu,-lws2_32))
$(eval $(call CROSS_RULE,apple-silicon64,aarch64-macos))
$(eval $(call CROSS_RULE,darwin-intel64,x86_64-macos))
$(eval $(call CROSS_RULE,freebsd-amd64,x86_64-freebsd))
$(eval $(call CROSS_RULE,freebsd-arm64,aarch64-freebsd))
$(eval $(call CROSS_RULE,openbsd-amd64,x86_64-openbsd))
$(eval $(call CROSS_RULE,netbsd-amd64,x86_64-netbsd))
$(eval $(call CROSS_RULE,android-arm64,aarch64-linux-android))

rasp0: build/tiny-giecko-rasp0
rasp1: build/tiny-giecko-rasp1
rasp2: build/tiny-giecko-rasp2
rasp3: build/tiny-giecko-rasp3
rasp4: build/tiny-giecko-rasp4
rasp5: build/tiny-giecko-rasp5
linux-x86_64: build/tiny-giecko-linux-x86_64
linux-arm64: build/tiny-giecko-linux-arm64
linux-arm: build/tiny-giecko-linux-arm
win64: build/tiny-giecko-win64
win-arm64: build/tiny-giecko-win-arm64
apple-silicon64: build/tiny-giecko-apple-silicon64
darwin-intel64: build/tiny-giecko-darwin-intel64
freebsd-amd64: build/tiny-giecko-freebsd-amd64
freebsd-arm64: build/tiny-giecko-freebsd-arm64
openbsd-amd64: build/tiny-giecko-openbsd-amd64
netbsd-amd64: build/tiny-giecko-netbsd-amd64
android-arm64: build/tiny-giecko-android-arm64

CROSS_TARGETS = rasp0 rasp1 rasp2 rasp3 rasp4 rasp5 linux-x86_64 linux-arm64 linux-arm win64 win-arm64 apple-silicon64 darwin-intel64 freebsd-amd64 freebsd-arm64 openbsd-amd64 netbsd-amd64

matrix:
	@for t in $(CROSS_TARGETS); do echo "== $$t"; $(MAKE) $$t || exit 1; done
