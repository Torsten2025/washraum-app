const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const checks = [
  {
    label: "git working tree is clean",
    ok: git("status", "--short") === ""
  },
  {
    label: "current branch exists",
    ok: git("branch", "--show-current").length > 0
  },
  {
    label: "origin remote is configured",
    ok: git("remote", "get-url", "origin", { allowFailure: true }).length > 0
  },
  {
    label: "GitHub Actions CI workflow exists",
    ok: fs.existsSync(path.join(root, ".github", "workflows", "ci.yml"))
  },
  {
    label: "render.yaml exists",
    ok: fs.existsSync(path.join(root, "render.yaml"))
  },
  {
    label: "local SQLite data is not tracked",
    ok: !git("ls-files", "data", { allowFailure: true }).includes("data/")
  }
];

let failed = false;

for (const check of checks) {
  const prefix = check.ok ? "OK" : "FAIL";
  console.log(`${prefix} ${check.label}`);
  failed = failed || !check.ok;
}

if (failed) {
  console.log("");
  console.log("Publish check failed. Usually the next missing step is:");
  console.log("git remote add origin <your-github-repo-url>");
  console.log("git push -u origin master");
  process.exit(1);
}

function git(...args) {
  let options = {};
  if (args.length > 0 && typeof args[args.length - 1] === "object") {
    options = args.pop();
  }

  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"]
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }

    throw error;
  }
}
