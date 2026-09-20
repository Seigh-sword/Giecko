const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { parse } = require("../flags");
const { loadAll } = require("../templates");

async function run(argv, cfg) {
  const f = parse(argv, [
    ["stack", "str", "terminal"],
    ["password", "str", null],
    ["duration", "str", "120"],
    ["packages", "str", ""],
    ["autosave", "str", "0"],
    ["username", "str", "giecko"],
    ["mask", "bool", false],
    ["distro", "str", "runner"],
    ["dry-run", "bool", false],
  ]);
  if (!/^\d+$/.test(f.duration) || Number(f.duration) > 360) throw new Error(`bad --duration "${f.duration}" (want 0-360)`);
  if (!["terminal", "ide", "vscode", "desktop", "cli"].includes(f.stack)) throw new Error(`bad --stack "${f.stack}"`);
  const stack = f.stack === "cli" ? "terminal" : f.stack;
  let password = f.password;
  if (!password) {
    password = crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
    process.stdout.write(`generated password: ${password}\n`);
  }
  const dir = path.join(os.tmpdir(), "giecko-local");
  fs.mkdirSync(dir, { recursive: true });
  const templates = loadAll(null);
  const files = {};
  for (const t of templates) files[t.repoPath] = t.body;
  const shBody = files["scripts/giecko.sh"];
  const boxBody = files["scripts/giecko"];
  if (!shBody || !boxBody) throw new Error("runner scripts missing from the templates");
  const shPath = path.join(dir, "giecko.sh");
  const boxPath = path.join(dir, "giecko");
  fs.writeFileSync(shPath, shBody);
  fs.writeFileSync(boxPath, boxBody);
  fs.chmodSync(shPath, 0o755);
  fs.chmodSync(boxPath, 0o755);
  const args = [shPath, password, String(f.duration), String(f.packages || ""), stack, String(f.autosave), f.username, f.mask ? "true" : "false", f.distro];
  if (f["dry-run"]) {
    process.stdout.write("dry run. Would run:\n  bash " + args.join(" ").replace(password, "****") + "\nfrom " + dir + "\n");
    return;
  }
  process.stdout.write(`starting local session (stack=${stack}, ${f.duration} min) from ${dir}\n`);
  const r = spawnSync("bash", args, { stdio: "inherit" });
  if (r.error) throw new Error("could not run bash (local mode needs bash): " + r.error.message);
  process.exitCode = r.status || 0;
}

module.exports = { run };
