#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(repositoryRoot, "packages/entity_graph_flutter");
const barrelPath = join(packageRoot, "lib/entity_graph_flutter.dart");
const defaultLedgerPath = join(
  repositoryRoot,
  "prometheus-entity-skills/_shared/references/dart-library-exports.json",
);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceName(absolutePath) {
  return relative(packageRoot, absolutePath).replaceAll("\\", "/");
}

function exportedLibraryFiles() {
  const barrel = readFileSync(barrelPath, "utf8");
  const files = [];
  for (const match of barrel.matchAll(/^export\s+'([^']+)'\s*;/gm)) {
    files.push(resolve(dirname(barrelPath), match[1]));
  }
  invariant(files.length > 0, "Dart barrel contains no export directives");

  const withParts = [...files];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/^part\s+'([^']+)'\s*;/gm)) {
      withParts.push(resolve(dirname(file), match[1]));
    }
  }
  return [...new Set(withParts)];
}

function collectDeclarations(file) {
  const source = readFileSync(file, "utf8");
  const declarations = [];
  const add = (name, kind) => {
    if (!name.startsWith("_")) declarations.push({ name, kind, source: sourceName(file) });
  };

  for (const match of source.matchAll(
    /^(?:(?:abstract|base|final|interface|sealed)\s+)*(class|enum|mixin|extension\s+type|extension)\s+([A-Za-z][A-Za-z0-9_]*)/gm,
  )) add(match[2], match[1].replaceAll(" ", "-"));

  for (const match of source.matchAll(/^typedef\s+([A-Za-z][A-Za-z0-9_]*)/gm)) {
    add(match[1], "typedef");
  }

  for (const line of source.split("\n")) {
    if (/^\s/.test(line) || /^(?:class|enum|typedef|mixin|extension|part|export|import|library)\b/.test(line)) {
      continue;
    }
    const variable = line.match(/^(?:late\s+)?(?:const|final|var)\s+(?:[^=;]+\s+)?([A-Za-z][A-Za-z0-9_]*)\s*=/);
    if (variable) {
      add(variable[1], "variable");
      continue;
    }
    const fn = line.match(/^[A-Za-z][A-Za-z0-9_<>,?. ]*\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:<[^>{;]+>)?\s*\(/);
    if (fn) add(fn[1], "function");
  }
  return declarations;
}

export function collectDartPublicApi() {
  const declarations = exportedLibraryFiles().flatMap(collectDeclarations);
  const names = new Map();
  for (const declaration of declarations) {
    const prior = names.get(declaration.name);
    invariant(
      !prior,
      `duplicate Dart public declaration ${declaration.name}: ${prior?.source} and ${declaration.source}`,
    );
    names.set(declaration.name, declaration);
  }
  return [...names.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function expectedDartLedger() {
  const manifest = readFileSync(join(packageRoot, "pubspec.yaml"), "utf8");
  const version = manifest.match(/^version:\s*(\S+)\s*$/m)?.[1];
  invariant(version, "entity_graph_flutter pubspec has no version");
  return {
    schemaVersion: "1",
    package: "entity_graph_flutter",
    version,
    library: "package:entity_graph_flutter/entity_graph_flutter.dart",
    generatedPartsIncluded: true,
    exports: collectDartPublicApi(),
  };
}

export function verifyDartLedger(ledgerPath = defaultLedgerPath) {
  invariant(existsSync(ledgerPath), `missing Dart public API ledger: ${ledgerPath}`);
  const expected = expectedDartLedger();
  const actual = JSON.parse(readFileSync(ledgerPath, "utf8"));
  invariant(
    JSON.stringify(actual) === JSON.stringify(expected),
    "Dart public API ledger is stale; run pnpm run refresh:dart-exports",
  );
  return expected;
}

function cli() {
  const args = process.argv.slice(2);
  const ledgerIndex = args.indexOf("--ledger");
  const ledgerPath = resolve(
    repositoryRoot,
    ledgerIndex >= 0 ? args[ledgerIndex + 1] : defaultLedgerPath,
  );
  invariant(ledgerIndex < 0 || args[ledgerIndex + 1], "--ledger requires a path");
  if (args.includes("--write")) {
    const ledger = expectedDartLedger();
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    process.stdout.write(`Wrote ${ledger.exports.length} Dart public declarations to ${relative(repositoryRoot, ledgerPath)}.\n`);
    return;
  }
  const ledger = verifyDartLedger(ledgerPath);
  process.stdout.write(
    `OK: ${ledger.package}@${ledger.version}: ${ledger.exports.length} public Dart declarations match the ledger.\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
