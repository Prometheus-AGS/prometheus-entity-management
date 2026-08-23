import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  result: "pass";
  commands: Array<{ label: string; exitCode: number }>;
  lanes: {
    workflowContract: string;
    staticBuild: string;
    qualityGates: string;
  };
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-github-pages/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(20 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-pages.mjs", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: "inherit",
    timeout: 20 * 60 * 1_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

function commandExit(label: string): number | undefined {
  return ensureReport().commands.find(({ label: l }) => l === label)?.exitCode;
}

Given("the github-pages certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the github-pages certification executes", () => {
  ensureReport();
});

Then("pull requests run build and quality gates but cannot deploy", () => {
  // PR/main gating asserted by the workflow-contract lane.
  assert.equal(ensureReport().lanes.workflowContract, "pass");
});

Then("only protected main publishes to the github-pages environment", () => {
  assert.equal(ensureReport().lanes.workflowContract, "pass");
});

Then("checkout configure upload and deploy actions are SHA-pinned", () => {
  assert.equal(ensureReport().lanes.workflowContract, "pass");
});

Then("representative deep routes return non-empty 200 under the base path", () => {
  assert.equal(ensureReport().lanes.qualityGates, "pass");
  assert.equal(commandExit("quality-gates"), 0);
});

Then("the search index exists and no secrets or internal absolute paths ship", () => {
  assert.equal(ensureReport().lanes.qualityGates, "pass");
});

Then("axe finds no serious violations and Lighthouse budgets hold", () => {
  assert.equal(ensureReport().lanes.qualityGates, "pass");
});

Then("the deployment URL record matches the site configuration", () => {
  assert.equal(ensureReport().lanes.workflowContract, "pass");
});

Then("the release documentation points at the recorded URL", () => {
  assert.equal(ensureReport().lanes.workflowContract, "pass");
});
