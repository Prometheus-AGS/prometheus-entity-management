#!/usr/bin/env node
/**
 * verify-skills-ecosystem.mjs — certification verifier for v3-skills-ecosystem.
 *
 * Lanes:
 *   1. export-ledgers   — pnpm run verify:skills (all 12 npm ledgers + Dart)
 *   2. snippet-compile  — node scripts/verify-skills-snippets.mjs (packed consumer)
 *   3. release-gate     — node --test tests/release/v3-skills-ecosystem.test.mjs
 *   4. rust-tooling     — cargo test for entity-graph-cli and entity-graph-mcp
 *
 * Usage: node scripts/verify-skills-ecosystem.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const report = {
  schemaVersion: 1,
  change: "v3-skills-ecosystem",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "packed-consumer",
    countsAsPackedPackageEvidence: true,
    note: "Snippet lane compiles against packed tarballs in a temp consumer; ledger lane verifies built dists.",
  },
  commands: [],
  lanes: {
    exportLedgers: "pending",
    snippetCompile: "pending",
    releaseGate: "pending",
    rustTooling: "pending",
  },
  limits: {
    rustTooling:
      "cargo test lanes prove the CLI/MCP crates build and pass unit tests; they are not published-crate evidence.",
    externalMarketplace:
      "The official agentskills.io validator (skills-ref) is not vendored; leaf-skill packaging validation remains a manual step before external marketplace submission.",
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

const ledgers = await run("export-ledgers", "pnpm", ["run", "verify:skills"], { echo: true });
report.lanes.exportLedgers = ledgers === 0 ? "pass" : "fail";

const snippets = await run("snippet-compile", "node", ["scripts/verify-skills-snippets.mjs"], { echo: true });
report.lanes.snippetCompile = snippets === 0 ? "pass" : "fail";

const gate = await run("release-gate", "node", ["--test", "tests/release/v3-skills-ecosystem.test.mjs"], { echo: true });
report.lanes.releaseGate = gate === 0 ? "pass" : "fail";

const cliTests = await run("rust-cli-tests", "cargo", ["test", "--manifest-path", "packages/entity-graph-cli/Cargo.toml"], { echo: true });
const mcpTests = await run("rust-mcp-tests", "cargo", ["test", "--manifest-path", "packages/entity-graph-mcp/Cargo.toml"], { echo: true });
report.lanes.rustTooling = cliTests === 0 && mcpTests === 0 ? "pass" : "fail";

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:skills-ecosystem ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
