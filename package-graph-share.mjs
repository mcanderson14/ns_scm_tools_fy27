#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_NAME = "sc-calendar-dashboard-github-pages-package";
const DEFAULT_OUT_DIR = join(PROJECT_DIR, PACKAGE_NAME);

const DIRECT_FILES = [
  "calendar-refresh.html",
  "staffing-dashboard.html",
  "calendar-dashboard-launch-helper.js",
  "scr-staffing-helper.user.js",
  "sc-calendar-dashboard-bridge.user.js",
  "netsuite-sc-roster-calendar-refresh.user.js",
  "readme.txt",
  "INSTALL.txt",
  "INSTALL-GRAPH-EXPLORER-TOKEN.md",
  "GITHUB-PAGES-SETUP.md",
  "scout-tools-manifest.json",
  "package-graph-share.mjs",
  "direct-connector-events.starter.js"
];

const STARTER_ACTIVE_FILES = [
  ["direct-connector-events.starter.js", "direct-connector-events.js"]
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out" && argv[index + 1]) {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--no-zip") {
      args.noZip = true;
    }
  }
  return args;
}

function copyRequiredFile(sourceName, targetName = sourceName) {
  const source = join(PROJECT_DIR, sourceName);
  if (!existsSync(source)) {
    throw new Error(`Required package file is missing: ${sourceName}`);
  }
  copyFileSync(source, join(outDir, targetName));
}

const args = parseArgs(process.argv.slice(2));
let outDir = args.out ? resolve(args.out) : DEFAULT_OUT_DIR;

try {
  rmSync(outDir, { recursive: true, force: true });
} catch (error) {
  if (args.out) throw error;
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  outDir = join(PROJECT_DIR, `${PACKAGE_NAME}-${stamp}`);
  rmSync(outDir, { recursive: true, force: true });
  console.warn(`Default package folder could not be replaced; writing ${outDir} instead.`);
}
mkdirSync(outDir, { recursive: true });

DIRECT_FILES.forEach(file => copyRequiredFile(file));
STARTER_ACTIVE_FILES.forEach(([source, target]) => copyRequiredFile(source, target));

writeFileSync(join(outDir, "PACKAGE-CONTENTS.txt"), [
  "SC Calendar Dashboard GitHub Pages package",
  "",
  "Start here:",
  "- INSTALL.txt",
  "- INSTALL-GRAPH-EXPLORER-TOKEN.md for Graph token details",
  "- GITHUB-PAGES-SETUP.md for GitHub Pages publishing",
  "- netsuite-sc-roster-calendar-refresh.user.js for optional NetSuite roster import",
  "- calendar-refresh.html",
  "- staffing-dashboard.html",
  "",
  "Privacy check:",
  "- direct-connector-events.js is the starter empty cache.",
  "- No Graph Explorer token is included.",
  "- Each user must sign into Graph Explorer and copy their own temporary token.",
  ""
].join("\n"));

let zipPath = null;
if (!args.noZip) {
  zipPath = `${outDir}.zip`;
  rmSync(zipPath, { force: true });
  const zip = spawnSync("zip", ["-qr", zipPath, basename(outDir)], {
    cwd: dirname(outDir),
    encoding: "utf8"
  });
  if (zip.status !== 0) {
    throw new Error(`zip failed: ${zip.stderr || zip.stdout || "unknown error"}`);
  }
}

console.log(JSON.stringify({
  packageDirectory: outDir,
  zipPath,
  files: DIRECT_FILES.length + STARTER_ACTIVE_FILES.length + 1
}, null, 2));
