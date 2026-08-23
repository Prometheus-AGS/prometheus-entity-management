import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, setDefaultTimeout } from "@cucumber/cucumber";

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-dart-graph-riverpod/task-3-dart-report.json",
);
const finalManifestPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-dart-graph-riverpod/final-verification.json",
);
let report: Record<string, any> | undefined;

function finalManifest(): Record<string, any> {
  assert.ok(existsSync(finalManifestPath), "final Dart archive manifest must exist");
  return JSON.parse(readFileSync(finalManifestPath, "utf8"));
}

setDefaultTimeout(300_000);

function ensureReport(): Record<string, any> {
  if (report) return report;
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
  assert.ok(existsSync(reportPath));
  report = JSON.parse(readFileSync(reportPath, "utf8"));
  return report;
}

Given("the Dart graph Riverpod verification suite has run", function () {
  assert.equal(ensureReport().result, "pass");
});

Then("the Dart and Flutter constraints form one coherent stable matrix", function () {
  assert.equal(ensureReport().package, "entity_graph_flutter@3.0.0");
  assert.equal(ensureReport().flutter.passed, true);
});

Then("all generated provider families are present through the public package", function () {
  assert.equal(ensureReport().contracts.generatedRiverpod, "pass");
});

Then("remote membership stores entity ids and both views reflect one graph update", function () {
  assert.equal(ensureReport().contracts.normalizedGraph, "pass");
  assert.equal(ensureReport().contracts.idOnlyLists, "pass");
});

Then("local mode avoids transport while hybrid mode revalidates remote membership", function () {
  assert.equal(ensureReport().contracts.localRemoteHybridViews, "pass");
});

Then("optimistic updates are visible globally and confirmation clears the patch", function () {
  assert.equal(ensureReport().contracts.optimisticCrudRollback, "pass");
});

Then("failed updates, deletes, and creates restore their exact prior graph state", function () {
  assert.equal(ensureReport().contracts.optimisticCrudRollback, "pass");
});

Then("terminal failures make one attempt and transient failures make at most three", function () {
  assert.equal(ensureReport().contracts.boundedRetry, "pass");
});

Then("realtime updates and deletes mutate and invalidate the canonical graph", function () {
  assert.equal(ensureReport().contracts.realtimeBridge, "pass");
});

Then("the pluggable FFI adapter delegates every transport operation", function () {
  assert.equal(ensureReport().contracts.pluggableTransport, "pass");
  assert.equal(ensureReport().contracts.optionalFfi, "pass");
});

Then("the Flutter package requires no native FFI runtime", function () {
  assert.equal(ensureReport().contracts.optionalFfi, "pass");
});

Then("initial and optimistic cross-view goldens have inspected immutable receipts", function () {
  const visual = ensureReport().visualEvidence;
  assert.equal(visual.inspected, true);
  assert.match(visual.initial.sha256, /^[a-f0-9]{64}$/);
  assert.match(visual.optimistic.sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(visual.initial.sha256, visual.optimistic.sha256);
});

Then("the visual receipt disclaims full app, device, and accessibility certification", function () {
  assert.match(
    ensureReport().visualEvidence.scope,
    /not full app, device, or accessibility certification/,
  );
});

Then(
  "the Dart barrel and generated provider part match the public declaration ledger",
  function () {
    assert.equal(ensureReport().contracts.publicApiLedger, "pass");
    assert.equal(ensureReport().publicApiDeclarations, 81);
  },
);

Then(
  "coverage implements only the certified Dart platform and widget harness boundary",
  function () {
    assert.equal(ensureReport().contracts.declaredSurface, "pass");
    const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
    const capability = coverage.capabilities.find(
      ({ id }: { id: string }) => id === "platform.flutter-riverpod",
    );
    assert.ok(
      capability.releaseEvidence.some(
        ({ ownerChange, status, kind }: { ownerChange: string; status: string; kind: string }) =>
          ownerChange === "v3-flutter-riverpod-a2ui-example" && status === "implemented" && kind === "visual",
      ),
    );
  },
);

Then(
  "package, release, and skill guides describe the same layering and exclusions",
  function () {
    assert.equal(ensureReport().contracts.declaredSurface, "pass");
    for (const path of [
      "packages/entity_graph_flutter/README.md",
      "release/dart-graph-riverpod.md",
      "prometheus-entity-skills/_shared/references/dart-graph-riverpod.md",
    ]) {
      const guide = readFileSync(join(root, path), "utf8");
      assert.match(guide, /EntityGraph/);
      assert.match(guide, /pub\.dev/);
    }
  },
);

Then(
  "the final Dart archive manifest proves every library acceptance criterion",
  function () {
    const manifest = finalManifest();
    assert.equal(manifest.verdict, "pass-to-archive");
    assert.ok(Object.values(manifest.acceptance).every((result) => result === "pass"));
    assert.equal(manifest.cleanState.flutter, "3.44.8-stable");
    assert.equal(manifest.cleanState.packageDryRun, "pass-zero-warnings");
  },
);

Then(
  "the final Dart archive manifest assigns every unresolved lane downstream",
  function () {
    const manifest = finalManifest();
    const owners = new Set(
      manifest.unresolvedLimits.map(({ ownerChange }: { ownerChange: string }) => ownerChange),
    );
    for (const owner of [
      "v3-flutter-riverpod-a2ui-example",
      "v3-release-certification",
      "v3-stable-publication",
    ]) {
      assert.ok(owners.has(owner), `missing downstream owner ${owner}`);
    }
    assert.equal(manifest.fullReleaseCertified, false);
  },
);

Then(
  "the final Dart archive manifest keeps registry publication unauthorized",
  function () {
    const manifest = finalManifest();
    assert.equal(manifest.publicationAuthorized, false);
    assert.equal(manifest.registryDecision, "deferred");
  },
);
