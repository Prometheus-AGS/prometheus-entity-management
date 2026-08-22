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
    releaseGate: string;
    staticBuild: string;
    exampleRoutes: string;
  };
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-examples-integrations/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-examples.mjs", "--report", reportPath], {
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

Given("the examples-integrations certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the examples-integrations certification executes", () => {
  ensureReport();
});

Then(
  "all five tutorials have architecture, setup, scenarios, test commands, platform notes, and troubleshooting",
  () => {
    // Section contract asserted by the release-gate lane.
    assert.equal(ensureReport().lanes.releaseGate, "pass");
  },
);

Then("tutorial scenario tables reference valid coverage scenario IDs", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("tutorial gates exist as root scripts and link runnable source", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("all six integration guides separate deterministic demo mode from live credentials", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("integration snippets compile against the packed packages", () => {
  assert.equal(ensureReport().lanes.snippetCompile, "pass");
  assert.equal(commandExit("snippet-compile"), 0);
});

Then("all eleven example and integration pages build under the Pages base path", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
  assert.equal(commandExit("static-build"), 0);
  assert.equal(ensureReport().lanes.exampleRoutes, "pass");
});

Then("every page is reachable from the examples sidebar", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});
