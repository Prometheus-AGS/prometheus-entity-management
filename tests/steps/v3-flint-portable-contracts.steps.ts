import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  result: "pass";
  evidenceBoundary: {
    kind: "source-workspace";
    countsAsPackedPackageEvidence: false;
  };
  commands: Array<{ label: string; exitCode: number }>;
  lanes: {
    coreFlintContract: string;
    releaseGate: string;
    liveLaneFailClosed: string;
    coreTypecheck: string;
  };
  limits: Record<string, string>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-flint-portable-contracts/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(10 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-flint-portable-contracts.mjs", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: "inherit",
    timeout: 10 * 60 * 1_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

function commandExit(label: string): number | undefined {
  return ensureReport().commands.find(({ label: l }) => l === label)?.exitCode;
}

Given("the Flint portable-contracts certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the Flint portable-contracts certification executes", () => {
  ensureReport();
});

Then("the fixture lane round-trips a mutation into the graph", () => {
  assert.equal(ensureReport().lanes.coreFlintContract, "pass");
  assert.equal(commandExit("core-flint-contract"), 0);
});

Then("the live lane is env-gated and fails closed when unavailable", () => {
  assert.equal(ensureReport().lanes.liveLaneFailClosed, "pass");
  // The probe opts in with unresolvable module paths; a non-zero exit is the pass condition.
  assert.notEqual(commandExit("live-lane-fail-closed-probe"), 0);
});

Then("the default lane contains no machine-specific absolute paths", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
  assert.equal(commandExit("release-gate"), 0);
});

Then("subscription and mutation identity carry tenant and channel", () => {
  // Asserted by flint-security.test.ts inside the core contract lane.
  assert.equal(ensureReport().lanes.coreFlintContract, "pass");
});

Then("checkpoint keys are separated per channel and consumer", () => {
  assert.equal(ensureReport().lanes.coreFlintContract, "pass");
});

Then("malformed and wrong-kind envelopes fail closed", () => {
  assert.equal(ensureReport().lanes.coreFlintContract, "pass");
});

Then("the claims fixture pins issuer, tenant, kid, JWKS, role, and key separation", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the integration doc covers Forge provisioning, RLS, audit, restart, and the strict-JWK caveat", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("client examples expose no service-role credentials", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});
