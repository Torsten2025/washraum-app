const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const checks = [
  {
    label: "package-lock.json exists",
    ok: fs.existsSync(path.join(root, "package-lock.json"))
  },
  {
    label: ".gitignore excludes local database files",
    ok: fileIncludes(".gitignore", "data/*.sqlite") && fileIncludes(".gitignore", "node_modules/")
  },
  {
    label: "render.yaml uses persistent SQLite path",
    ok: fileIncludes("render.yaml", "SQLITE_PATH") && fileIncludes("render.yaml", "/var/data/washraum.sqlite")
  },
  {
    label: "render.yaml defines a persistent disk",
    ok: fileIncludes("render.yaml", "mountPath: /var/data") && fileIncludes("render.yaml", "sizeGB: 1")
  },
  {
    label: "Render seed passwords are configured as secrets",
    ok: renderSecret("SEED_ADMIN_PASSWORD") && renderSecret("SEED_USER_PASSWORD")
  },
  {
    label: "Production server requires explicit seed passwords",
    ok: fileIncludes("server.js", "must be set before starting production with an empty database")
  }
];

let failed = false;

for (const check of checks) {
  const prefix = check.ok ? "OK" : "FAIL";
  console.log(`${prefix} ${check.label}`);
  failed = failed || !check.ok;
}

if (failed) {
  process.exit(1);
}

function fileIncludes(relativePath, text) {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) && fs.readFileSync(fullPath, "utf8").includes(text);
}

function renderSecret(key) {
  const renderYaml = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
  const keyIndex = renderYaml.indexOf(`key: ${key}`);
  if (keyIndex === -1) {
    return false;
  }

  const nextKeyIndex = renderYaml.indexOf("\n      - key:", keyIndex + 1);
  const block = renderYaml.slice(keyIndex, nextKeyIndex === -1 ? undefined : nextKeyIndex);
  return block.includes("sync: false") && !block.includes("value:");
}
