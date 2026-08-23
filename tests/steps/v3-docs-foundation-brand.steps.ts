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
    configIntegrity: string;
    dependencyIsolation: string;
    brandAssets: string;
    staticBuild: string;
  };
  limits: Record<string, string>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-foundation-brand/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-docs-foundation.mjs", "--report", reportPath], {
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

Given("the docs-foundation certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the docs-foundation certification executes", () => {
  ensureReport();
});

Then("the static build succeeds with broken links failing the build", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
  assert.equal(commandExit("static-build"), 0);
});

Then("the 404, sitemap, search index, and social card routes exist", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
});

Then("the product, packages, and examples sections build", () => {
  assert.equal(ensureReport().lanes.staticBuild, "pass");
});

Then("the ember mark, favicon, and social card exist with documented provenance", () => {
  assert.equal(ensureReport().lanes.brandAssets, "pass");
});

Then("light and dark themes and logo alt text are configured", () => {
  assert.equal(ensureReport().lanes.brandAssets, "pass");
  assert.equal(ensureReport().lanes.configIntegrity, "pass");
});

Then("no publishable package depends on site-only Docusaurus dependencies", () => {
  assert.equal(ensureReport().lanes.dependencyIsolation, "pass");
});

Then("the site remains a private workspace package on one Docusaurus version", () => {
  assert.equal(ensureReport().lanes.configIntegrity, "pass");
});
