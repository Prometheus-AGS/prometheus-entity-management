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
    guideRoutes: string;
  };
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-concepts-packages/verification.json",
);
const snippetsPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-concepts-packages/snippets.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-concepts.mjs", "--report", reportPath], {
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

Given("the concepts-packages certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the concepts-packages certification executes", () => {
  ensureReport();
});

Then("every public ts snippet in the guides compiles in a packed consumer project", () => {
  assert.equal(ensureReport().lanes.snippetCompile, "pass");
  assert.equal(commandExit("snippet-compile"), 0);
});

Then("all twelve npm packages are packed for the consumer", () => {
  const snippets = JSON.parse(readFileSync(snippetsPath, "utf8")) as {
    packages: string[];
  };
  assert.equal(snippets.packages.length, 12, "expected 12 packed packages");
});

Then("all twenty-seven guide pages build under the Pages base path", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
  assert.equal(commandExit("static-build"), 0);
  assert.equal(ensureReport().lanes.guideRoutes, "pass");
});

Then("every guide page is reachable from the guides sidebar", () => {
  // Asserted structurally by tests/release/v3-docs-concepts-packages.test.mjs,
  // which runs as the release-gate lane.
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("the capability map covers every guide page with existing routes", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("no guide prescribes hooks or components calling APIs directly", () => {
  // Language gate lives in the release test (prohibition-aware line scan).
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});

Then("install instructions use pnpm from the registry only", () => {
  assert.equal(ensureReport().lanes.releaseGate, "pass");
});
