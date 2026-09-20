import * as fs from "fs";
import * as path from "path";
import { interactive, askText } from "./ui";
import type { Config, Store } from "./store";

const VERSION = "v1";

function termsText(): string {
  try {
    return fs.readFileSync(path.join(__dirname, "..", "terms.txt"), "utf8");
  } catch {
    return "Giecko Terms of Use (v1): respect the GitHub and Cloudflare terms of service, keep sessions reasonable, sessions are public by URL so use a strong password, everything is ephemeral, no warranty. The full text ships as terms.txt with this package and as TERMS.md in the Giecko repository.";
  }
}

function accepted(cfg: Config): boolean {
  return cfg.termsAccepted === VERSION;
}

export async function ensureAccepted(cfg: Config, store: Store, autoAccept?: boolean): Promise<void> {
  if (accepted(cfg)) return;
  if (autoAccept) {
    cfg.termsAccepted = VERSION;
    store.save(cfg);
    return;
  }
  if (!interactive()) {
    throw new Error("terms not accepted yet; re-run with --accept-terms");
  }
  process.stdout.write("\n" + termsText() + "\n");
  const ans = await askText("Type yes to accept the Giecko terms above", "");
  if (!/^y(es)?$/i.test((ans || "").trim())) throw new Error("terms not accepted, aborting");
  cfg.termsAccepted = VERSION;
  store.save(cfg);
}
