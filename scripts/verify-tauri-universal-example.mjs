#!/usr/bin/env node

/**
 * Certifies the universal Tauri showcase example (desktop + mobile).
 *
 * Lanes: frontend typecheck, bridge contract tests, production Vite build,
 * Rust MockRuntime command E2E (allowed + fail-closed denied + offline
 * restart), Chromium desktop/mobile viewport scenarios with axe, and
 * platform artifact receipts (desktop binary, Android APK, iOS simulator
 * app bundle) with sha256 pins.
 *
 * Flags:
 *   --skip-platform-artifacts  do not require desktop/APK/iOS artifacts
 *   --rebuild-platform         re-run the slow native build lanes first
 *   --report <path>            write the JSON receipt (default: evidence dir)
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(root, "examples/tauri-app");
const evidenceDirectory = resolve(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example",
);

const args = process.argv.slice(2);
const skipPlatformArtifacts = args.includes("--skip-platform-artifacts");
const rebuildPlatform = args.includes("--rebuild-platform");
const reportIndex = args.indexOf("--report");
const reportPath =
  reportIndex >= 0
    ? resolve(root, args[reportIndex + 1])
    : join(evidenceDirectory, "verification.json");

const requiredFiles = [
  "examples/tauri-app/package.json",
  "examples/tauri-app/vite.config.ts",
  "examples/tauri-app/index.html",
  "examples/tauri-app/src/main.tsx",
  "examples/tauri-app/src/App.tsx",
  "examples/tauri-app/src/domain/types.ts",
  "examples/tauri-app/src/domain/seed.ts",
  "examples/tauri-app/src/domain/schema.ts",
  "examples/tauri-app/src/platform/bridge.ts",
  "examples/tauri-app/src/platform/tauri-bridge.ts",
  "examples/tauri-app/src/platform/web-bridge.ts",
  "examples/tauri-app/src/platform/index.ts",
  "examples/tauri-app/src/graph/runtime.ts",
  "examples/tauri-app/src/features/task-service.ts",
  "examples/tauri-app/src/features/TaskBoard.tsx",
  "examples/tauri-app/src/features/PlatformPanel.tsx",
  "examples/tauri-app/tests/bridge-contract.test.ts",
  "examples/tauri-app/src-tauri/Cargo.toml",
  "examples/tauri-app/src-tauri/tauri.conf.json",
  "examples/tauri-app/src-tauri/tauri.mobile-denied.conf.json",
  "examples/tauri-app/src-tauri/capabilities/default.json",
  "examples/tauri-app/src-tauri/capabilities/denied.json",
  "examples/tauri-app/src-tauri/capabilities/mobile-allowed.json",
  "examples/tauri-app/src-tauri/capabilities/mobile-denied.json",
  "examples/tauri-app/src-tauri/src/lib.rs",
  "examples/tauri-app/src-tauri/src/main.rs",
  "examples/tauri-app/src-tauri/build.rs",
  "examples/tauri-app/src-tauri/gen/android/app/build.gradle.kts",
  "examples/tauri-app/src-tauri/gen/apple/prometheus-tauri-universal.xcodeproj/project.pbxproj",
  "tests/browser/v3-tauri-universal-example.spec.ts",
  "tests/browser/v3-tauri-universal-example.playwright.config.ts",
];

const platformArtifacts = {
  desktopBinary: "examples/tauri-app/src-tauri/target/debug/prometheus-tauri-universal",
  androidApk:
    "examples/tauri-app/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk",
  iosSimulatorAppBinary:
    "examples/tauri-app/src-tauri/gen/apple/build/arm64-sim/Prometheus Tasks.app/Prometheus Tasks",
};

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
    cwd: options.cwd ?? exampleRoot,
    env: { ...process.env, FORCE_COLOR: "0", USER: process.env.USER || "gqadonis" },
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
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
  return result.stdout ?? "";
}

export function verifyTauriUniversalExample({
  platformArtifacts: checkArtifacts = true,
  rebuildPlatform: rebuild = false,
} = {}) {
  for (const path of requiredFiles) {
    assert(existsSync(join(root, path)), `missing required example artifact: ${path}`);
  }

  // ── Manifest and workspace wiring ────────────────────────────────────────
  const exampleManifest = JSON.parse(read("examples/tauri-app/package.json"));
  const workspaceManifest = read("pnpm-workspace.yaml");
  const workspacePackage = JSON.parse(read("package.json"));
  for (const [dep, range] of [
    ["@prometheus-ags/entity-graph-core", "workspace:*"],
    ["@prometheus-ags/entity-graph-tauri", "workspace:*"],
    ["@prometheus-ags/prometheus-entity-management", "workspace:*"],
  ]) {
    assert(
      exampleManifest.dependencies[dep] === range,
      `example dependency ${dep} is not pinned to ${range}`,
    );
  }
  for (const dep of ["@tauri-apps/api", "@tauri-apps/plugin-sql", "@tauri-apps/plugin-deep-link"]) {
    assert(exampleManifest.dependencies[dep], `example is missing official plugin dep ${dep}`);
  }
  assertMatch(
    workspaceManifest,
    /- "examples\/tauri-app"/,
    "example is not a pnpm workspace member",
  );
  for (const script of [
    "verify:tauri-universal",
    "test:v3-tauri-universal-example",
    "bdd:tauri-universal",
  ]) {
    assert(workspacePackage.scripts[script], `root script ${script} is not wired`);
  }

  // ── Layering: platform conditionals only at the adapter boundary ─────────
  for (const feature of [
    "src/features/TaskBoard.tsx",
    "src/features/PlatformPanel.tsx",
    "src/App.tsx",
    "src/main.tsx",
  ]) {
    const source = read(`examples/tauri-app/${feature}`);
    assert(
      !source.includes("@tauri-apps/"),
      `feature ${feature} imports @tauri-apps directly`,
    );
    assert(
      !/\.upsertEntity\(|\.patchEntity\(|\.removeEntity\(|\.setListResult\(/.test(source),
      `feature ${feature} writes the graph directly`,
    );
  }
  const bridge = read("examples/tauri-app/src/platform/bridge.ts");
  assertMatch(bridge, /class BridgeDeniedError/, "fail-closed denial type missing");
  assertMatch(
    bridge,
    /prometheus-tasks:\/\/task\//,
    "deep-link allowlist prefix missing",
  );
  assertMatch(bridge, /return null;/, "deep-link parser must fail closed");
  const tauriBridge = read("examples/tauri-app/src/platform/tauri-bridge.ts");
  assertMatch(tauriBridge, /createTauriGraphPlugin/, "certified plugin entry point unused");

  // ── Least-privilege capabilities ─────────────────────────────────────────
  const granted = JSON.parse(read("examples/tauri-app/src-tauri/capabilities/default.json"));
  const denied = JSON.parse(read("examples/tauri-app/src-tauri/capabilities/denied.json"));
  const mobileDenied = JSON.parse(
    read("examples/tauri-app/src-tauri/capabilities/mobile-denied.json"),
  );
  assert(
    granted.permissions.includes("entity-graph-tauri:default"),
    "main window lost the read-only plugin default",
  );
  assert(
    granted.permissions.includes("entity-graph-tauri:allow-graph-upsert-entity"),
    "mutation grant must be explicit",
  );
  assert(denied.permissions.length === 0, "denied capability must grant nothing");
  assert(mobileDenied.permissions.length === 0, "mobile-denied capability must grant nothing");
  const conf = JSON.parse(read("examples/tauri-app/src-tauri/tauri.conf.json"));
  assert(
    conf.plugins?.["deep-link"]?.desktop?.schemes?.includes("prometheus-tasks"),
    "deep-link scheme is not declared",
  );
  assert(conf.app?.security?.csp, "CSP is not declared");

  // ── Rust E2E suite presence ──────────────────────────────────────────────
  const libRs = read("examples/tauri-app/src-tauri/src/lib.rs");
  for (const testName of [
    "desktop_command_e2e_round_trips_entities_and_lists",
    "webview_without_the_capability_is_denied_fail_closed",
    "offline_restart_persist_clear_restore_round_trip",
  ]) {
    assert(libRs.includes(`fn ${testName}`), `Rust E2E test ${testName} missing`);
  }
  const cargoToml = read("examples/tauri-app/src-tauri/Cargo.toml");
  assertMatch(
    cargoToml,
    /entity-graph-tauri = \{ path = "..\/..\/..\/packages\/entity-graph-tauri\/rust-plugin" \}/,
    "plugin must be consumed from the workspace path",
  );

  // ── Coverage manifest reconciliation ─────────────────────────────────────
  const coverage = JSON.parse(read("examples/coverage.json"));
  const showcase = coverage.showcases.find((entry) => entry.id === "tauri-desktop-mobile");
  assert(showcase, "coverage omits the tauri-desktop-mobile showcase");
  assert(showcase.status === "implemented", "tauri-desktop-mobile showcase is not implemented");
  assert(showcase.change === "v3-tauri-universal-example", "showcase owner drifted");
  assert(
    showcase.runtimeEvidence.command === "pnpm run verify:tauri-universal",
    "showcase runtime evidence uses the wrong command",
  );
  assert(showcase.runtimeEvidence.status === "implemented", "showcase runtime evidence missing");
  assert(showcase.visualEvidence.status === "implemented", "showcase visual evidence missing");
  for (const [capabilityId, kind] of [
    ["graph.offline-persistence-sync", "platform"],
    ["platform.tauri", "visual"],
  ]) {
    const capability = coverage.capabilities.find(({ id }) => id === capabilityId);
    const entry = capability?.releaseEvidence.find(
      ({ ownerChange, kind: entryKind }) =>
        ownerChange === "v3-tauri-universal-example" && entryKind === kind,
    );
    assert(entry, `coverage ${capabilityId} lacks the Tauri ${kind} entry`);
    assert(
      entry.status === "implemented",
      `coverage ${capabilityId} Tauri ${kind} entry is not implemented`,
    );
  }

  // ── Executable gates ─────────────────────────────────────────────────────
  run("typecheck", "pnpm", ["--filter", "prometheus-entity-management-tauri", "run", "typecheck"], {
    cwd: root,
  });
  run("bridge-contract-tests", "pnpm", ["--filter", "prometheus-entity-management-tauri", "run", "test"], {
    cwd: root,
  });
  run("vite-production-build", "pnpm", ["--filter", "prometheus-entity-management-tauri", "run", "build"], {
    cwd: root,
  });
  const cargo = run("rust-command-e2e", "cargo", ["test", "--lib"], {
    cwd: join(exampleRoot, "src-tauri"),
    timeout: 600_000,
  });
  assertMatch(cargo, /3 passed; 0 failed/, "Rust command E2E suite did not pass 3/3");
  const playwright = run(
    "browser-viewport-scenarios",
    "npx",
    ["playwright", "test", "--config", "tests/browser/v3-tauri-universal-example.playwright.config.ts"],
    { cwd: root, timeout: 300_000 },
  );
  assertMatch(playwright, /2 passed/, "browser desktop/mobile viewport lanes did not pass");

  // ── Platform artifact receipts ───────────────────────────────────────────
  if (rebuild) {
    run("desktop-debug-build", "node", [
      "node_modules/@tauri-apps/cli/tauri.js",
      "build",
      "--debug",
      "--no-bundle",
    ], { cwd: exampleRoot, timeout: 900_000 });
    run("android-debug-apk", "node", [
      "node_modules/@tauri-apps/cli/tauri.js",
      "android",
      "build",
      "--debug",
      "--apk",
    ], { cwd: exampleRoot, timeout: 900_000 });
    run("ios-simulator-app", "node", [
      "node_modules/@tauri-apps/cli/tauri.js",
      "ios",
      "build",
      "--debug",
      "-t",
      "aarch64-sim",
    ], { cwd: exampleRoot, timeout: 900_000 });
  }

  const receipts = {};
  for (const [name, path] of Object.entries(platformArtifacts)) {
    if (!checkArtifacts) {
      receipts[name] = { status: "skipped" };
      continue;
    }
    assert(existsSync(join(root, path)), `missing platform artifact: ${path}`);
    receipts[name] = { status: "present", path, sha256: sha256(path) };
  }

  // ── Browser evidence receipts ────────────────────────────────────────────
  const browserEvidence = {};
  for (const project of ["chromium-desktop", "chromium-mobile"]) {
    const evidencePath = join(evidenceDirectory, `browser-evidence-${project}.json`);
    assert(existsSync(evidencePath), `missing browser evidence receipt for ${project}`);
    const receipt = JSON.parse(readFileSync(evidencePath, "utf8"));
    assert(receipt.status === "pass", `browser evidence for ${project} did not pass`);
    assert(
      Object.keys(receipt.scenarios).length === 7,
      `browser evidence for ${project} must cover 7 scenarios`,
    );
    assert(
      receipt.accessibility.serious === 0 && receipt.accessibility.critical === 0,
      `browser evidence for ${project} has serious/critical axe violations`,
    );
    assert(receipt.consoleErrors.length === 0, `browser evidence for ${project} has console errors`);
    browserEvidence[project] = { status: "pass", scenarios: Object.keys(receipt.scenarios).length };
  }

  return {
    schemaVersion: "1",
    change: "v3-tauri-universal-example",
    recordedAt: new Date().toISOString(),
    result: "pass",
    evidenceBoundary: {
      kind: "source-workspace",
      countsAsPackedPackageEvidence: false,
      note: "Evidence certifies the workspace source example; packed-package certification remains owned by v3-package-module-contracts.",
    },
    commands,
    lanes: {
      typecheck: "pass",
      bridgeContractTests: "pass",
      viteProductionBuild: "pass",
      rustCommandE2e: "pass",
      browserViewportScenarios: browserEvidence,
      platformArtifacts: receipts,
    },
    platformLimits: {
      desktopRuntime:
        "Desktop evidence is a debug binary plus MockRuntime command E2E; no headed GUI session was driven.",
      iosRuntime:
        "iOS evidence is an unsigned aarch64-sim simulator app bundle; device-signed IPA requires an Apple development team absent on this runner.",
      androidRuntime:
        "Android evidence is a debug APK compile; no booted emulator runtime pass was driven.",
      browserEvidence:
        "Chromium screenshots evidence the shared frontend render at desktop/mobile viewports, not native shells.",
    },
  };
}

// CLI entry
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const report = verifyTauriUniversalExample({
      platformArtifacts: !skipPlatformArtifacts,
      rebuildPlatform,
    });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nverification report written: ${reportPath}`);
    console.log("v3-tauri-universal-example: PASS");
  } catch (error) {
    console.error("v3-tauri-universal-example: FAIL");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
