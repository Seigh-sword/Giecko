import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import { parse, str, bool } from "../flags";
import { loadAll } from "../templates";
import type { Config, Store } from "../store";

export async function run(argv: string[], cfg: Config, store: Store): Promise<void> {
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
  const duration = str(f.duration) as string;
  if (!/^\d+$/.test(duration) || Number(duration) > 360) throw new Error(`bad --duration "${duration}" (want 0-360)`);
  const stackIn = str(f.stack) as string;
  if (!["terminal", "ide", "vscode", "desktop", "cli"].includes(stackIn)) throw new Error(`bad --stack "${stackIn}"`);
  const stack = stackIn === "cli" ? "terminal" : stackIn;
  let password = str(f.password);
  if (!password) {
    password = crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
    process.stdout.write(`generated password: ${password}\n`);
  }
  const dir = path.join(os.tmpdir(), "giecko-local");
  fs.mkdirSync(dir, { recursive: true });
  const templates = loadAll(null);
  const files: Record<string, string> = {};
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
  const args = [shPath, password, duration, String(str(f.packages) || ""), stack, String(str(f.autosave) || "0"), str(f.username) || "giecko", bool(f.mask) ? "true" : "false", str(f.distro) || "runner"];
  if (bool(f["dry-run"])) {
    process.stdout.write("dry run. Would run:\n  bash " + args.join(" ").replace(password as string, "****") + "\nfrom " + dir + "\n");
    return;
  }
  process.stdout.write(`starting local session (stack=${stack}, ${duration} min) from ${dir}\n`);
  const r = spawnSync("bash", args, { stdio: "inherit" });
  if (r.error) throw new Error("could not run bash (local mode needs bash): " + r.error.message);
  process.exitCode = r.status || 0;
}
