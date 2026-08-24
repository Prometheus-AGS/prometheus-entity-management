import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  result: "pass";
  evidenceBoundary: {
    kind: "packed-consumer";
    countsAsPackedPackageEvidence: true;
  };
  commands: Array<{ label: string; exitCode: number }>;
  lanes: {
    exportLedgers: string;
    snippetCompile: string;
    releaseGate: string;
    rustTooling: string;
  };
  limits: Record<string, string>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-skills-ecosystem/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-skills-ecosystem.mjs", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: "inherit",
    timeout: 15 * 60 * 1_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

function commandExit(label: string): number | undefined {
  return ensureReport().commands.find(({ label: l }) => l === label)?.exitCode;
}

Given("the skills-ecosystem certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the skills-ecosystem certification executes", () => {
  ensureReport();
});

Then("all twelve npm package ledgers plus the Dart ledger validate", () => {
  assert.equal(ensureReport().lanes.exportLedgers, "pass");
  assert.equal(commandExit("export-ledgers"), 0);
});

Then("the bundle index covers every public package and the Rust tooling", () => {
  // Asserted by the release gate's bundle-index test.
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the snippet lane compiles all public TypeScript snippets in a packed consumer", () => {
  assert.equal(ensureReport().lanes.snippetCompile, "pass");
  assert.equal(commandExit("snippet-compile"), 0);
  assert.equal(ensureReport().evidenceBoundary.countsAsPackedPackageEvidence, true);
});

Then("every binding or integration claim maps to existing evidence and a real gate", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
  assert.equal(commandExit("release-gate"), 0);
});

Then("every referenced path in the skills pack exists", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("no skill doc prescribes hooks calling fetch or APIs directly", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});
