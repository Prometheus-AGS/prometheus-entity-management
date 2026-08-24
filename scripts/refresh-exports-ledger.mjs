#!/usr/bin/env node
/**
 * Regenerates a package-specific skill runtime-export ledger. Pass
 * `--pkg <id>` (see scripts/skills-package-registry.mjs for ids); the legacy
 * flags `--sync`, `--a2ui`, `--a2a` and the React default remain for backwards
 * compatibility.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { resolveLedgerPackage } from "./skills-package-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selected = resolveLedgerPackage(process.argv);

const exportsByEntryPoint = {};
for (const [key, file] of selected.entryPoints) {
  const dist = path.join(root, "packages", selected.directory, "dist", file);
  if (!fs.existsSync(dist)) {
    console.error(`Missing ${selected.directory}/dist/${file} — run the package build first.`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(dist).href);
  exportsByEntryPoint[key] = Object.keys(mod).sort();
}
const multiEntry = selected.entryPoints.length > 1;
const value = multiEntry ? exportsByEntryPoint : exportsByEntryPoint["."];
const out = path.join(
  root,
  "prometheus-entity-skills",
  "_shared",
  "references",
  selected.ledger,
);
fs.writeFileSync(out, JSON.stringify(value, null, 2) + "\n");
const count = Object.values(exportsByEntryPoint).reduce((total, entries) => total + entries.length, 0);
console.log(`Wrote ${count} export names to ${path.relative(root, out)}`);
