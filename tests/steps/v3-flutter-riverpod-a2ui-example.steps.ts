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
  versions: Record<string, string>;
  commands: Array<{ label: string; exitCode: number }>;
  lanes: {
    analyze: string;
    format: string;
    flutterTests: string;
    androidSmoke: string;
    iosSmoke: string;
  };
  platformLimits: { compileSmokeOnly: boolean; deviceRuntime: string };
  protocol: {
    status: "pass";
    keyless: true;
    modelCredentialRequired: false;
    surfaceId: "surface-task-sync";
    approvedMutation: "task.update";
    deniedMutation: "task.delete";
    approvalGatedMutation: "task.replace";
    malformedRejected: true;
    tenantGuard: true;
  };
  scenarios: string[];
  visualEvidence: {
    goldens: Array<{ path: string; sha256: string }>;
    surfaceFixture: { path: string; sha256: string };
  };
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-riverpod-a2ui-example/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync(
    "node",
    ["scripts/verify-flutter-riverpod-a2ui-example.mjs", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      stdio: "inherit",
      timeout: 15 * 60 * 1_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

Given("the Flutter showcase certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the Flutter showcase certification executes", () => {
  ensureReport();
});

Then("the deterministic surface replays through the official genui engine", () => {
  const current = ensureReport();
  assert.equal(current.protocol.status, "pass");
  assert.equal(current.protocol.surfaceId, "surface-task-sync");
  assert.equal(current.protocol.keyless, true);
  assert.equal(current.protocol.modelCredentialRequired, false);
  assert.ok(current.versions.genui === "0.10.1");
});

Then(
  "task.update is approved, task.delete is denied, and malformed payloads are rejected",
  () => {
    const current = ensureReport();
    assert.equal(current.protocol.approvedMutation, "task.update");
    assert.equal(current.protocol.deniedMutation, "task.delete");
    assert.equal(current.protocol.malformedRejected, true);
  },
);

Then("the destructive task.replace action is gated behind human approval", () => {
  assert.equal(ensureReport().protocol.approvalGatedMutation, "task.replace");
});

Then("a foreign-tenant action is refused before any graph access", () => {
  assert.equal(ensureReport().protocol.tenantGuard, true);
});

Then("fatal-infos analysis and the full Flutter test suite pass", () => {
  const current = ensureReport();
  assert.equal(current.lanes.analyze, "pass");
  assert.equal(current.lanes.format, "pass");
  assert.equal(current.lanes.flutterTests, "pass");
  for (const command of current.commands) {
    assert.equal(command.exitCode, 0, `${command.label} failed`);
  }
});

Then("optimistic confirm and injected-failure rollback are proven in widget tests", () => {
  const current = ensureReport();
  assert.ok(current.scenarios.includes("example.crud.optimistic-confirm"));
  assert.ok(current.scenarios.includes("example.crud.optimistic-rollback"));
});

Then("the coalesced realtime burst reaches every joined view once", () => {
  assert.ok(
    ensureReport().scenarios.includes("example.realtime.coalesced-cross-view"),
  );
});

Then("Android and iOS compile smoke lanes pass", () => {
  const current = ensureReport();
  assert.equal(current.lanes.androidSmoke, "pass");
  assert.equal(current.lanes.iosSmoke, "pass");
});

Then("the persistence adapter allows only loadGraph and saveGraph", () => {
  assert.ok(ensureReport().scenarios.includes("example.platform.adapter-boundary"));
});

Then("offline convergence merges two clients with zero conflicts", () => {
  assert.ok(ensureReport().scenarios.includes("example.offline.persistence-convergence"));
});

Then("the evidence records source-workspace scope and device-runtime limits", () => {
  const current = ensureReport();
  assert.equal(current.evidenceBoundary.kind, "source-workspace");
  assert.equal(current.evidenceBoundary.countsAsPackedPackageEvidence, false);
  assert.equal(current.platformLimits.compileSmokeOnly, true);
  assert.match(current.platformLimits.deviceRuntime, /retained manual limit/);
  for (const golden of current.visualEvidence.goldens) {
    assert.match(golden.sha256, /^[0-9a-f]{64}$/);
  }
  assert.match(current.visualEvidence.surfaceFixture.sha256, /^[0-9a-f]{64}$/);
});
