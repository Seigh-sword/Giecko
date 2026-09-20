import * as fs from "fs";
import * as path from "path";
import type { Config, Store } from "../store";

export function run(argv: string[], cfg: Config, store: Store): void {
  const p = path.join(__dirname, "..", "..", "CHANGELOG.md");
  process.stdout.write(fs.readFileSync(p, "utf8"));
}
