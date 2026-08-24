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
    snippetCompile: string;
    fixtureCompile: string;
    releaseGate: string;
    staticBuild: string;
    routes: string;
  };
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-operations-migration/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-operations.mjs", "--report", reportPath], {
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

Given("the operations-migration certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the operations-migration certification executes", () => {
  ensureReport();
});

Then(
  "both migration guides have breaking-change tables with before and after guidance",
  () => {
    // Section + before/after marker contract asserted by the release-gate lane.
    assert.equal(ensureReport().lanes.releaseGate, "pass");
  },
);

Then("every breaking change token appears in its guide", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the six upgrade validation fixtures compile against the packed packages", () => {
  assert.equal(ensureReport().lanes.fixtureCompile, "pass");
  assert.equal(commandExit("fixture-compile"), 0);
});

Then("the security page covers tenant boundaries and secret handling", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the release runbook procedures match the publish workflow and root scripts", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the remaining operations topics are covered", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("all thirteen migration and operations pages build under the Pages base path", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
  assert.equal(commandExit("static-build"), 0);
  assert.equal(ensureReport().lanes.routes, "pass");
});

Then("every page is reachable from the operations sidebar", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});
