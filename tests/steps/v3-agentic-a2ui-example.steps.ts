import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  status: "pass";
  evidenceBoundary: {
    kind: string;
    countsAsPackedPackageEvidence: false;
  };
  versions: Record<string, string>;
  commands: Array<{ label: string; exitCode: number }>;
  protocol: {
    status: "pass";
    keyless: true;
    modelCredentialRequired: false;
    goldenFixtures: string[];
    happyFinalState: string;
    deniedFinalState: string;
    malformedRejected: true;
    cancelledFinalState: string;
    tenantMismatchStatus: number;
  };
  production: {
    typecheck: "pass";
    build: "pass";
    app: string;
  };
  browser: {
    status: "pass";
    expectedTests: number;
    unexpectedTests: number;
    declaredScenarioIds: string[];
    scenarios: Record<string, { status: "pass"; proof: Record<string, unknown> }>;
    accessibility: { status: "pass"; serious: number; critical: number };
    actionCatalogBypassed: false;
  };
  artifacts: Array<{ path: string; sha256: string }>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-agentic-a2ui-example.mjs", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: "inherit",
    timeout: 15 * 60 * 1_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

Given("the agentic A2UI showcase certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the agentic A2UI showcase certification executes", () => {
  ensureReport();
});

Then(
  "the happy, denied, malformed, and cancelled transcripts match their golden fixtures",
  () => {
    const current = ensureReport();
    assert.equal(current.protocol.status, "pass");
    assert.equal(current.protocol.happyFinalState, "TASK_STATE_COMPLETED");
    assert.equal(current.protocol.deniedFinalState, "TASK_STATE_REJECTED");
    assert.equal(current.protocol.malformedRejected, true);
    assert.equal(current.protocol.cancelledFinalState, "TASK_STATE_CANCELED");
  },
);

Then("the agent requires no model credential", () => {
  const current = ensureReport();
  assert.equal(current.protocol.keyless, true);
  assert.equal(current.protocol.modelCredentialRequired, false);
});

Then("a foreign-tenant caller is refused before any graph access", () => {
  assert.equal(ensureReport().protocol.tenantMismatchStatus, 403);
});

Then("every declared agentic showcase scenario has browser evidence", () => {
  const current = ensureReport();
  assert.equal(current.browser.status, "pass");
  assert.equal(current.browser.unexpectedTests, 0);
  for (const id of current.browser.declaredScenarioIds) {
    assert.equal(
      current.browser.scenarios[id]?.status,
      "pass",
      `missing passing browser receipt for ${id}`,
    );
  }
});

Then(
  "the task board surface approves update, denies delete, and gates destructive replace behind human approval",
  () => {
    const current = ensureReport();
    const proof = current.browser.scenarios["example.protocol.a2a-a2ui-policy"]?.proof ?? {};
    assert.equal(proof.approvedMutation, "task.update");
    assert.equal(proof.deniedMutation, "task.delete");
    assert.equal(proof.approvalRequiredForDestructive, true);
    assert.equal(current.browser.actionCatalogBypassed, false);
  },
);

Then(
  "the browser surface has no serious or critical accessibility violations and no console errors",
  () => {
    const current = ensureReport();
    assert.equal(current.browser.accessibility.status, "pass");
    assert.equal(current.browser.accessibility.serious, 0);
    assert.equal(current.browser.accessibility.critical, 0);
  },
);

Then("the agentic production build and typechecks pass", () => {
  const current = ensureReport();
  assert.equal(current.production.typecheck, "pass");
  assert.equal(current.production.build, "pass");
});

Then("agentic source-workspace browser evidence is not counted as packed-package evidence", () => {
  assert.equal(ensureReport().evidenceBoundary.countsAsPackedPackageEvidence, false);
});

Then(
  "agentic screenshots, traces, golden fixtures, and exact tool versions are recorded",
  () => {
    const current = ensureReport();
    assert.ok(current.artifacts.some((artifact) => artifact.path.endsWith(".png")));
    assert.ok(current.artifacts.some((artifact) => artifact.path.endsWith(".zip")));
    assert.ok(
      current.artifacts.some((artifact) => artifact.path.includes("tests/golden/happy.json")),
    );
    for (const artifact of current.artifacts) {
      assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
    }
    assert.ok(current.versions.node);
    assert.ok(current.versions.a2aSdk);
  },
);
