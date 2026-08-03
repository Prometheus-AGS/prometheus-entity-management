#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = join(root, "packages/entity-graph-tauri");
const runtimePath = join(packageDirectory, "dist/index.mjs");
const declarationsPath = join(packageDirectory, "dist/index.d.ts");
const defaultLedgerPath = join(
  root,
  "prometheus-entity-skills/_shared/references/tauri-library-exports.json",
);

function exportedDeclarationNames(sourceText) {
  const source = ts.createSourceFile(
    declarationsPath,
    sourceText,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const names = new Set();

  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(element.name.text);
      } else if (statement.exportClause.name) {
        names.add(statement.exportClause.name.text);
      }
      continue;
    }

    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (isExported && "name" in statement && statement.name && ts.isIdentifier(statement.name)) {
      names.add(statement.name.text);
    }
  }

  return [...names].sort();
}

export async function collectTauriPublicApi() {
  for (const path of [runtimePath, declarationsPath]) {
    if (!existsSync(path)) {
      throw new Error(`Missing ${relative(root, path)}; build the Tauri package first.`);
    }
  }

  const runtime = await import(`${pathToFileURL(runtimePath).href}?ledger=${Date.now()}`);
  return {
    package: "@prometheus-ags/entity-graph-tauri",
    entryPoint: ".",
    generatedFrom: ["dist/index.mjs", "dist/index.d.ts"],
    runtimeExports: Object.keys(runtime).sort(),
    declarationExports: exportedDeclarationNames(readFileSync(declarationsPath, "utf8")),
  };
}

function differences(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    added: actual.filter((name) => !expectedSet.has(name)),
    removed: expected.filter((name) => !actualSet.has(name)),
  };
}

export async function verifyTauriLedger(path = defaultLedgerPath) {
  if (!existsSync(path)) throw new Error(`Missing Tauri public API ledger at ${path}.`);
  const expected = JSON.parse(readFileSync(path, "utf8"));
  const actual = await collectTauriPublicApi();

  const runtimeMatches =
    JSON.stringify(expected.runtimeExports) === JSON.stringify(actual.runtimeExports);
  const declarationsMatch =
    JSON.stringify(expected.declarationExports) === JSON.stringify(actual.declarationExports);
  const metadataMatches =
    expected.package === actual.package &&
    expected.entryPoint === actual.entryPoint &&
    JSON.stringify(expected.generatedFrom) === JSON.stringify(actual.generatedFrom);

  if (!runtimeMatches || !declarationsMatch || !metadataMatches) {
    const runtime = differences(expected.runtimeExports ?? [], actual.runtimeExports);
    const declarations = differences(
      expected.declarationExports ?? [],
      actual.declarationExports,
    );
    throw new Error(
      [
        "Tauri public API ledger is stale.",
        `Runtime added: ${runtime.added.join(", ") || "none"}`,
        `Runtime removed: ${runtime.removed.join(", ") || "none"}`,
        `Declarations added: ${declarations.added.join(", ") || "none"}`,
        `Declarations removed: ${declarations.removed.join(", ") || "none"}`,
        "Run the package refresh:exports command after intentional API changes.",
      ].join("\n"),
    );
  }

  return actual;
}

async function main() {
  if (process.argv.includes("--write")) {
    const ledger = await collectTauriPublicApi();
    writeFileSync(defaultLedgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    process.stdout.write(
      `Wrote ${ledger.runtimeExports.length} runtime and ${ledger.declarationExports.length} declaration exports to ${relative(root, defaultLedgerPath)}\n`,
    );
    return;
  }

  const ledger = await verifyTauriLedger();
  process.stdout.write(
    `OK: ${ledger.runtimeExports.length} runtime and ${ledger.declarationExports.length} declaration exports match the Tauri skill ledger.\n`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
