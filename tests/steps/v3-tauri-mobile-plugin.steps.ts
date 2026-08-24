import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AfterAll, Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type Report = {
  schemaVersion: number;
  javascriptBindings: {
    rustDrift: string;
    typecheck: string;
    runtimeTests: string;
  };
  desktopHost: {
    realPluginCommand: string;
    platform: string;
    capabilityDenial: string;
  };
  packedConsumer: {
    dependencySource: string;
    cargoTest: string;
    nativePayload: string;
    files: string[];
  };
  mobileDeviceLane: {
    android: string;
    ios: string;
    command: string;
    executionEvidence: string;
    visualEvidence: string;
  };
};

const root = process.cwd();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "tauri-plugin-bdd-"));
const reportPath = join(temporaryDirectory, "report.json");
const visualPath = join(temporaryDirectory, "host-contract.svg");
let report: Report | undefined;
let reportError: unknown;

setDefaultTimeout(30 * 60 * 1_000);

AfterAll(function () {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function ensureReport(): Report {
  if (report) return report;
  if (reportError) throw reportError;
  try {
    execFileSync(
      "node",
      ["scripts/verify-tauri-mobile-plugin.mjs", "--report", reportPath, "--visual", visualPath],
      {
        cwd: root,
        env: { ...process.env, FORCE_COLOR: "0" },
        encoding: "utf8",
        maxBuffer: 30 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 25 * 60 * 1_000,
      },
    );
    report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
    return report;
  } catch (error) {
    reportError = error;
    throw error;
  }
}

Given("the v3 Tauri plugin repository is available", function () {
  assert.equal(existsSync(join(root, "packages/entity-graph-tauri/rust-plugin/Cargo.toml")), true);
  assert.equal(existsSync(join(root, "tests/fixtures/tauri-plugin-host/tauri.conf.json")), true);
});

When("the Tauri host contract is verified", function () {
  ensureReport();
});

Then("the desktop host returns the native platform ping", function () {
  assert.equal(ensureReport().desktopHost.realPluginCommand, "pass");
  assert.equal(ensureReport().desktopHost.platform, "desktop");
});

Then("the Rust-derived bindings pass drift, type, and runtime checks", function () {
  assert.deepEqual(ensureReport().javascriptBindings, {
    rustDrift: "pass",
    typecheck: "pass",
    runtimeTests: "pass",
  });
});

Then("a webview without the platform-ping capability is denied", function () {
  assert.equal(ensureReport().desktopHost.capabilityDenial, "pass");
});

When("the packed Tauri consumer contract is verified", function () {
  ensureReport();
});

Then("its Rust host compiles only from the packed candidate", function () {
  assert.equal(ensureReport().packedConsumer.dependencySource, "candidate-tarball-only");
  assert.equal(ensureReport().packedConsumer.cargoTest, "pass");
});

Then("the tarball contains the native sources and permission manifests", function () {
  assert.equal(ensureReport().packedConsumer.nativePayload, "pass");
});

Then("the Android and iOS device receipts prove the native platform ping invocation", function () {
  const lane = ensureReport().mobileDeviceLane;
  assert.equal(lane.command, "plugin:entity-graph-tauri|graph_platform_ping");
  assert.equal(lane.android, "pass-physical-device");
  assert.equal(lane.ios, "pass-simulator");
});

Then("the mobile receipts prove capability denial and artifact integrity", function () {
  const lane = ensureReport().mobileDeviceLane;
  assert.equal(lane.executionEvidence, "pass");
  assert.equal(lane.visualEvidence, "pass");

  const deviceEvidencePath = join(
    root,
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-mobile-plugin/device/device-evidence.json",
  );
  assert.equal(existsSync(deviceEvidencePath), true);

  const laneGuide = readFileSync(join(root, "release/tauri-mobile-device-lane.md"), "utf8");
  assert.match(laneGuide, /hash-verified Android and iOS receipts/i);
});

Then("runtime and declaration exports match the Tauri skill ledger", function () {
  const ledgerPath = join(
    root,
    "prometheus-entity-skills/_shared/references/tauri-library-exports.json",
  );
  assert.equal(existsSync(ledgerPath), true, "the Tauri public API ledger must exist");

  execFileSync("pnpm", ["--filter", "@prometheus-ags/entity-graph-tauri", "build"], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = execFileSync(
    "pnpm",
    ["--filter", "@prometheus-ags/entity-graph-tauri", "verify:skills"],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  assert.match(output, /runtime and \d+ declaration exports match/);

  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
    runtimeExports: string[];
    declarationExports: string[];
  };
  for (const name of ["platformPing", "generatedCommands", "generatedEvents", "PLUGIN_NAME"]) {
    assert.ok(ledger.runtimeExports.includes(name), `missing runtime export ${name}`);
  }
  for (const name of ["PlatformPing", "RustPlatformPing", "GraphCommands"]) {
    assert.ok(ledger.declarationExports.includes(name), `missing declaration export ${name}`);
  }
});

Then(
  "coverage separates implemented host evidence from planned mobile evidence",
  function () {
    const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
    const gate = coverage.qualityGates.find(
      ({ id }: { id: string }) => id === "release.platform.tauri-plugin",
    );
    assert.equal(gate.status, "implemented");
    assert.equal(gate.command, "pnpm run verify:tauri-plugin");

    const capability = coverage.capabilities.find(
      ({ id }: { id: string }) => id === "platform.tauri",
    );
    assert.ok(
      capability.releaseEvidence.some(
        ({ kind, status }: { kind: string; status: string }) =>
          kind === "desktop" && status === "implemented",
      ),
    );
    assert.ok(
      capability.releaseEvidence.some(
        ({ kind, status }: { kind: string; status: string }) =>
          kind === "packed-consumer" && status === "implemented",
      ),
    );
    assert.ok(
      capability.releaseEvidence.some(
        ({ kind, status }: { kind: string; status: string }) =>
          kind === "mobile" && status === "implemented",
      ),
    );
  },
);

Then(
  "package, release, and skill guides preserve the permission and persistence boundaries",
  function () {
    for (const path of [
      "packages/entity-graph-tauri/README.md",
      "release/tauri-mobile-plugin.md",
      "prometheus-entity-skills/_shared/references/tauri-mobile-plugin.md",
    ]) {
      const guide = readFileSync(join(root, path), "utf8");
      assert.match(guide, /entity-graph-tauri:default/);
      assert.match(guide, /in-memory/i);
      assert.match(guide, /createTauriSqlPersistenceAdapter/);
      assert.match(guide, /Android/);
      assert.match(guide, /iOS/);
    }
  },
);
