import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyDartLedger } from "../../scripts/dart-public-api-contract.mjs";
import { verifyDartGraphRiverpod } from "../../scripts/verify-dart-graph-riverpod.mjs";

const root = process.cwd();
const evidenceRoot = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-dart-graph-riverpod",
);

test("the stable Dart package and generated Riverpod contract are structurally complete", () => {
  const report = verifyDartGraphRiverpod({ runFlutter: false });
  assert.equal(report.package, "entity_graph_flutter@3.0.1");
  assert.equal(report.result, "pass");
  assert.ok(Object.values(report.contracts).every((result) => result === "pass"));
  assert.deepEqual(report.publicApiDeclarations, { root: 93, devtools: 99 });
});

test("Flutter visual evidence uses explicit Linux and default platform baselines", () => {
  const widgetTest = readFileSync(
    join(root, "packages/entity_graph_flutter/test/cross-view-widget_test.dart"),
    "utf8",
  );
  assert.match(widgetTest, /Platform\.isLinux/);
  assert.match(widgetTest, /goldens\/linux-\$filename/);

  for (const filename of [
    "cross-view-initial.png",
    "cross-view-optimistic.png",
    "linux-cross-view-initial.png",
    "linux-cross-view-optimistic.png",
  ]) {
    assert.ok(existsSync(join(root, "packages/entity_graph_flutter/test/goldens", filename)));
  }

  const report = verifyDartGraphRiverpod({ runFlutter: false });
  const expectedPlatform = process.platform === "linux" ? "linux" : "default";
  const expectedPrefix = process.platform === "linux" ? "linux-" : "";
  assert.equal(report.visualEvidence.baselinePlatform, expectedPlatform);
  assert.equal(
    report.visualEvidence.initial.path,
    `packages/entity_graph_flutter/test/goldens/${expectedPrefix}cross-view-initial.png`,
  );
  assert.equal(
    report.visualEvidence.optimistic.path,
    `packages/entity_graph_flutter/test/goldens/${expectedPrefix}cross-view-optimistic.png`,
  );
});

test("coverage, package, release, and skill guidance match the certified Dart boundary", () => {
  const report = verifyDartGraphRiverpod({ runFlutter: false });
  assert.equal(report.contracts.publicApiLedger, "pass");
  assert.equal(report.contracts.declaredSurface, "pass");

  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const gate = coverage.qualityGates.find(({ id }) => id === "release.platform.dart-riverpod");
  assert.equal(gate.status, "implemented");
  assert.equal(gate.command, "pnpm run verify:dart-graph-riverpod");
  const capability = coverage.capabilities.find(({ id }) => id === "platform.flutter-riverpod");
  assert.ok(
    capability.releaseEvidence.some(
      ({ kind, status, ownerChange, applicability }) =>
        kind === "visual" &&
        status === "implemented" &&
        ownerChange === "v3-dart-graph-riverpod" &&
        /not complete app, device, or accessibility evidence/.test(applicability),
    ),
  );
  assert.ok(
    capability.releaseEvidence.some(
      ({ ownerChange, status }) =>
        ownerChange === "v3-flutter-riverpod-a2ui-example" && status === "implemented",
    ),
  );
});

test("Flutter platform smoke runs from the showcase package root", () => {
  const workflow = readFileSync(
    join(root, ".github/workflows/flutter-example-platform.yml"),
    "utf8",
  );
  const androidStep = workflow
    .split("- name: Run the Android integration smoke test", 2)[1]
    ?.split("  ios-smoke:", 1)[0];
  const iosStep = workflow.split("- name: Run the iOS integration smoke test", 2)[1];

  assert.ok(androidStep, "Android smoke step is missing");
  assert.match(androidStep, /cd examples\/flutter-riverpod &&/);
  assert.match(androidStep, /flutter test\s+integration_test\/mobile_smoke_test\.dart/);
  assert.doesNotMatch(
    androidStep,
    /flutter test\s+examples\/flutter-riverpod\/integration_test\/mobile_smoke_test\.dart/,
  );

  assert.ok(iosStep, "iOS smoke step is missing");
  assert.match(iosStep, /working-directory: examples\/flutter-riverpod/);
  assert.match(iosStep, /flutter test\s+integration_test\/mobile_smoke_test\.dart/);
  assert.doesNotMatch(
    iosStep,
    /flutter test\s+examples\/flutter-riverpod\/integration_test\/mobile_smoke_test\.dart/,
  );
});

test("the Dart declaration ledger fails closed on drift", () => {
  const directory = mkdtempSync(join(tmpdir(), "prometheus-dart-ledger-"));
  try {
    const path = join(directory, "dart-library-exports.json");
    const ledger = JSON.parse(
      readFileSync(
        join(root, "prometheus-entity-skills/_shared/references/dart-library-exports.json"),
        "utf8",
      ),
    );
    ledger.exports.pop();
    writeFileSync(path, JSON.stringify(ledger));
    assert.throws(() => verifyDartLedger(path), /ledger is stale/);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("the permanent Flutter suite proves graph, views, CRUD, retry, realtime, FFI, and rendering", () => {
  const output = execFileSync(
    "pnpm",
    [
      "run",
      "verify:dart-graph-riverpod",
      "--",
      "--report",
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-dart-graph-riverpod/task-3-dart-report.json",
    ],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      timeout: 300_000,
    },
  );
  assert.match(output, /verified with Flutter tests/);
  const reportPath = join(evidenceRoot, "task-3-dart-report.json");
  assert.ok(existsSync(reportPath));
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(report.flutter.executed, true);
  assert.equal(report.flutter.passed, true);
  assert.equal(report.visualEvidence.inspected, true);
  assert.match(report.visualEvidence.initial.sha256, /^[a-f0-9]{64}$/);
  assert.match(report.visualEvidence.optimistic.sha256, /^[a-f0-9]{64}$/);
  assert.match(report.visualEvidence.scope, /not full app, device, or accessibility certification/);
});
