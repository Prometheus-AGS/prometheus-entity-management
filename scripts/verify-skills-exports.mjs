#!/usr/bin/env node
/**
 * Fails if a selected package's dist runtime export names differ from its
 * skill-pack ledger. Pass `--pkg <id>` (see
 * scripts/skills-package-registry.mjs); the legacy flags `--sync`, `--a2ui`,
 * `--a2a` and the React default remain for backwards compatibility.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { resolveLedgerPackage } from "./skills-package-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selected = resolveLedgerPackage(process.argv);

const ledgerPath = path.join(
  root,
  "prometheus-entity-skills",
  "_shared",
  "references",
  selected.ledger,
);

if (!fs.existsSync(ledgerPath)) {
  console.error(`Missing ${selected.ledger} — run the package refresh:exports command after build.`);
  process.exit(1);
}

const multiEntry = selected.entryPoints.length > 1;
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
for (const [key, file] of selected.entryPoints) {
  const dist = path.join(root, "packages", selected.directory, "dist", file);
  if (!fs.existsSync(dist)) {
    console.error(`Missing ${selected.directory}/dist/${file} — run the package build first.`);
    process.exit(1);
  }
  const expected = multiEntry ? ledger[key] : ledger;
  if (!Array.isArray(expected)) {
    console.error(`${selected.ledger} is missing an array for ${key}.`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(dist).href);
  const actual = Object.keys(mod).sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`${selected.ledger} is out of sync with ${selected.directory}/dist/${file}.`);
    console.error("Run `pnpm run refresh:exports` after intentional API changes, then commit.");
    const expSet = new Set(expected);
    const actSet = new Set(actual);
    const added = actual.filter((name) => !expSet.has(name));
    const removed = expected.filter((name) => !actSet.has(name));
    if (added.length) console.error("Added exports:", added);
    if (removed.length) console.error("Removed exports:", removed);
    process.exit(1);
  }
  console.log(
    multiEntry
      ? `OK: ${selected.id} ${key}: ${actual.length} runtime exports match ledger.`
      : `OK: ${selected.id}: ${actual.length} runtime exports match ledger.`,
  );
}

if (selected.id === "core") {
  const subpathLedgerPath = path.join(
    root,
    "prometheus-entity-skills",
    "_shared",
    "references",
    "core-package-subpaths.json",
  );
  const packageManifestPath = path.join(root, "packages", selected.directory, "package.json");
  const subpathLedger = JSON.parse(fs.readFileSync(subpathLedgerPath, "utf8"));
  const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, "utf8"));
  const expectedJsonSubpaths = Object.entries(subpathLedger.json).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const actualJsonSubpaths = Object.entries(packageManifest.exports)
    .filter(([subpath]) => subpath.endsWith(".json"))
    .map(([subpath, target]) => [
      subpath,
      typeof target === "string" ? target : target.default,
    ])
    .sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actualJsonSubpaths) !== JSON.stringify(expectedJsonSubpaths)) {
    console.error(
      `core-package-subpaths.json is out of sync with ${selected.directory}/package.json JSON exports.`,
    );
    process.exit(1);
  }
  for (const [, target] of expectedJsonSubpaths) {
    const targetPath = path.resolve(root, "packages", selected.directory, target);
    if (!fs.existsSync(targetPath)) {
      console.error(`core-package-subpaths.json target does not exist: ${target}`);
      process.exit(1);
    }
  }
  console.log(
    `OK: core package: ${actualJsonSubpaths.length} JSON subpaths match package ledger.`,
  );
}
