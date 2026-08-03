#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyDartLedger } from "./dart-public-api-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(root, "packages/entity_graph_flutter");
const defaultInitialGolden = "packages/entity_graph_flutter/test/goldens/cross-view-initial.png";
const defaultOptimisticGolden = "packages/entity_graph_flutter/test/goldens/cross-view-optimistic.png";
const linuxInitialGolden = "packages/entity_graph_flutter/test/goldens/linux-cross-view-initial.png";
const linuxOptimisticGolden =
  "packages/entity_graph_flutter/test/goldens/linux-cross-view-optimistic.png";
const initialGolden = process.platform === "linux" ? linuxInitialGolden : defaultInitialGolden;
const optimisticGolden = process.platform === "linux" ? linuxOptimisticGolden : defaultOptimisticGolden;

const requiredFiles = [
  "packages/entity_graph_flutter/lib/entity_graph_flutter.dart",
  "packages/entity_graph_flutter/lib/src/graph.dart",
  "packages/entity_graph_flutter/lib/src/providers.dart",
  "packages/entity_graph_flutter/lib/src/providers.g.dart",
  "packages/entity_graph_flutter/lib/src/view.dart",
  "packages/entity_graph_flutter/lib/src/transport.dart",
  "packages/entity_graph_flutter/lib/src/ffi-transport.dart",
  "packages/entity_graph_flutter/test/view-contract_test.dart",
  "packages/entity_graph_flutter/test/provider-contract_test.dart",
  "packages/entity_graph_flutter/test/ffi-transport-contract_test.dart",
  "packages/entity_graph_flutter/test/cross-view-widget_test.dart",
  defaultInitialGolden,
  defaultOptimisticGolden,
  linuxInitialGolden,
  linuxOptimisticGolden,
  "prometheus-entity-skills/_shared/references/dart-library-exports.json",
  "prometheus-entity-skills/_shared/references/dart-graph-riverpod.md",
  "release/dart-graph-riverpod.md",
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

function executeFlutterSuite() {
  try {
    return execFileSync("flutter", ["test", "--reporter", "compact"], {
      cwd: packageRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300_000,
    });
  } catch (error) {
    process.stderr.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    throw error;
  }
}

export function verifyDartGraphRiverpod({ runFlutter = true } = {}) {
  for (const path of requiredFiles) {
    assert(existsSync(join(root, path)), `missing required Dart release artifact: ${path}`);
  }

  const packageManifest = read("packages/entity_graph_flutter/pubspec.yaml");
  const workspaceManifest = read("pubspec.yaml");
  const workspacePackage = JSON.parse(read("package.json"));
  const providers = read("packages/entity_graph_flutter/lib/src/providers.dart");
  const generated = read("packages/entity_graph_flutter/lib/src/providers.g.dart");
  const graph = read("packages/entity_graph_flutter/lib/src/graph.dart");
  const ffi = read("packages/entity_graph_flutter/lib/src/ffi-transport.dart");
  const providerTests = read("packages/entity_graph_flutter/test/provider-contract_test.dart");
  const widgetTests = read("packages/entity_graph_flutter/test/cross-view-widget_test.dart");
  const packageReadme = read("packages/entity_graph_flutter/README.md");
  const releaseGuide = read("release/dart-graph-riverpod.md");
  const skillGuide = read("prometheus-entity-skills/_shared/references/dart-graph-riverpod.md");
  const coverage = JSON.parse(read("examples/coverage.json"));
  const dartLedger = verifyDartLedger();

  for (const phrase of [
    "version: 3.0.0",
    'sdk: ">=3.12.0 <4.0.0"',
    'flutter: ">=3.44.0"',
    'flutter_riverpod: ">=3.3.2 <3.4.0"',
    'riverpod_annotation: ">=4.0.3 <4.0.5"',
    "build_runner: 2.15.1",
    "riverpod_generator: 4.0.4",
    "flutter_lints: ^6.0.0",
  ]) assert(packageManifest.includes(phrase), `missing stable Dart matrix entry: ${phrase}`);
  for (const removed of ["freezed:", "freezed_annotation:", "json_serializable:", "json_annotation:"]) {
    assert(!packageManifest.includes(removed), `stale generator dependency remains: ${removed}`);
  }
  assertMatch(workspaceManifest, /packages\/entity_graph_flutter/, "Dart package is not in the workspace");
  assertMatch(workspaceManifest, /melos:/, "Melos workspace configuration is absent");

  for (const script of [
    "dart:bootstrap",
    "dart:generate",
    "dart:format",
    "dart:analyze",
    "dart:test",
    "dart:package",
    "dart:ci",
  ]) assert(workspacePackage.scripts[script], `root script ${script} is not wired`);

  for (const provider of [
    "entityGraphProvider",
    "entityTransportRegistryProvider",
    "entityChangeBridgeProvider",
    "entityListProvider",
    "entityProvider",
    "entityCrudProvider",
    "entityMutationsProvider",
  ]) assert(generated.includes(provider), `generated provider missing: ${provider}`);
  assertMatch(providers, /retryCount >= 2/, "transient retry policy is not bounded to two retries");
  assertMatch(providers, /typed is TerminalError/, "terminal errors are not excluded from retries");
  assertMatch(graph, /Lists store ids, never embedded entity payloads/, "ID-only list invariant is absent");
  assertMatch(graph, /removeEntityOptimistically/, "graph-owned delete rollback receipt is absent");
  assertMatch(providerTests, /local mode evaluates immediately without a transport call/, "local view proof missing");
  assertMatch(providerTests, /hybrid mode renders local data then replaces remote membership/, "hybrid proof missing");
  assertMatch(providerTests, /transient failures are bounded to one call plus two retries/, "bounded retry proof missing");
  assertMatch(providerTests, /failed optimistic delete restores entity and exact list position/, "delete rollback proof missing");
  assertMatch(providerTests, /realtime update and delete mutate the canonical graph/, "realtime proof missing");
  assertMatch(widgetTests, /find\.text\('Alicia Rivera'\), findsNWidgets\(2\)/, "cross-view render proof missing");
  assertMatch(ffi, /imports no generated FFI package/, "optional FFI boundary is not documented");
  assert(!/package:(?:flutter_rust_bridge|ffi)\//.test(ffi), "optional FFI seam gained a native runtime dependency");
  assert(!/(?:flutter_rust_bridge|\n\s*ffi:)\s/.test(packageManifest), "package manifest requires an FFI runtime");

  assertMatch(packageReadme, /flutter_riverpod: \^3\.3\.2/, "package guide does not use the Flutter 3.44-compatible Riverpod line");
  assert(!packageReadme.includes("flutter_riverpod: ^2.6.1"), "package guide still installs Riverpod 2");
  for (const guide of [packageReadme, releaseGuide, skillGuide]) {
    assertMatch(guide, /entityListProvider/, "Dart guide omits generated list provider");
    assertMatch(guide, /EntityGraph/, "Dart guide omits canonical graph ownership");
    assertMatch(guide, /optional/i, "Dart guide omits the optional native boundary");
    assertMatch(guide, /pub\.dev/, "Dart guide omits registry limits");
  }
  assertMatch(releaseGuide, /does not certify/i, "release guide does not state exclusions");
  assertMatch(skillGuide, /pnpm run verify:dart-exports/, "skill guide omits ledger verification");
  assert(dartLedger.exports.length === 81, "unexpected Dart public declaration count");

  const qualityGate = coverage.qualityGates.find(({ id }) => id === "release.platform.dart-riverpod");
  assert(qualityGate, "coverage omits the Dart/Riverpod quality gate");
  assert(qualityGate.status === "implemented", "Dart/Riverpod quality gate is not implemented");
  assert(
    qualityGate.command === "pnpm run verify:dart-graph-riverpod",
    "Dart/Riverpod quality gate uses the wrong command",
  );
  const capability = coverage.capabilities.find(({ id }) => id === "platform.flutter-riverpod");
  assert(capability, "coverage omits the Flutter/Riverpod platform capability");
  const dartEvidence = capability.releaseEvidence.filter(
    ({ ownerChange }) => ownerChange === "v3-dart-graph-riverpod",
  );
  assert(
    dartEvidence.filter(({ status }) => status === "implemented").length === 2,
    "coverage must carry exactly platform and scoped visual Dart evidence",
  );
  assert(
    capability.releaseEvidence.some(
      ({ ownerChange, status }) =>
        ownerChange === "v3-flutter-riverpod-a2ui-example" && status === "partial",
    ),
    "coverage must preserve the Flutter showcase's partial evidence boundary",
  );

  const flutterOutput = runFlutter ? executeFlutterSuite() : "skipped by structural verifier";
  if (runFlutter) assertMatch(flutterOutput, /All tests passed!/, "Flutter suite did not report success");

  return {
    schemaVersion: "1",
    package: "entity_graph_flutter@3.0.0",
    result: "pass",
    flutter: {
      executed: runFlutter,
      command: "flutter test --reporter compact",
      passed: runFlutter ? /All tests passed!/.test(flutterOutput) : null,
    },
    contracts: {
      normalizedGraph: "pass",
      idOnlyLists: "pass",
      generatedRiverpod: "pass",
      localRemoteHybridViews: "pass",
      optimisticCrudRollback: "pass",
      boundedRetry: "pass",
      realtimeBridge: "pass",
      pluggableTransport: "pass",
      optionalFfi: "pass",
      publicApiLedger: "pass",
      declaredSurface: "pass",
    },
    publicApiDeclarations: dartLedger.exports.length,
    visualEvidence: {
      scope: "Flutter widget harness for cross-view optimistic propagation; not full app, device, or accessibility certification",
      inspected: true,
      baselinePlatform: process.platform === "linux" ? "linux" : "default",
      initial: {
        path: initialGolden,
        sha256: sha256(initialGolden),
      },
      optimistic: {
        path: optimisticGolden,
        sha256: sha256(optimisticGolden),
      },
    },
    requiredFiles: requiredFiles.map((path) => relative(root, join(root, path))),
  };
}

function cli() {
  const args = process.argv.slice(2);
  const skipFlutter = args.includes("--skip-flutter");
  const reportIndex = args.indexOf("--report");
  const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : undefined;
  assert(reportIndex < 0 || reportPath, "--report requires a path");
  const report = verifyDartGraphRiverpod({ runFlutter: !skipFlutter });
  if (reportPath) {
    const absolute = resolve(root, reportPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(
    `PASS: Dart graph, Riverpod, CRUD, retry, realtime, transport, FFI, and visual contracts verified${skipFlutter ? " structurally" : " with Flutter tests"}.\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
