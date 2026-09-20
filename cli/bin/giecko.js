#!/usr/bin/env node
require("../dist/cli").main().catch((e) => {
  process.stderr.write("Error: " + (e && e.message ? e.message : e) + "\n");
  process.exitCode = 1;
});
