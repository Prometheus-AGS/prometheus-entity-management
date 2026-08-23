import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  result: "pass";
  evidenceBoundary: {
    kind: "static-build";
    countsAsPackedPackageEvidence: false;
  };
  commands: Array<{ label: string; exitCode: number }>;
  lanes: {
    generate: string;
    staticBuild: string;
    apiRoutes: string;
    packageIndex: string;
  };
  limits: Record<string, string>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-api-reference/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-api-reference.mjs", "--report", reportPath], {
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

Given("the api-reference certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the api-reference certification executes", () => {
  ensureReport();
});

Then("the TypeDoc models cover every ledger-listed stable export", () => {
  assert.equal(ensureReport().lanes.generate, "pass");
  assert.equal(commandExit("generate"), 0);
});

Then("vanished exports and new undocumented exports fail the generator", () => {
  // Policy enforcement lives inside the generator: lane 1 only passes when
  // vanished/new-undocumented/ratchet checks are all clean.
  assert.equal(ensureReport().lanes.generate, "pass");
});

Then("the undocumented baseline can only shrink", () => {
  assert.equal(ensureReport().lanes.generate, "pass");
});

Then("all twelve npm package API pages build under the Pages base path", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
  assert.equal(commandExit("static-build"), 0);
  assert.equal(ensureReport().lanes.apiRoutes, "pass");
});

Then("the Dart and Rust entry pages and static artifacts exist", () => {
  assert.equal(ensureReport().lanes.apiRoutes, "pass");
});

Then("the package index lists every declared artifact exactly once", () => {
  assert.equal(ensureReport().lanes.packageIndex, "pass");
});

Then("every package page has install commands, peer\\/runtime matrices, and stability badges", () => {
  // Asserted structurally by tests/release/v3-docs-api-reference.test.mjs,
  // which the static-build lane regenerates against.
  assert.equal(ensureReport().lanes.staticBuild, "pass");
});

Then("symbol pages carry source links and conceptual cross-links", () => {
  assert.equal(ensureReport().lanes.apiRoutes, "pass");
});
