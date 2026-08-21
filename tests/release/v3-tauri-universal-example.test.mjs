import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "examples/tauri-app");

const REQUIRED_FILES = [
  "package.json",
  "vite.config.ts",
  "index.html",
  "src/main.tsx",
  "src/App.tsx",
  "src/domain/types.ts",
  "src/domain/seed.ts",
  "src/domain/schema.ts",
  "src/platform/bridge.ts",
  "src/platform/tauri-bridge.ts",
  "src/platform/web-bridge.ts",
  "src/platform/index.ts",
  "src/graph/runtime.ts",
  "src/features/task-service.ts",
  "src/features/TaskBoard.tsx",
  "src/features/PlatformPanel.tsx",
  "tests/bridge-contract.test.ts",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/tauri.mobile-denied.conf.json",
  "src-tauri/capabilities/default.json",
  "src-tauri/capabilities/denied.json",
  "src-tauri/capabilities/mobile-allowed.json",
  "src-tauri/capabilities/mobile-denied.json",
  "src-tauri/src/lib.rs",
  "src-tauri/src/main.rs",
  "src-tauri/build.rs",
  "src-tauri/gen/android/app/build.gradle.kts",
  "src-tauri/gen/apple/prometheus-tauri-universal.xcodeproj/project.pbxproj",
];

test("the universal Tauri example file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(appRoot, file)), true, `missing ${file}`);
  }
  assert.equal(
    existsSync(join(root, "scripts/verify-tauri-universal-example.mjs")),
    true,
    "missing verifier script",
  );
});

test("the example is a pnpm workspace member pinned to workspace packages", () => {
  const manifest = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
  for (const dep of [
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-tauri",
    "@prometheus-ags/prometheus-entity-management",
  ]) {
    assert.equal(manifest.dependencies[dep], "workspace:*", `${dep} not workspace-pinned`);
  }
  for (const dep of ["@tauri-apps/api", "@tauri-apps/plugin-sql", "@tauri-apps/plugin-deep-link"]) {
    assert.ok(manifest.dependencies[dep], `missing official plugin dep ${dep}`);
  }
  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  assert.match(workspace, /- "examples\/tauri-app"/, "workspace membership missing");
});

test("platform conditionals live only at the adapter boundary", () => {
  for (const feature of [
    "src/features/TaskBoard.tsx",
    "src/features/PlatformPanel.tsx",
    "src/App.tsx",
    "src/main.tsx",
  ]) {
    const source = readFileSync(join(appRoot, feature), "utf8");
    assert.ok(!source.includes("@tauri-apps/"), `${feature} imports @tauri-apps directly`);
    assert.ok(
      !/\.upsertEntity\(|\.patchEntity\(|\.removeEntity\(|\.setListResult\(/.test(source),
      `${feature} writes the graph directly`,
    );
  }
  const bridge = readFileSync(join(appRoot, "src/platform/bridge.ts"), "utf8");
  assert.match(bridge, /class BridgeDeniedError/);
  assert.match(bridge, /prometheus-tasks:\/\/task\//);
});

test("capabilities are least-privilege and denial fixtures grant nothing", () => {
  const granted = JSON.parse(
    readFileSync(join(appRoot, "src-tauri/capabilities/default.json"), "utf8"),
  );
  const denied = JSON.parse(readFileSync(join(appRoot, "src-tauri/capabilities/denied.json"), "utf8"));
  const mobileDenied = JSON.parse(
    readFileSync(join(appRoot, "src-tauri/capabilities/mobile-denied.json"), "utf8"),
  );
  assert.ok(granted.permissions.includes("entity-graph-tauri:default"));
  assert.ok(granted.permissions.includes("entity-graph-tauri:allow-graph-upsert-entity"));
  assert.equal(denied.permissions.length, 0);
  assert.equal(mobileDenied.permissions.length, 0);
  const conf = JSON.parse(readFileSync(join(appRoot, "src-tauri/tauri.conf.json"), "utf8"));
  assert.ok(conf.plugins["deep-link"].desktop.schemes.includes("prometheus-tasks"));
  assert.ok(conf.app.security.csp);
});

test("the Rust host registers the workspace plugin and proves the E2E suite", () => {
  const cargo = readFileSync(join(appRoot, "src-tauri/Cargo.toml"), "utf8");
  assert.match(
    cargo,
    /entity-graph-tauri = \{ path = "..\/..\/..\/packages\/entity-graph-tauri\/rust-plugin" \}/,
  );
  const libRs = readFileSync(join(appRoot, "src-tauri/src/lib.rs"), "utf8");
  for (const testName of [
    "desktop_command_e2e_round_trips_entities_and_lists",
    "webview_without_the_capability_is_denied_fail_closed",
    "offline_restart_persist_clear_restore_round_trip",
  ]) {
    assert.ok(libRs.includes(`fn ${testName}`), `missing Rust test ${testName}`);
  }
});

test("no credential or secret surface exists anywhere in the example", () => {
  const secretPattern = /api[_-]?key\s*[:=]|openai|anthropic|\bsk-[a-z0-9]{6,}/i;
  const walk = (current, entries = []) => {
    for (const entry of readdirSync(current)) {
      const candidate = join(current, entry);
      if (statSync(candidate).isDirectory()) walk(candidate, entries);
      else entries.push(candidate);
    }
    return entries;
  };
  for (const file of walk(join(appRoot, "src"))) {
    assert.ok(
      !secretPattern.test(readFileSync(file, "utf8")),
      `possible credential reference in ${file}`,
    );
  }
});

test("coverage records the tauri-desktop-mobile showcase as implemented", () => {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const showcase = coverage.showcases.find((entry) => entry.id === "tauri-desktop-mobile");
  assert.ok(showcase, "tauri-desktop-mobile showcase missing from examples/coverage.json");
  assert.equal(showcase.status, "implemented");
  assert.equal(showcase.change, "v3-tauri-universal-example");
  assert.equal(showcase.scenarioIds.length, 7);
  assert.equal(showcase.runtimeEvidence.status, "implemented");
  assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:tauri-universal");
  assert.equal(showcase.visualEvidence.status, "implemented");
  for (const [capabilityId, kind] of [
    ["graph.offline-persistence-sync", "platform"],
    ["platform.tauri", "visual"],
  ]) {
    const capability = coverage.capabilities.find(({ id }) => id === capabilityId);
    const entry = capability?.releaseEvidence.find(
      ({ ownerChange, kind: entryKind }) =>
        ownerChange === "v3-tauri-universal-example" && entryKind === kind,
    );
    assert.equal(entry?.status, "implemented", `${capabilityId} ${kind} entry not implemented`);
  }
});

test("root gates exist for the change", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const script of [
    "verify:tauri-universal",
    "test:v3-tauri-universal-example",
    "bdd:tauri-universal",
  ]) {
    assert.ok(pkg.scripts[script], `missing root script ${script}`);
  }
});
