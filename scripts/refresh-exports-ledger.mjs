#!/usr/bin/env node
/**
 * Regenerates prometheus-entity-skills/_shared/references/library-exports.json from dist/index.mjs
 * runtime exports. Run after `pnpm run build` when adding/removing value exports.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "packages", "entity-graph-react", "dist", "index.mjs");
if (!fs.existsSync(dist)) {
  console.error("Run `pnpm run build` first.");
  process.exit(1);
}
const mod = await import(pathToFileURL(dist).href);
const keys = Object.keys(mod).sort();
const out = path.join(
  root,
  "prometheus-entity-skills",
  "_shared",
  "references",
  "library-exports.json"
);
fs.writeFileSync(out, JSON.stringify(keys, null, 2) + "\n");
console.log(`Wrote ${keys.length} export names to ${path.relative(root, out)}`);
