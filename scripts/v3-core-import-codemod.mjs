#!/usr/bin/env node
/**
 * v3-core-import-codemod.mjs
 *
 * Rewrites relative imports in root `src/` that target modules which were moved
 * into packages/entity-graph-core/src → the bare package specifier
 * "@prometheus-ags/entity-graph-core". Imports whose target still lives in
 * src/ are left untouched.
 *
 * Deterministic: for each import specifier, resolve it against the importing
 * file's dir. If the resolved path is under packages/entity-graph-core/src AND
 * does NOT also exist under src/, rewrite. Otherwise leave it.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const CORE = path.join(ROOT, "packages", "entity-graph-core", "src");
const PKG = "@prometheus-ags/entity-graph-core";

const exts = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function existsAsModule(base) {
  for (const e of exts) if (fs.existsSync(base + e)) return true;
  return false;
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const importRe = /(from\s+|import\s+)(["'])((?:\.\.?\/)[^"']+)(["'])/g;
let filesChanged = 0;
let importsRewritten = 0;
const dryRun = process.argv.includes("--dry");

for (const file of walk(SRC)) {
  const dir = path.dirname(file);
  let src = fs.readFileSync(file, "utf8");
  let changed = false;

  src = src.replace(importRe, (full, kw, q1, spec, q2) => {
    const resolvedFromSrc = path.resolve(dir, spec);
    // Where would this same logical module live under core?
    const rel = path.relative(SRC, resolvedFromSrc); // e.g. "graph", "view/evaluator"
    if (rel.startsWith("..")) return full; // escapes src — leave
    const coreCandidate = path.join(CORE, rel);
    const srcCandidate = resolvedFromSrc;
    const inCore = existsAsModule(coreCandidate);
    const inSrc = existsAsModule(srcCandidate);
    // Rewrite ONLY if it now lives in core and no longer in src.
    if (inCore && !inSrc) {
      importsRewritten++;
      changed = true;
      return `${kw}${q1}${PKG}${q2}`;
    }
    return full;
  });

  if (changed) {
    filesChanged++;
    if (!dryRun) fs.writeFileSync(file, src);
    console.log(`${dryRun ? "[dry] " : ""}rewrote: ${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${dryRun ? "[dry] " : ""}files changed: ${filesChanged}, imports rewritten: ${importsRewritten}`);
