const fs = require("fs");
const { parse } = require("../flags");

function readConfig(p) {
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeConfig(p, conf) {
  fs.writeFileSync(p, JSON.stringify(conf, null, 2) + "\n");
}

function validPluginId(id) {
  return /^gcko\.pkg(-[a-z0-9][a-z0-9._-]*)?$/i.test(String(id || ""));
}

async function run(argv, cfg) {
  const norm = [];
  let mode = null;
  for (const a of argv) {
    if (a === "-i" || a === "install" || a === "--install") mode = "i";
    else if (a === "-r" || a === "remove" || a === "--remove") mode = "r";
    else if (a === "-l" || a === "list" || a === "--list" || a === "ls") mode = "l";
    else norm.push(a);
  }
  const f = parse(norm, [["config", "str", ".giecko.json"]]);
  const conf = readConfig(f.config);
  const plugins = Array.isArray(conf.plugins) ? conf.plugins : [];
  const m = mode || "l";
  if (m === "l") {
    if (!plugins.length) process.stdout.write("no plugins installed. Add one: giecko plugin -i gcko.pkg-<name>\n");
    else plugins.forEach((p) => process.stdout.write(p + "\n"));
    return;
  }
  const id = f._[0];
  if (!id) throw new Error("usage: giecko plugin -i <package> | -r <package> | -l");
  if (!validPluginId(id)) throw new Error('invalid id: "' + id + '". plugin packages must be tagged gcko.pkg-<name>');
  if (m === "i") {
    if (!plugins.includes(id)) plugins.push(id);
    conf.plugins = plugins;
    writeConfig(f.config, conf);
    process.stdout.write("installed plugin " + id + " (applies from the next launch)\n");
  } else {
    const idx = plugins.indexOf(id);
    if (idx === -1) throw new Error("plugin not installed: " + id);
    plugins.splice(idx, 1);
    conf.plugins = plugins;
    writeConfig(f.config, conf);
    process.stdout.write("removed plugin " + id + "\n");
  }
}

module.exports = { run };
