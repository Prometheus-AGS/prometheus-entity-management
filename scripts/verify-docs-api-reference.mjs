#!/usr/bin/env node
/**
 * verify-docs-api-reference.mjs — certification verifier for v3-docs-api-reference.
 *
 * Lanes:
 *   1. generate        — full regeneration (TypeDoc ×12 + dartdoc + rustdoc) with
 *                        doc-coverage policy enforcement (vanished / new
 *                        undocumented / ratchet-shrink all fail the lane)
 *   2. static-build    — clean `docusaurus build`; broken links/anchors throw
 *   3. api-routes      — built API routes for all 12 npm packages + Dart + Rust
 *                        entry pages + static artifacts under the Pages base path
 *   4. package-index   — every declared artifact (12 npm + 1 Dart + 2 Rust)
 *                        appears exactly once in the generated package index
 *
 * Usage: node scripts/verify-docs-api-reference.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const NPM_SLUGS = [
  "entity-graph-core",
  "prometheus-entity-management",
  "entity-graph-sync",
  "entity-graph-svelte",
  "entity-graph-solid",
  "entity-graph-alpine",
  "entity-graph-htmx",
  "entity-graph-web-components",
  "a2ui-react",
  "entity-graph-a2a",
  "entity-graph-tauri",
  "entity-graph-sdl",
];

const report = {
  schemaVersion: 1,
  change: "v3-docs-api-reference",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "static-build",
    countsAsPackedPackageEvidence: false,
    note: "Proves the API generator enforces the doc-coverage policy and that generated routes build deterministically under the GitHub Pages base path.",
  },
  commands: [],
  lanes: {
    generate: "pending",
    staticBuild: "pending",
    apiRoutes: "pending",
    packageIndex: "pending",
  },
  failures: [],
  limits: {
    dartCoverage:
      "The Dart lane enforces presence of all 81 ledger declarations in the dartdoc index; dartdoc index.json carries no comment-coverage signal, so Dart undocumented-export ratcheting is not enforced.",
    rustCoverage:
      "Rust lanes assert rustdoc artifacts exist and index; symbol-level coverage policy applies to npm ledgers only.",
  },
};

function run(label, command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = execFile(
      command,
      args,
      { cwd: workspaceRoot, env: { ...process.env, FORCE_COLOR: "0" }, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error && typeof error.code === "number" ? error.code : 0;
        report.commands.push({ label, command: [command, ...args].join(" "), exitCode });
        if (options.echo) {
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
        }
        resolveRun(exitCode);
      },
    );
    child.on("error", () => {
      report.commands.push({ label, command: [command, ...args].join(" "), exitCode: 1 });
      resolveRun(1);
    });
  });
}

async function fileExists(path) {
  try {
    await access(resolve(workspaceRoot, path));
    return true;
  } catch {
    return false;
  }
}

function fail(lane, message) {
  report.lanes[lane] = "fail";
  report.failures.push({ lane, message });
}

// ── Lane 1: generate (policy enforcement happens inside the generator) ──────
{
  const exit = await run(
    "generate",
    "node",
    [
      "scripts/generate-api-reference.mjs",
      "--report",
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-api-reference/generation.json",
    ],
    { echo: true },
  );
  if (exit !== 0) fail("generate", "generator failed (doc-coverage policy or artifact error)");
  else report.lanes.generate = "pass";
}

// ── Lane 2: static build ────────────────────────────────────────────────────
{
  const exit = await run(
    "static-build",
    "pnpm",
    ["--filter", "@prometheus-ags/entity-graph-docs-site", "build"],
    { echo: true },
  );
  if (exit !== 0) fail("staticBuild", "docusaurus build failed (broken links/anchors throw)");
  else report.lanes.staticBuild = "pass";
}

// ── Lane 3: API routes + artifacts ──────────────────────────────────────────
if (report.lanes.staticBuild === "pass") {
  const required = [
    "site/build/docs/api/index.html",
    "site/build/docs/api/dart/index.html",
    "site/build/docs/api/rust/index.html",
    "site/build/api/dart/index.html",
    "site/build/api/rust/entity-graph-cli/entity_graph/index.html",
    "site/build/api/rust/entity-graph-mcp/entity_graph_mcp/index.html",
    ...NPM_SLUGS.map((slug) => `site/build/docs/api/npm/${slug}/index.html`),
    ...NPM_SLUGS.map((slug) => `site/build/docs/packages/${slug}/index.html`),
  ];
  const missing = [];
  for (const route of required) {
    if (!(await fileExists(route))) missing.push(route);
  }
  if (missing.length > 0) fail("apiRoutes", `missing routes/artifacts: ${missing.join(", ")}`);
  else report.lanes.apiRoutes = "pass";
}

// ── Lane 4: package index uniqueness ────────────────────────────────────────
{
  const indexPath = "site/docs/api/index.mdx";
  if (!(await fileExists(indexPath))) {
    fail("packageIndex", "generated API index missing");
  } else {
    const index = await readFile(resolve(workspaceRoot, indexPath), "utf8");
    const artifacts = [
      ...NPM_SLUGS.map((slug) => ({
        name: slug === "prometheus-entity-management"
          ? "@prometheus-ags/prometheus-entity-management"
          : `@prometheus-ags/${slug}`,
      })),
      { name: "entity_graph_flutter" },
      { name: "entity-graph-cli" },
      { name: "entity-graph-mcp" },
    ];
    const violations = [];
    for (const { name } of artifacts) {
      const occurrences = index.split(`\`${name}\``).length - 1;
      if (occurrences !== 1) violations.push(`${name} appears ${occurrences} times`);
    }
    if (violations.length > 0) fail("packageIndex", violations.join("; "));
    else report.lanes.packageIndex = "pass";
  }
}

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:docs-api-reference ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
