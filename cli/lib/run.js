const { spawnSync } = require("child_process");

function sh(cmd, args, extraEnv, input) {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const r = spawnSync(cmd, args, { encoding: "utf8", env, input });
  return { ok: r.status === 0, code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function tokenEnv(token) {
  return token ? { GH_TOKEN: token } : null;
}

function haveGh() {
  return sh("gh", ["--version"]).ok;
}

function ghAuthOk(token) {
  return sh("gh", ["auth", "status"], tokenEnv(token)).ok;
}

function ghRaw(args, token) {
  const r = sh("gh", args, tokenEnv(token));
  if (!r.ok) throw new Error(`gh ${args[0]} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out;
}

function ghApi(token, endpoint, fields, method) {
  const args = ["api", endpoint];
  if (method) args.push("-X", method);
  for (const [k, v] of Object.entries(fields || {})) args.push("-f", `${k}=${String(v)}`);
  const r = sh("gh", args, tokenEnv(token));
  if (!r.ok) throw new Error(`GitHub API ${method || "GET"} ${endpoint} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out;
}

function ghApiJson(token, endpoint, fields, method) {
  const out = ghApi(token, endpoint, fields, method);
  return out ? JSON.parse(out) : null;
}

function ghPutJson(token, endpoint, obj) {
  const payload = JSON.stringify(obj);
  const r = sh("gh", ["api", endpoint, "-X", "PUT", "--input", "-"], tokenEnv(token), payload);
  if (!r.ok) throw new Error(`GitHub API PUT ${endpoint} failed [exit ${r.code}]: ${r.err || r.out || "(no output)"}`);
  return r.out ? JSON.parse(r.out) : null;
}

function openBrowser(url) {
  const plat = process.platform;
  if (plat === "darwin") return sh("open", [url]).ok;
  if (plat === "win32") return sh("cmd", ["/c", "start", "", url]).ok;
  return sh("xdg-open", [url]).ok;
}

module.exports = { sh, haveGh, ghAuthOk, ghRaw, ghApi, ghApiJson, ghPutJson, openBrowser };
