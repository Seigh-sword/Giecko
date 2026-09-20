let cached: any = null;

async function clack(): Promise<any> {
  if (!cached) {
    const m: any = await import("@clack/prompts");
    cached = m && m.select ? m : m.default;
  }
  return cached;
}

export function interactive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function needTTY(flagHint: string): void {
  if (!interactive()) throw new Error(`not a terminal; pass ${flagHint} (see: giecko help)`);
}

export async function pick(message: string, options: Array<{ value: string; label: string }>): Promise<string> {
  const c = await clack();
  const v = await c.select({ message, options });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v as string;
}

export async function askText(message: string, initialValue?: string, validate?: (v: string) => string | undefined): Promise<string> {
  const c = await clack();
  const v = await c.text({ message, initialValue, validate });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v as string;
}

export async function askSecret(message: string): Promise<string> {
  const c = await clack();
  const v = await c.password({ message });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v as string;
}

export async function askConfirm(message: string, initialValue?: boolean): Promise<boolean> {
  const c = await clack();
  const v = await c.confirm({ message, initialValue: Boolean(initialValue) });
  if (c.isCancel(v)) throw new Error("cancelled");
  return Boolean(v);
}

export async function intro(title: string): Promise<void> {
  (await clack()).intro(title);
}

export async function outro(msg: string): Promise<void> {
  (await clack()).outro(msg);
}

export async function note(msg: string, title?: string): Promise<void> {
  (await clack()).note(msg, title || "");
}
