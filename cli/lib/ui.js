let cached = null;

async function clack() {
  if (!cached) {
    const m = await import("@clack/prompts");
    cached = m && m.select ? m : m.default;
  }
  return cached;
}

function interactive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function needTTY(flagHint) {
  if (!interactive()) throw new Error(`not a terminal; pass ${flagHint} (see: giecko help)`);
}

async function pick(message, options) {
  const c = await clack();
  const v = await c.select({ message, options });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v;
}

async function askText(message, initialValue, validate) {
  const c = await clack();
  const v = await c.text({ message, initialValue, validate });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v;
}

async function askSecret(message) {
  const c = await clack();
  const v = await c.password({ message });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v;
}

async function askConfirm(message, initialValue) {
  const c = await clack();
  const v = await c.confirm({ message, initialValue: Boolean(initialValue) });
  if (c.isCancel(v)) throw new Error("cancelled");
  return v;
}

async function intro(title) {
  (await clack()).intro(title);
}

async function outro(msg) {
  (await clack()).outro(msg);
}

async function note(msg, title) {
  (await clack()).note(msg, title || "");
}

module.exports = { interactive, needTTY, pick, askText, askSecret, askConfirm, intro, outro, note };
