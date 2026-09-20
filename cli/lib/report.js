const { ghApiJson } = require("./run");

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function field(text, key) {
  const line = text.split("\n").find((l) => l.startsWith(`- ${key}:`));
  return line ? line.slice(key.length + 4).trim() : "";
}

function parseReport(text) {
  return {
    status: field(text, "status"),
    stack: field(text, "stack"),
    distro: field(text, "distro"),
    region: field(text, "region"),
    boot: field(text, "boot_seconds"),
    term: field(text, "url_terminal"),
    code: field(text, "url_code"),
    desk: field(text, "url_desktop"),
    work: field(text, "work_branch"),
  };
}

function isMissing(e) {
  return /404|not found/i.test((e && e.message) || "");
}

function runStatus(token, repo, runId) {
  try {
    return ghApiJson(token, `repos/${repo}/actions/runs/${runId}`).status;
  } catch (e) {
    return isMissing(e) ? "gone" : "";
  }
}

function waitFor(token, repo, runId, timeoutMs, verbose) {
  const started = Date.now();
  let tick = 0;
  while (Date.now() - started < timeoutMs) {
    try {
      const j = ghApiJson(token, `repos/${repo}/contents/reports/run-${runId}.md?ref=giecko-reports`);
      return { found: true, text: Buffer.from(j.content, "base64").toString("utf8") };
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
    const st = runStatus(token, repo, runId);
    if (st === "completed" || st === "gone") return { found: false, ended: true };
    tick++;
    if (verbose) process.stdout.write(`report poll ${tick}: not yet (run ${st || "unknown"})\n`);
    sleepMs(10000);
  }
  return { found: false, ended: false };
}

function realUrl(value) {
  return value && value.startsWith("https://") && !value.includes("*") ? value : "";
}

function showQr(url) {
  try {
    require("qrcode-terminal").generate(url, { small: true });
  } catch {
    process.stdout.write("(install dependencies to render the QR code)\n");
  }
}

module.exports = { sleepMs, parseReport, isMissing, waitFor, realUrl, showQr };
