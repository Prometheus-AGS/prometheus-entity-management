#!/usr/bin/env node
/**
 * verify-flint-portable-contracts.mjs — certification verifier for
 * v3-flint-portable-contracts.
 *
 * Lanes:
 *   1. core-flint-contract  — vitest flint.test + flint-live (fixture lane)
 *                             + flint-security suites
 *   2. release-gate         — node --test release checks: file surface,
 *                             machine-path scan, env-gated fail-closed wiring,
 *                             claims fixture, docs consistency, examples
 *                             secret scan
 *   3. live-lane-fail-closed — probe: opt in with bogus module paths and
 *                             REQUIRE a non-zero exit (an enabled live lane
 *                             must fail when the SDK is unavailable)
 *   4. core-typecheck       — tsc --noEmit on entity-graph-core
 *
 * Usage:
 *   node scripts/verify-flint-portable-contracts.mjs [--report <path>]
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
  change: "v3-flint-portable-contracts",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "source-workspace",
    countsAsPackedPackageEvidence: false,
  },
  commands: [],
  lanes: {
    coreFlintContract: "pending",
    releaseGate: "pending",
    liveLaneFailClosed: "pending",
    coreTypecheck: "pending",
  },
  limits: {
    liveInterop:
      "Default lane is fixture-backed. Live SDK interop requires explicit opt-in via FLINT_EM_MODULE/FLINT_SDK_MODULE and the sibling flint-realtime-fabric workspace with dependencies installed; it was verified fail-closed (non-zero exit) when unavailable.",
    authVerification:
      "Issuer/kid/JWKS/role enforcement is owned by flint-gate/flint-forge; this repo pins the contract via tests/fixtures/flint-auth/claims-contract.json and docs, and does not verify tokens itself.",
  },
};

function run(label, command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = execFile(
      command,
      args,
      { cwd: workspaceRoot, env: { ...process.env, FORCE_COLOR: "0", ...(options.env ?? {}) } },
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

const coreFlint = await run(
  "core-flint-contract",
  "pnpm",
  [
    "--filter", "@prometheus-ags/entity-graph-core", "exec", "vitest", "run",
    "src/adapters/flint.test.ts",
    "src/adapters/flint-live.test.ts",
    "src/adapters/flint-security.test.ts",
  ],
  { echo: true },
);
report.lanes.coreFlintContract = coreFlint === 0 ? "pass" : "fail";

const releaseGate = await run(
  "release-gate",
  "node",
  ["--test", "tests/release/v3-flint-portable-contracts.test.mjs"],
  { echo: true },
);
report.lanes.releaseGate = releaseGate === 0 ? "pass" : "fail";

// Fail-closed probe: opting in with unresolvable module paths MUST fail.
const bogus = joinPathProbe();
const probe = await run(
  "live-lane-fail-closed-probe",
  "pnpm",
  [
    "--filter", "@prometheus-ags/entity-graph-core", "exec", "vitest", "run",
    "src/adapters/flint-live.test.ts",
  ],
  { env: { FLINT_EM_MODULE: bogus, FLINT_SDK_MODULE: bogus } },
);
report.lanes.liveLaneFailClosed = probe !== 0 ? "pass" : "fail";

function joinPathProbe() {
  return resolve(workspaceRoot, "tests/fixtures/flint-auth/__definitely-not-the-sdk__.js");
}

const typecheck = await run(
  "core-typecheck",
  "pnpm",
  ["--filter", "@prometheus-ags/entity-graph-core", "typecheck"],
);
report.lanes.coreTypecheck = typecheck === 0 ? "pass" : "fail";

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:flint-contracts ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
