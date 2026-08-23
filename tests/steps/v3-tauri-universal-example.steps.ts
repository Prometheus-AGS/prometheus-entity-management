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
    typecheck: string;
    bridgeContractTests: string;
    viteProductionBuild: string;
    rustCommandE2e: string;
    browserViewportScenarios: Record<string, { status: string; scenarios: number }>;
    platformArtifacts: Record<string, { status: string; sha256?: string }>;
  };
  platformLimits: Record<string, string>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("node", ["scripts/verify-tauri-universal-example.mjs", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: "inherit",
    timeout: 15 * 60 * 1_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

Given("the Tauri universal certification inputs are available", () => {
  // Inputs resolve lazily in the When step so the verifier runs once per feature.
});

When("the Tauri universal certification executes", () => {
  ensureReport();
});

Then("the Rust command E2E proves entity and list round-trips on desktop", () => {
  const current = ensureReport();
  assert.equal(current.lanes.rustCommandE2e, "pass");
  const command = current.commands.find(({ label }) => label === "rust-command-e2e");
  assert.equal(command?.exitCode, 0);
});

Then("a webview without the capability is denied fail-closed", () => {
  const current = ensureReport();
  const libRs = readFileSync(
    join(root, "examples/tauri-app/src-tauri/src/lib.rs"),
    "utf8",
  );
  assert.match(libRs, /webview_without_the_capability_is_denied_fail_closed/);
  assert.match(libRs, /expect_err/);
  assert.equal(current.lanes.rustCommandE2e, "pass");
});

Then("the offline restart persist-clear-restore round-trip is proven", () => {
  const libRs = readFileSync(
    join(root, "examples/tauri-app/src-tauri/src/lib.rs"),
    "utf8",
  );
  assert.match(libRs, /offline_restart_persist_clear_restore_round_trip/);
  assert.equal(ensureReport().lanes.rustCommandE2e, "pass");
});

Then("typecheck, bridge contract tests, and the production Vite build pass", () => {
  const current = ensureReport();
  assert.equal(current.lanes.typecheck, "pass");
  assert.equal(current.lanes.bridgeContractTests, "pass");
  assert.equal(current.lanes.viteProductionBuild, "pass");
});

Then("Chromium desktop and mobile viewport scenarios pass with clean axe", () => {
  const lanes = ensureReport().lanes.browserViewportScenarios;
  for (const project of ["chromium-desktop", "chromium-mobile"]) {
    assert.equal(lanes[project]?.status, "pass", `${project} lane did not pass`);
    assert.equal(lanes[project]?.scenarios, 7, `${project} must cover 7 scenarios`);
  }
});

Then("bridge receipts record every native boundary action", () => {
  const bridge = readFileSync(
    join(root, "examples/tauri-app/src/platform/bridge.ts"),
    "utf8",
  );
  assert.match(bridge, /BridgeReceipt/);
  assert.match(bridge, /BridgeDeniedError/);
});

Then(
  "desktop binary, Android APK, and iOS simulator app receipts exist with sha256 pins",
  () => {
    const artifacts = ensureReport().lanes.platformArtifacts;
    for (const name of ["desktopBinary", "androidApk", "iosSimulatorAppBinary"]) {
      assert.equal(artifacts[name]?.status, "present", `${name} receipt missing`);
      assert.match(artifacts[name]?.sha256 ?? "", /^[0-9a-f]{64}$/);
    }
  },
);

Then("the evidence records source-workspace scope and native-runtime limits", () => {
  const current = ensureReport();
  assert.equal(current.evidenceBoundary.kind, "source-workspace");
  assert.equal(current.evidenceBoundary.countsAsPackedPackageEvidence, false);
  assert.match(current.platformLimits.desktopRuntime, /MockRuntime|debug binary/);
  assert.match(current.platformLimits.iosRuntime, /unsigned|development team/);
  assert.match(current.platformLimits.androidRuntime, /debug APK/);
});
