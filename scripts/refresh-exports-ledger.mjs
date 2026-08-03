#!/usr/bin/env node
/**
 * Regenerates a package-specific skill runtime-export ledger. Pass `--sync`
 * for entity-graph-sync, `--a2ui` for both A2UI entry points, or `--a2a` for
 * the official and legacy A2A entry points; the default
 * remains the React package.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const syncMode = process.argv.includes("--sync");
const a2uiMode = process.argv.includes("--a2ui");
const a2aMode = process.argv.includes("--a2a");
if ([syncMode, a2uiMode, a2aMode].filter(Boolean).length > 1) {
  throw new Error("Choose exactly one package mode.");
}
const packageDirectory = a2uiMode
  ? "a2ui-react"
  : a2aMode
    ? "entity-graph-a2a"
    : syncMode
      ? "entity-graph-sync"
      : "entity-graph-react";
const ledgerFile = a2uiMode
  ? "a2ui-library-exports.json"
  : a2aMode
    ? "a2a-library-exports.json"
    : syncMode
      ? "sync-library-exports.json"
      : "library-exports.json";
const entryPoints = a2uiMode
  ? [[".", "index.mjs"], ["./ag-ui", "ag-ui.mjs"]]
  : a2aMode
    ? [[".", "index.mjs"], ["./legacy", "legacy.mjs"]]
  : [[".", "index.mjs"]];
const exportsByEntryPoint = {};
for (const [key, file] of entryPoints) {
  const dist = path.join(root, "packages", packageDirectory, "dist", file);
  if (!fs.existsSync(dist)) {
    console.error(`Missing dist/${file} — run the package build first.`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(dist).href);
  exportsByEntryPoint[key] = Object.keys(mod).sort();
}
const value = a2uiMode || a2aMode ? exportsByEntryPoint : exportsByEntryPoint["."];
const out = path.join(
  root,
  "prometheus-entity-skills",
  "_shared",
  "references",
  ledgerFile,
);
fs.writeFileSync(out, JSON.stringify(value, null, 2) + "\n");
const count = Object.values(exportsByEntryPoint).reduce((total, entries) => total + entries.length, 0);
console.log(`Wrote ${count} export names to ${path.relative(root, out)}`);
