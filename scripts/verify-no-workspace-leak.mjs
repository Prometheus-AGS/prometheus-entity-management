#!/usr/bin/env node
// Fail closed if any published @prometheus-ags package carries a literal
// pnpm `workspace:` protocol in its registry manifest.
//
// Why this exists: the 3.0.0 stable run used `npm publish`, which — unlike
// `pnpm publish` — does not rewrite `workspace:` specifiers as it packs. Ten of
// the twelve packages shipped a literal "workspace:^"/"workspace:*" to the
// registry and became uninstallable. `scripts/package-contract-validation.mjs`
// already asserted this for local tarballs, but nothing checked the registry
// after a publish, so the failure was invisible until a consumer hit it.
//
// Usage:
//   node scripts/verify-no-workspace-leak.mjs                 # every package at its local version
//   node scripts/verify-no-workspace-leak.mjs 3.0.1           # pin one version
//   node scripts/verify-no-workspace-leak.mjs --local         # packed tarballs, pre-publish
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// `npm view` MUST run outside this repo. The root package.json declares
// devEngines.packageManager = pnpm, and npm refuses to run at all inside that
// tree (EBADDEVENGINES). Run from a scratch cwd, or every lookup fails and the
// gate reports "not on the registry" for packages that are demonstrably there.
const NEUTRAL_CWD = mkdtempSync(path.join(tmpdir(), "ws-leak-check-"));

const DEP_KEYS = ["dependencies", "peerDependencies", "devDependencies", "optionalDependencies"];
const root = path.resolve(import.meta.dirname, "..");
const pkgDir = path.join(root, "packages");

const publicPackages = readdirSync(pkgDir)
  .map((d) => path.join(pkgDir, d, "package.json"))
  .filter((f) => existsSync(f))
  .map((f) => ({ file: f, json: JSON.parse(readFileSync(f, "utf8")) }))
  .filter(({ json }) => json.name?.startsWith("@prometheus-ags/") && json.private !== true);

if (publicPackages.length === 0) {
  console.error("verify-no-workspace-leak: found no public @prometheus-ags packages — refusing to report success");
  process.exit(2);
}

function leaks(manifest) {
  const found = [];
  for (const key of DEP_KEYS) {
    for (const [dep, range] of Object.entries(manifest?.[key] ?? {})) {
      if (String(range).includes("workspace:")) found.push(`${key}/${dep}=${range}`);
    }
  }
  return found;
}

const pinned = process.argv.slice(2).find((a) => !a.startsWith("--"));
let failed = 0;
let checked = 0;

for (const { json } of publicPackages) {
  const version = pinned ?? json.version;
  let manifest;
  try {
    manifest = JSON.parse(
      execFileSync("npm", ["view", `${json.name}@${version}`, "--json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        cwd: NEUTRAL_CWD,
      }),
    );
  } catch {
    console.log(`  skip  ${json.name}@${version} (not on the registry)`);
    continue;
  }
  checked += 1;
  const bad = leaks(manifest);
  if (bad.length > 0) {
    failed += 1;
    console.error(`  FAIL  ${json.name}@${version}: ${bad.join(", ")}`);
  } else {
    console.log(`  ok    ${json.name}@${version}`);
  }
}

if (checked === 0) {
  console.error("verify-no-workspace-leak: nothing was actually checked — treating as failure, not success");
  process.exit(2);
}
if (failed > 0) {
  console.error(`\n${failed} of ${checked} published package(s) leaked a workspace: protocol.`);
  console.error("Republish with `pnpm publish` (npm publish does not rewrite the protocol).");
  process.exit(1);
}
console.log(`\nAll ${checked} published package(s) are free of the workspace: protocol.`);
