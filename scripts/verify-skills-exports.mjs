#!/usr/bin/env node
/**
 * Fails if dist/index.mjs export names differ from skills/_shared/references/library-exports.json
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist", "index.mjs");
const ledgerPath = path.join(root, "skills", "_shared", "references", "library-exports.json");

if (!fs.existsSync(dist)) {
  console.error("Missing dist/index.mjs — run `pnpm run build` first.");
  process.exit(1);
}
if (!fs.existsSync(ledgerPath)) {
  console.error("Missing library-exports.json — run `pnpm run refresh:exports` after build.");
  process.exit(1);
}

const expected = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const mod = await import(pathToFileURL(dist).href);
const actual = Object.keys(mod).sort();

const a = JSON.stringify(actual);
const b = JSON.stringify(expected);
if (a !== b) {
  console.error("library-exports.json is out of sync with dist/index.mjs.");
  console.error("Run `pnpm run refresh:exports` after intentional API changes, then commit.");
  const expSet = new Set(expected);
  const actSet = new Set(actual);
  const added = actual.filter((k) => !expSet.has(k));
  const removed = expected.filter((k) => !actSet.has(k));
  if (added.length) console.error("Added exports:", added);
  if (removed.length) console.error("Removed exports:", removed);
  process.exit(1);
}
console.log(`OK: ${actual.length} runtime exports match ledger.`);
