#!/usr/bin/env node
/**
 * verify-docs-operations.mjs — certification verifier for v3-docs-operations-migration.
 *
 * Lanes:
 *   1. snippet-compile  — every ts/tsx fence in site/docs (excluding generated
 *                         signature pages) compiles against the 12 packed npm
 *                         packages in a consumer project
 *   2. fixture-compile  — the raw .ts/.tsx upgrade-validation fixtures under
 *                         tests/release/fixtures/upgrade compile against the
 *                         same packed consumer (migration recipes are not
 *                         prose-only promises)
 *   3. release-gate     — node --test tests/release/v3-docs-operations-migration.test.mjs
 *                         (file surface, front matter, section contract,
 *                         breaking-change before/after tables, fixture
 *                         references, security tenant/secret markers, runbook
 *                         ↔ automation consistency, sidebar reachability)
 *   4. static-build     — clean `docusaurus build`; broken links/anchors throw
 *   5. routes           — built HTML routes for all 13 new pages exist
 *
 * Usage: node scripts/verify-docs-operations.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const EVIDENCE_DIR =
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-operations-migration";

const OPERATIONS_ROUTES = [
  "migration/v2-to-v3",
  "migration/alpha-to-stable",
  "migration/compatibility-policy",
  "operations/release-notes",
  "operations/release-runbook",
  "operations/security",
  "operations/performance",
  "operations/testing",
  "operations/deployment",
  "operations/troubleshooting",
  "operations/faq",
  "operations/contributing",
  "operations/skills-usage",
];

const report = {
  schemaVersion: 1,
  change: "v3-docs-operations-migration",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "packed-consumer",
    countsAsPackedPackageEvidence: true,
    note: "Snippet-compile and fixture-compile run against the 12 packed npm packages in a temp consumer project; static-build proves all migration/operations routes build deterministically under the GitHub Pages base path.",
  },
  commands: [],
  lanes: {
    snippetCompile: "pending",
    fixtureCompile: "pending",
    releaseGate: "pending",
    staticBuild: "pending",
    routes: "pending",
  },
  failures: [],
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

// ── Lane 1: snippet compile (packed consumer) ───────────────────────────────
{
  const exit = await run(
    "snippet-compile",
    "node",
    [
      "scripts/verify-skills-snippets.mjs",
      "--root", "site/docs",
      "--ext", ".md,.mdx",
      "--skip", "site/docs/api/npm/|site/docs/api/index\\.mdx|site/docs/packages/(?!overview)",
      "--all-packages",
      "--report",
      `${EVIDENCE_DIR}/snippets.json`,
    ],
    { echo: true },
  );
  if (exit !== 0) fail("snippetCompile", "docs snippets failed to compile against packed packages");
  else report.lanes.snippetCompile = "pass";
}

// ── Lane 2: upgrade fixture compile (packed consumer, whole-file mode) ──────
{
  const exit = await run(
    "fixture-compile",
    "node",
    [
      "scripts/verify-skills-snippets.mjs",
      "--root", "tests/release/fixtures/upgrade",
      "--ext", ".ts,.tsx",
      "--all-packages",
      "--report",
      `${EVIDENCE_DIR}/fixtures.json`,
    ],
    { echo: true },
  );
  if (exit !== 0) fail("fixtureCompile", "upgrade validation fixtures failed to compile against packed packages");
  else report.lanes.fixtureCompile = "pass";
}

// ── Lane 3: release gate ────────────────────────────────────────────────────
{
  const exit = await run(
    "release-gate",
    "node",
    ["--test", "tests/release/v3-docs-operations-migration.test.mjs"],
    { echo: true },
  );
  if (exit !== 0) fail("releaseGate", "release test failed");
  else report.lanes.releaseGate = "pass";
}

// ── Lane 4: static build ────────────────────────────────────────────────────
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

// ── Lane 5: routes ──────────────────────────────────────────────────────────
if (report.lanes.staticBuild === "pass") {
  const missing = [];
  for (const docId of OPERATIONS_ROUTES) {
    const route = `site/build/docs/${docId}/index.html`;
    if (!(await fileExists(route))) missing.push(route);
  }
  if (missing.length > 0) fail("routes", `missing routes: ${missing.join(", ")}`);
  else report.lanes.routes = "pass";
}

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:docs-operations ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
