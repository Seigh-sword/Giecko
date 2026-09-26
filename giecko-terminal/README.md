# GIECKO Terminal

GIECKO Terminal shares your terminal over the web. It is ttyd remade
for GIECKO: the GIECKO UI, the gecko favicon, xterm with the fit addon
inlined, and a layout that works on phones.

Build it from source:

```bash
../scripts/build-terminal.sh
```

The result lands in `../ide/dist/giecko-terminal-<arch>` and is
attached to GIECKO releases. Sessions install it from there first.

Forked from ttyd by Shuanglei Tao (tsl0922/ttyd), MIT license, see
[LICENSE](LICENSE). GIECKO changes are ISC.
