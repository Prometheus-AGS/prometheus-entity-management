import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "examples/flutter-riverpod");

const REQUIRED_FILES = [
  "pubspec.yaml",
  "lib/main.dart",
  "lib/app.dart",
  "lib/domain/models.dart",
  "lib/domain/demo_data.dart",
  "lib/transport/demo_transport.dart",
  "lib/transport/persistence_adapter.dart",
  "lib/transport/offline_convergence.dart",
  "lib/a2ui/surface_messages.dart",
  "lib/a2ui/action_policy.dart",
  "lib/a2ui/showcase_runtime.dart",
  "lib/features/task_board_page.dart",
  "lib/features/task_detail_sheet.dart",
  "lib/features/a2ui_panel.dart",
  "lib/features/platform_page.dart",
  "test/test_harness.dart",
  "test/a2ui_policy_test.dart",
  "test/a2ui_protocol_test.dart",
  "test/adapter_boundary_test.dart",
  "test/app_widget_test.dart",
  "test/golden_test.dart",
  "test/goldens/a2ui-surface-messages.json",
  "test/goldens/task-board-phone.png",
  "test/goldens/task-board-tablet.png",
  "android/app/build.gradle.kts",
  "ios/Runner.xcodeproj/project.pbxproj",
];

test("the Flutter/Riverpod/A2UI example file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(appRoot, file)), true, `missing ${file}`);
  }
  assert.equal(
    existsSync(join(root, "scripts/verify-flutter-riverpod-a2ui-example.mjs")),
    true,
    "missing verifier script",
  );
});

test("the example is a pinned Pub workspace member on the official genui line", () => {
  const manifest = readFileSync(join(appRoot, "pubspec.yaml"), "utf8");
  for (const phrase of [
    "resolution: workspace",
    "entity_graph_flutter: 3.0.0",
    'flutter_riverpod: ">=3.3.2 <3.4.0"',
    "genui: 0.10.1",
    "a2ui_core: 0.1.0",
  ]) {
    assert.ok(manifest.includes(phrase), `pubspec missing ${phrase}`);
  }
  const workspace = readFileSync(join(root, "pubspec.yaml"), "utf8");
  assert.match(workspace, /- examples\/flutter-riverpod/, "workspace membership missing");
});

test("genui owns the protocol; the app owns content and fail-closed authority", () => {
  const runtime = readFileSync(join(appRoot, "lib/a2ui/showcase_runtime.dart"), "utf8");
  assert.match(runtime, /SurfaceController\(/);
  assert.match(runtime, /BasicCatalogItems\.asNoAssetCatalog\(\)/);
  const policy = readFileSync(join(appRoot, "lib/a2ui/action_policy.dart"), "utf8");
  assert.match(policy, /allowedActions = <String>\{'task\.update'\}/);
  assert.match(policy, /approvalGatedActions = <String>\{'task\.replace'\}/);
  assert.match(policy, /A2uiActionDecision\.malformed/);
  assert.match(policy, /not allowlisted; failing closed/);
  const messages = readFileSync(join(appRoot, "lib/a2ui/surface_messages.dart"), "utf8");
  assert.match(messages, /surface-task-sync/);
  for (const action of ["task.update", "task.replace", "task.delete"]) {
    assert.ok(messages.includes(`'${action}'`), `surface action ${action} missing`);
  }
});

test("the platform adapter boundary denies undeclared commands fail-closed", () => {
  const adapter = readFileSync(
    join(appRoot, "lib/transport/persistence_adapter.dart"),
    "utf8",
  );
  assert.match(adapter, /allowedCommands = <String>\{'loadGraph', 'saveGraph'\}/);
  assert.match(adapter, /AdapterDeniedError/);
});

test("feature widgets never write the entity graph directly", () => {
  for (const feature of [
    "task_board_page.dart",
    "task_detail_sheet.dart",
    "a2ui_panel.dart",
    "platform_page.dart",
  ]) {
    const source = readFileSync(join(appRoot, "lib/features", feature), "utf8");
    assert.ok(
      !/\.upsertEntity\(|\.patchEntity\(|\.removeEntity\(/.test(source),
      `feature ${feature} writes the graph directly`,
    );
  }
});

test("no model credential or secret surface exists anywhere in the example", () => {
  const secretPattern = /api[_-]?key\s*[:=]|openai|anthropic|\bsk-[a-z0-9]{6,}/i;
  for (const dir of ["lib", "test"]) {
    const entries = [];
    const walk = (current) => {
      for (const entry of readdirSync(current)) {
        const candidate = join(current, entry);
        if (statSync(candidate).isDirectory()) walk(candidate);
        else entries.push(candidate);
      }
    };
    walk(join(appRoot, dir));
    for (const path of entries) {
      if (path.includes("goldens")) continue;
      assert.ok(
        !secretPattern.test(readFileSync(path, "utf8")),
        `possible credential reference in ${path}`,
      );
    }
  }
});

test("coverage records the flutter-riverpod showcase as implemented", () => {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const showcase = coverage.showcases.find((entry) => entry.id === "flutter-riverpod");
  assert.ok(showcase, "flutter-riverpod showcase missing from examples/coverage.json");
  assert.equal(showcase.status, "implemented");
  assert.equal(showcase.change, "v3-flutter-riverpod-a2ui-example");
  assert.equal(showcase.scenarioIds.length, 10);
  assert.equal(showcase.runtimeEvidence.status, "implemented");
  assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:flutter-riverpod-a2ui");
  assert.equal(showcase.visualEvidence.status, "implemented");
  for (const [capabilityId, kind] of [
    ["graph.crud-optimistic", "mobile"],
    ["graph.offline-persistence-sync", "mobile"],
    ["platform.flutter-riverpod", "visual"],
  ]) {
    const capability = coverage.capabilities.find(({ id }) => id === capabilityId);
    const entry = capability?.releaseEvidence.find(
      ({ ownerChange, kind: entryKind }) =>
        ownerChange === "v3-flutter-riverpod-a2ui-example" && entryKind === kind,
    );
    assert.equal(entry?.status, "implemented", `${capabilityId} ${kind} entry not implemented`);
  }
});

test("root gates exist for the change", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const script of [
    "verify:flutter-riverpod-a2ui",
    "test:v3-flutter-riverpod-a2ui-example",
    "bdd:flutter-riverpod-a2ui",
  ]) {
    assert.ok(pkg.scripts[script], `missing root script ${script}`);
  }
});
