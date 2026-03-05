#!/usr/bin/env node

import { readFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = { version: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version") {
      args.version = (argv[i + 1] || "").trim();
      i++;
    }
  }
  return args;
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

async function main() {
  const { version } = parseArgs(process.argv.slice(2));
  if (!version) {
    console.error("Missing required argument: --version X.Y.Z");
    process.exit(1);
  }
  if (!isSemver(version)) {
    console.error(`Invalid SemVer version: ${version}`);
    process.exit(1);
  }

  const pkgRaw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const pkg = JSON.parse(pkgRaw);
  const pkgVersion = String(pkg.version || "").trim();

  if (!isSemver(pkgVersion)) {
    console.error(`Invalid package.json version: ${pkgVersion}`);
    process.exit(1);
  }

  if (pkgVersion !== version) {
    console.error(
      `Version mismatch: package.json=${pkgVersion} but release tag/version=${version}.`
    );
    process.exit(1);
  }

  console.log(`Release version check passed: ${version}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
