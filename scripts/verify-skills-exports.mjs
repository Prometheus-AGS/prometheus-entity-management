#!/usr/bin/env node
/**
 * Fails if a selected package's dist/index.mjs export names differ from its
 * skill-pack runtime export ledger. Pass `--sync` for entity-graph-sync or
 * `--a2ui` for both @prometheus-ags/a2ui-react entry points, or `--a2a` for
 * the official and legacy @prometheus-ags/entity-graph-a2a entry points; the default
 * remains the React package for backwards compatibility.
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
  ? [
      { key: ".", label: "A2UI root", file: "index.mjs" },
      { key: "./ag-ui", label: "A2UI ./ag-ui", file: "ag-ui.mjs" },
    ]
  : a2aMode
    ? [
        { key: ".", label: "A2A root", file: "index.mjs" },
        { key: "./legacy", label: "A2A ./legacy", file: "legacy.mjs" },
      ]
  : [{ key: ".", label: packageDirectory, file: "index.mjs" }];
const ledgerPath = path.join(
  root,
  "prometheus-entity-skills",
  "_shared",
  "references",
  ledgerFile,
);

if (!fs.existsSync(ledgerPath)) {
  console.error(`Missing ${ledgerFile} — run the package refresh:exports command after build.`);
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
for (const entryPoint of entryPoints) {
  const dist = path.join(root, "packages", packageDirectory, "dist", entryPoint.file);
  if (!fs.existsSync(dist)) {
    console.error(`Missing dist/${entryPoint.file} — run the package build first.`);
    process.exit(1);
  }
  const expected = a2uiMode || a2aMode ? ledger[entryPoint.key] : ledger;
  if (!Array.isArray(expected)) {
    console.error(`${ledgerFile} is missing an array for ${entryPoint.key}.`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(dist).href);
  const actual = Object.keys(mod).sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`${ledgerFile} is out of sync with ${packageDirectory}/dist/${entryPoint.file}.`);
    console.error("Run `pnpm run refresh:exports` after intentional API changes, then commit.");
    const expSet = new Set(expected);
    const actSet = new Set(actual);
    const added = actual.filter((key) => !expSet.has(key));
    const removed = expected.filter((key) => !actSet.has(key));
    if (added.length) console.error("Added exports:", added);
    if (removed.length) console.error("Removed exports:", removed);
    process.exit(1);
  }
  console.log(
    a2uiMode || a2aMode
      ? `OK: ${entryPoint.label}: ${actual.length} runtime exports match ledger.`
      : `OK: ${actual.length} runtime exports match ledger.`,
  );
}
