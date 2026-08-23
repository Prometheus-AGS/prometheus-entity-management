#!/usr/bin/env node
/**
 * verify-docs-pages.mjs — certification verifier for v3-docs-github-pages.
 *
 * Lanes:
 *   1. workflow-contract — node --test tests/release/v3-docs-github-pages.test.mjs
 *                          (PR build-only, main-only deploy, SHA-pinned actions,
 *                          environment protection, serialization, budgets file,
 *                          deployment URL record)
 *   2. static-build      — clean docs site build (links/anchors throw; the
 *                          build postprocess strips internal absolute paths)
 *   3. quality-gates     — scripts/verify-docs-pages-quality.mjs: search index,
 *                          deep-route probes under the Pages base path, secrets
 *                          and absolute-path scans, axe accessibility in both
 *                          themes, Lighthouse budgets + category floors
 *
 * The GitHub deployment itself is externally visible and operator-confirmed;
 * this verifier certifies everything up to the publish boundary.
 *
 * Usage: node scripts/verify-docs-pages.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const EVIDENCE_DIR =
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-github-pages";

const report = {
  schemaVersion: 1,
  change: "v3-docs-github-pages",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "local-build-and-workflow-contract",
    countsAsPackedPackageEvidence: false,
    note: "Certifies the workflow contract, deterministic static build, and production quality gates against the local build. The first live GitHub Pages deployment is an operator-confirmed action; this gate does not perform or authorize it.",
  },
  commands: [],
  lanes: {
    workflowContract: "pending",
    staticBuild: "pending",
    qualityGates: "pending",
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

function fail(lane, message) {
  report.lanes[lane] = "fail";
  report.failures.push({ lane, message });
}

// ── Lane 1: workflow contract ───────────────────────────────────────────────
{
  const exit = await run(
    "workflow-contract",
    "node",
    ["--test", "tests/release/v3-docs-github-pages.test.mjs"],
    { echo: true },
  );
  if (exit !== 0) fail("workflowContract", "release test failed");
  else report.lanes.workflowContract = "pass";
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

// ── Lane 3: production quality gates ────────────────────────────────────────
if (report.lanes.staticBuild === "pass") {
  const exit = await run(
    "quality-gates",
    "node",
    [
      "scripts/verify-docs-pages-quality.mjs",
      "--report",
      `${EVIDENCE_DIR}/quality.json`,
    ],
    { echo: true },
  );
  if (exit !== 0) fail("qualityGates", "docs pages quality gates failed");
  else report.lanes.qualityGates = "pass";
}

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:docs-pages ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
