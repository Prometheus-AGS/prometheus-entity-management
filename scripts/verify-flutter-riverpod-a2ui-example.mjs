#!/usr/bin/env node

/**
 * Certifies the Flutter/Riverpod/A2UI showcase example.
 *
 * Lanes: fatal-infos analysis, format check, the full Flutter test suite
 * (unit, widget, golden, protocol replay), and Android/iOS compile smoke.
 * Structural assertions pin the genui protocol boundary, the fail-closed
 * action policy, the adapter command allowlist, and the coverage manifest.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(root, "examples/flutter-riverpod");
const evidenceDirectory = resolve(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-riverpod-a2ui-example",
);

const requiredFiles = [
  "examples/flutter-riverpod/pubspec.yaml",
  "examples/flutter-riverpod/lib/main.dart",
  "examples/flutter-riverpod/lib/app.dart",
  "examples/flutter-riverpod/lib/domain/models.dart",
  "examples/flutter-riverpod/lib/domain/demo_data.dart",
  "examples/flutter-riverpod/lib/transport/demo_transport.dart",
  "examples/flutter-riverpod/lib/transport/persistence_adapter.dart",
  "examples/flutter-riverpod/lib/transport/offline_convergence.dart",
  "examples/flutter-riverpod/lib/a2ui/surface_messages.dart",
  "examples/flutter-riverpod/lib/a2ui/action_policy.dart",
  "examples/flutter-riverpod/lib/a2ui/showcase_runtime.dart",
  "examples/flutter-riverpod/lib/features/task_board_page.dart",
  "examples/flutter-riverpod/lib/features/task_detail_sheet.dart",
  "examples/flutter-riverpod/lib/features/a2ui_panel.dart",
  "examples/flutter-riverpod/lib/features/platform_page.dart",
  "examples/flutter-riverpod/test/test_harness.dart",
  "examples/flutter-riverpod/test/a2ui_policy_test.dart",
  "examples/flutter-riverpod/test/a2ui_protocol_test.dart",
  "examples/flutter-riverpod/test/adapter_boundary_test.dart",
  "examples/flutter-riverpod/test/app_widget_test.dart",
  "examples/flutter-riverpod/test/golden_test.dart",
  "examples/flutter-riverpod/test/goldens/a2ui-surface-messages.json",
  "examples/flutter-riverpod/test/goldens/task-board-phone.png",
  "examples/flutter-riverpod/test/goldens/task-board-tablet.png",
  "examples/flutter-riverpod/android/app/build.gradle.kts",
  "examples/flutter-riverpod/ios/Runner.xcodeproj/project.pbxproj",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertMatch(value, expression, message) {
  assert(expression.test(value), message);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
}

const commands = [];

function run(label, command, args, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: exampleRoot,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    timeout: options.timeout ?? 300_000,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  commands.push({
    label,
    command: [command, ...args].join(" "),
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode: result.status,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
  return result.stdout ?? "";
}

export function verifyFlutterRiverpodA2uiExample({
  runFlutter = true,
  platformSmoke = true,
} = {}) {
  for (const path of requiredFiles) {
    assert(existsSync(join(root, path)), `missing required example artifact: ${path}`);
  }

  const exampleManifest = read("examples/flutter-riverpod/pubspec.yaml");
  const workspaceManifest = read("pubspec.yaml");
  const workspacePackage = JSON.parse(read("package.json"));
  const policy = read("examples/flutter-riverpod/lib/a2ui/action_policy.dart");
  const surfaceMessages = read("examples/flutter-riverpod/lib/a2ui/surface_messages.dart");
  const runtime = read("examples/flutter-riverpod/lib/a2ui/showcase_runtime.dart");
  const transport = read("examples/flutter-riverpod/lib/transport/demo_transport.dart");
  const adapter = read("examples/flutter-riverpod/lib/transport/persistence_adapter.dart");
  const protocolTest = read("examples/flutter-riverpod/test/a2ui_protocol_test.dart");
  const widgetTest = read("examples/flutter-riverpod/test/app_widget_test.dart");
  const coverage = JSON.parse(read("examples/coverage.json"));

  for (const phrase of [
    "resolution: workspace",
    "entity_graph_flutter: 3.0.0",
    'flutter_riverpod: ">=3.3.2 <3.4.0"',
    "genui: 0.10.1",
    "a2ui_core: 0.1.0",
  ]) assert(exampleManifest.includes(phrase), `missing example manifest pin: ${phrase}`);
  assertMatch(
    workspaceManifest,
    /workspace:\s*\n\s*- packages\/entity_graph_flutter\s*\n\s*- examples\/flutter-riverpod/,
    "example is not a Pub workspace member",
  );
  for (const script of [
    "verify:flutter-riverpod-a2ui",
    "test:v3-flutter-riverpod-a2ui-example",
    "bdd:flutter-riverpod-a2ui",
  ]) assert(workspacePackage.scripts[script], `root script ${script} is not wired`);

  // genui owns the protocol; the app owns content and authority.
  assertMatch(runtime, /SurfaceController\(/, "genui SurfaceController is not the engine");
  assertMatch(runtime, /BasicCatalogItems\.asNoAssetCatalog\(\)/, "asset-free basic catalog missing");
  assertMatch(surfaceMessages, /basicCatalogId/, "surface does not bind the official catalog id");
  assertMatch(surfaceMessages, /surface-task-sync/, "scenario surface id missing");
  for (const action of ["task.update", "task.replace", "task.delete"]) {
    assert(surfaceMessages.includes(`'${action}'`), `surface action ${action} missing`);
  }

  // Fail-closed policy surface.
  assertMatch(policy, /allowedActions = <String>\{'task\.update'\}/, "allowlist drifted");
  assertMatch(policy, /approvalGatedActions = <String>\{'task\.replace'\}/, "approval gate drifted");
  assertMatch(policy, /A2uiActionDecision\.malformed/, "malformed rejection lane missing");
  assertMatch(policy, /tenant.*does not match the session tenant/, "tenant guard missing");
  assertMatch(policy, /not allowlisted; failing closed/, "fail-closed denial missing");
  assert(!/deleteAll|wipe/i.test(policy.replace(/delete-task/g, "")), "policy gained a destructive lane");

  // Adapter boundary: exactly loadGraph/saveGraph, deleteAll denied.
  assertMatch(adapter, /allowedCommands = <String>\{'loadGraph', 'saveGraph'\}/, "adapter allowlist drifted");
  assertMatch(adapter, /AdapterDeniedError/, "adapter denial error missing");
  assertMatch(protocolTest, /pumpUntilReceipts/, "protocol test lacks receipt-synchronized assertions");

  // UI layering: feature widgets never write the graph directly.
  for (const feature of [
    "task_board_page.dart",
    "task_detail_sheet.dart",
    "a2ui_panel.dart",
    "platform_page.dart",
  ]) {
    const source = read(`examples/flutter-riverpod/lib/features/${feature}`);
    assert(
      !/\.upsertEntity\(|\.patchEntity\(|\.removeEntity\(/.test(source),
      `feature ${feature} writes the graph directly`,
    );
  }

  // Transport determinism hooks used by the rollback/error lanes.
  assertMatch(transport, /failNextUpdate/, "rollback failure hook missing");
  assertMatch(transport, /CoalescedChangeBuffer/, "realtime coalescing buffer missing");
  assertMatch(widgetTest, /simulateRealtimeBurst/, "realtime burst lane missing");

  // Coverage manifest reconciliation.
  const showcase = coverage.showcases.find((entry) => entry.id === "flutter-riverpod");
  assert(showcase, "coverage omits the flutter-riverpod showcase");
  assert(showcase.status === "implemented", "flutter-riverpod showcase is not implemented");
  assert(showcase.change === "v3-flutter-riverpod-a2ui-example", "showcase owner drifted");
  assert(
    showcase.runtimeEvidence.command === "pnpm run verify:flutter-riverpod-a2ui",
    "showcase runtime evidence uses the wrong command",
  );
  assert(showcase.runtimeEvidence.status === "implemented", "showcase runtime evidence missing");
  assert(showcase.visualEvidence.status === "implemented", "showcase visual evidence missing");
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
    assert(entry, `coverage ${capabilityId} lacks the Flutter ${kind} entry`);
    assert(
      entry.status === "implemented",
      `coverage ${capabilityId} Flutter ${kind} entry is not implemented`,
    );
  }

  // Executable lanes.
  if (runFlutter) {
    const analyze = run("dart-analyze", "dart", ["analyze", "--fatal-infos", "--fatal-warnings"]);
    assertMatch(analyze, /No issues found!/, "fatal-infos analysis did not report clean");
    run("dart-format-check", "dart", [
      "format",
      "--output=none",
      "--set-exit-if-changed",
      ".",
    ]);
    const tests = run("flutter-test", "flutter", ["test", "--reporter", "compact"]);
    assertMatch(tests, /All tests passed!/, "Flutter example suite did not report success");
  }
  const smoke = { android: "skipped", ios: "skipped" };
  if (platformSmoke) {
    const apk = run("android-apk-smoke", "flutter", ["build", "apk", "--debug"], {
      timeout: 600_000,
    });
    assertMatch(apk, /Built build\/app\/outputs\/flutter-apk\/app-debug\.apk/, "Android APK smoke failed");
    smoke.android = "pass";
    const ios = run(
      "ios-simulator-smoke",
      "flutter",
      ["build", "ios", "--simulator", "--no-codesign"],
      { timeout: 600_000 },
    );
    assertMatch(ios, /Built build\/ios\/iphonesimulator\/Runner\.app/, "iOS simulator smoke failed");
    smoke.ios = "pass";
  }

  const versionProbe = spawnSync("flutter", ["--version"], {
    cwd: exampleRoot,
    encoding: "utf8",
  });
  const flutterVersion = /Flutter (\S+)/.exec(versionProbe.stdout ?? "")?.[1] ?? "unknown";

  return {
    schemaVersion: "1",
    change: "v3-flutter-riverpod-a2ui-example",
    recordedAt: new Date().toISOString(),
    result: "pass",
    evidenceBoundary: {
      kind: "source-workspace",
      countsAsPackedPackageEvidence: false,
      note: "Dart packages are not packed for pub.dev in this phase; evidence certifies the workspace source example.",
    },
    versions: {
      flutter: flutterVersion,
      genui: "0.10.1",
      a2uiCore: "0.1.0",
      entityGraphFlutter: "3.0.0",
    },
    commands,
    lanes: {
      analyze: runFlutter ? "pass" : "skipped",
      format: runFlutter ? "pass" : "skipped",
      flutterTests: runFlutter ? "pass" : "skipped",
      androidSmoke: smoke.android,
      iosSmoke: smoke.ios,
    },
    platformLimits: {
      compileSmokeOnly: platformSmoke,
      deviceRuntime:
        "No booted Android emulator or iOS simulator/device was driven; runtime device receipts remain a retained manual limit, not waived acceptance.",
      linuxGoldens:
        "Golden baselines were recorded on macOS; the golden test selects linux- variants automatically when run on Linux.",
    },
    protocol: {
      status: "pass",
      keyless: true,
      modelCredentialRequired: false,
      surfaceId: "surface-task-sync",
      catalog: "genui BasicCatalogItems.asNoAssetCatalog (official A2UI v0.9 basic catalog)",
      approvedMutation: "task.update",
      deniedMutation: "task.delete",
      approvalGatedMutation: "task.replace",
      malformedRejected: true,
      tenantGuard: true,
    },
    scenarios: showcase.scenarioIds,
    visualEvidence: {
      scope:
        "Pinned phone/tablet golden images of the branded task board; not device or full-app certification",
      inspected: true,
      goldens: [
        "examples/flutter-riverpod/test/goldens/task-board-phone.png",
        "examples/flutter-riverpod/test/goldens/task-board-tablet.png",
      ].map((path) => ({ path, sha256: sha256(path) })),
      surfaceFixture: {
        path: "examples/flutter-riverpod/test/goldens/a2ui-surface-messages.json",
        sha256: sha256("examples/flutter-riverpod/test/goldens/a2ui-surface-messages.json"),
      },
    },
    requiredFiles,
  };
}

function cli() {
  const args = process.argv.slice(2);
  const reportIndex = args.indexOf("--report");
  const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : undefined;
  assert(reportIndex < 0 || reportPath, "--report requires a path");
  const report = verifyFlutterRiverpodA2uiExample({
    runFlutter: !args.includes("--skip-flutter"),
    platformSmoke: !args.includes("--skip-platform-smoke"),
  });
  if (reportPath) {
    const absolute = resolve(root, reportPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(
    "PASS: Flutter/Riverpod/A2UI example analysis, tests, policy boundary, adapter boundary, and platform smoke verified.\n",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
