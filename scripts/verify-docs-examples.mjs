#!/usr/bin/env node
/**
 * verify-docs-examples.mjs — certification verifier for v3-docs-examples-integrations.
 *
 * Lanes:
 *   1. snippet-compile — every ts/tsx fence in site/docs (excluding generated
 *                        signature pages) compiles against the 12 packed npm
 *                        packages in a consumer project
 *   2. release-gate    — node --test tests/release/v3-docs-examples-integrations.test.mjs
 *                        (file surface, content contract, scenario-ID validity,
 *                        gate commands, runnable-source links, demo/live
 *                        separation, alt text, sidebar reachability)
 *   3. static-build    — clean `docusaurus build`; broken links/anchors throw
 *   4. example-routes  — built HTML routes for all 11 new pages exist
 *
 * Usage: node scripts/verify-docs-examples.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const EXAMPLE_ROUTES = [
  "examples/vite-react19",
  "examples/nextjs-app-router",
  "examples/agentic-a2ui",
  "examples/flutter-riverpod",
  "examples/tauri-universal",
  "integrations/websocket",
  "integrations/supabase",
  "integrations/graphql",
  "integrations/pglite-loro",
  "integrations/a2a-a2ui",
  "integrations/flint",
];

const report = {
  schemaVersion: 1,
  change: "v3-docs-examples-integrations",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "packed-consumer",
    countsAsPackedPackageEvidence: true,
    note: "Snippet-compile runs against the 12 packed npm packages in a temp consumer project; static-build proves all example/integration routes build deterministically under the GitHub Pages base path.",
  },
  commands: [],
  lanes: {
    snippetCompile: "pending",
    releaseGate: "pending",
    staticBuild: "pending",
    exampleRoutes: "pending",
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
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-examples-integrations/snippets.json",
    ],
    { echo: true },
  );
  if (exit !== 0) fail("snippetCompile", "docs snippets failed to compile against packed packages");
  else report.lanes.snippetCompile = "pass";
}

// ── Lane 2: release gate ────────────────────────────────────────────────────
{
  const exit = await run(
    "release-gate",
    "node",
    ["--test", "tests/release/v3-docs-examples-integrations.test.mjs"],
    { echo: true },
  );
  if (exit !== 0) fail("releaseGate", "release test failed");
  else report.lanes.releaseGate = "pass";
}

// ── Lane 3: static build ────────────────────────────────────────────────────
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

// ── Lane 4: example routes ──────────────────────────────────────────────────
if (report.lanes.staticBuild === "pass") {
  const missing = [];
  for (const docId of EXAMPLE_ROUTES) {
    const route = `site/build/docs/${docId}/index.html`;
    if (!(await fileExists(route))) missing.push(route);
  }
  if (missing.length > 0) fail("exampleRoutes", `missing routes: ${missing.join(", ")}`);
  else report.lanes.exampleRoutes = "pass";
}

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:docs-examples ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
