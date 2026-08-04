import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const APP_ROOT = "examples/tauri-universal";

export function verifyTauriUniversalExample({
  root = process.cwd(),
  overrides = new Map(),
  missingPaths = new Set(),
} = {}) {
  const checks = [];
  const readText = (path) => {
    if (overrides.has(path)) return overrides.get(path);
    return readFileSync(resolve(root, path), "utf8");
  };
  const readJson = (path) => JSON.parse(readText(path));
  const exists = (path) => !missingPaths.has(path) && existsSync(resolve(root, path));
  const sha256 = (path) =>
    createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
  const pass = (id, detail) => checks.push({ id, status: "pass", detail });
  const requireValue = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  const rootManifest = readJson("package.json");
  const workspace = readText("pnpm-workspace.yaml");
  const manifest = readJson(`${APP_ROOT}/package.json`);
  requireValue(manifest.private === true, "the universal example must remain private");
  requireValue(manifest.dependencies.react === "19.2.8", "React must remain pinned to 19.2.8");
  requireValue(manifest.devDependencies.vite === "8.2.0", "Vite must remain pinned to 8.2.0");
  requireValue(manifest.dependencies["@tauri-apps/api"] === "2.11.1", "Tauri API pin drifted");
  requireValue(manifest.dependencies["@tauri-apps/plugin-sql"] === "2.4.0", "SQL plugin pin drifted");
  requireValue(manifest.dependencies["@tauri-apps/plugin-deep-link"] === "2.4.9", "deep-link plugin pin drifted");
  requireValue(workspace.includes('"examples/tauri-universal"'), "the universal example is absent from the pnpm workspace");
  for (const script of [
    "typecheck:tauri-universal",
    "test:tauri-universal:unit",
    "test:tauri-universal:rust",
    "test:tauri-universal:contract",
    "test:tauri-universal:browser",
  ]) {
    requireValue(typeof rootManifest.scripts[script] === "string", `root script ${script} is missing`);
  }
  pass("workspace", "private pnpm workspace and exact React/Vite/Tauri pins");

  const cargo = readText(`${APP_ROOT}/src-tauri/Cargo.toml`);
  const rustHost = readText(`${APP_ROOT}/src-tauri/src/lib.rs`);
  for (const dependency of [
    'tauri = { version = "2.11.5"',
    'tauri-plugin-sql = { version = "2.4.0"',
    'tauri-plugin-deep-link = "2.4.9"',
  ]) {
    requireValue(cargo.includes(dependency), `Cargo dependency is missing or unpinned: ${dependency}`);
  }
  for (const registration of [
    ".plugin(entity_graph_tauri::init())",
    ".plugin(tauri_plugin_sql::Builder::default().build())",
    ".plugin(tauri_plugin_deep_link::init())",
  ]) {
    requireValue(rustHost.includes(registration), `Rust host registration is missing: ${registration}`);
  }
  requireValue(rustHost.includes("main_webview_denies_the_destructive_clear_command"), "native clear-denial test is missing");
  requireValue(rustHost.includes("main_webview_runs_the_registered_command_round_trip"), "native command round-trip test is missing");
  pass("native-host", "entity graph, SQLite, and deep-link plugins plus command/denial tests");

  const config = readJson(`${APP_ROOT}/src-tauri/tauri.conf.json`);
  requireValue(config.identifier === "com.prometheusags.entitygraph.universal", "application identifier drifted");
  requireValue(config.version === "0.0.1", "mobile application version must remain buildable at 0.0.1");
  requireValue(config.plugins?.sql?.preload?.includes("sqlite:prometheus-entity-graph.db"), "native SQLite preload is missing");
  requireValue(
    config.plugins?.["deep-link"]?.desktop?.schemes?.includes("prometheus-entity"),
    "desktop deep-link scheme is missing",
  );
  requireValue(
    config.plugins?.["deep-link"]?.mobile?.some(
      (entry) => entry.scheme?.includes("prometheus-entity") && entry.appLink === false,
    ),
    "mobile deep-link scheme is missing",
  );
  const rustToolchain = readText(`${APP_ROOT}/src-tauri/rust-toolchain.toml`);
  const androidBuildTask = readText(
    `${APP_ROOT}/src-tauri/gen/android/buildSrc/src/main/java/com/prometheusags/entitygraph/universal/kotlin/BuildTask.kt`,
  );
  const iosProject = readText(`${APP_ROOT}/src-tauri/gen/apple/project.yml`);
  requireValue(rustToolchain.includes('channel = "stable"'), "mobile Rust toolchain must remain stable");
  requireValue(
    androidBuildTask.includes('environment("RUSTUP_TOOLCHAIN", "stable")'),
    "Android Gradle Rust build must force the stable toolchain",
  );
  requireValue(
    iosProject.includes("RUSTUP_TOOLCHAIN=stable pnpm tauri ios xcode-script"),
    "iOS Xcode Rust build must force the stable toolchain",
  );
  pass("configuration", "one buildable config owns desktop/mobile routes and stable Rust selection");

  const capability = readJson(`${APP_ROOT}/src-tauri/capabilities/universal-main.json`);
  const permissions = new Set(capability.permissions);
  for (const expected of [
    "core:event:default",
    "core:window:default",
    "deep-link:default",
    "sql:default",
    "sql:allow-execute",
    "entity-graph-tauri:default",
    "entity-graph-tauri:allow-graph-upsert-entity",
    "entity-graph-tauri:allow-graph-set-list",
  ]) {
    requireValue(permissions.has(expected), `required capability permission is missing: ${expected}`);
  }
  for (const forbidden of [
    "entity-graph-tauri:allow-graph-clear",
    "entity-graph-tauri:allow-graph-remove-entity",
    "entity-graph-tauri:allow-graph-persist-snapshot",
    "entity-graph-tauri:allow-graph-restore-snapshot",
  ]) {
    requireValue(!permissions.has(forbidden), `destructive or in-memory permission must remain withheld: ${forbidden}`);
  }
  pass("capability", "least-privilege writes with clear/remove/in-memory snapshots withheld");

  const sourceRoot = `${APP_ROOT}/src`;
  const sourceFiles = walk(resolve(root, sourceRoot))
    .filter((path) => /\.(ts|tsx)$/.test(path))
    .map((path) => relative(root, path));
  const componentFiles = sourceFiles.filter((path) => path.includes("/components/"));
  for (const path of componentFiles) {
    const source = readText(path);
    requireValue(!/useGraphStore|graphStore|createPlatformService/.test(source), `component boundary violation in ${path}`);
    requireValue(!/@tauri-apps\//.test(source), `component imports a native Tauri API in ${path}`);
  }
  for (const path of sourceFiles.filter((path) => !path.endsWith("platform-service.ts") && !path.endsWith("platform-service.test.ts"))) {
    requireValue(!/@tauri-apps\//.test(readText(path)), `native import escaped the platform service boundary in ${path}`);
  }
  requireValue(
    !sourceFiles.some((path) => /createGraphStore/.test(readText(path))),
    "the universal example must not create a second graph store",
  );
  pass("layering", "components use hooks and all native imports stay in the platform service");

  const service = readText(`${sourceRoot}/features/platform/services/platform-service.ts`);
  for (const contract of [
    "createTauriSqlPersistenceAdapter",
    "startLocalFirstGraph",
    "QUEUE_STORAGE_KEY",
    "CONNECTION_MODE_STORAGE_KEY",
    "parseTaskDeepLink",
    "flushQueue",
    "cascadeInvalidation",
    "RealtimeManager",
    'state.patchEntity(ENTITY_TYPES.task, taskId, { status, pendingSync: true })',
  ]) {
    requireValue(service.includes(contract), `offline or boundary contract is missing: ${contract}`);
  }
  pass("offline-runtime", "SQLite/localStorage runtime, durable queue, optimistic patch, and deep-link validation");

  const requiredPlatformFiles = [
    `${APP_ROOT}/src-tauri/gen/android/app/src/main/AndroidManifest.xml`,
    `${APP_ROOT}/src-tauri/gen/android/app/src/main/java/com/prometheusags/entitygraph/universal/MainActivity.kt`,
    `${APP_ROOT}/src-tauri/gen/apple/project.yml`,
    `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example_iOS/Info.plist`,
    `${APP_ROOT}/src-tauri/icons/icon.png`,
  ];
  for (const path of requiredPlatformFiles) {
    requireValue(exists(path), `generated platform artifact is missing: ${path}`);
  }
  pass("platform-shells", "desktop icon plus Android and iOS generated application shells");

  const receiptPath =
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/task-5-platform-evidence.json";
  requireValue(exists(receiptPath), "task-5 platform evidence receipt is missing");
  const receipt = readJson(receiptPath);
  requireValue(receipt.status === "pass", "task-5 platform evidence must pass");
  requireValue(receipt.desktop?.runtime === "pass", "desktop packaged runtime evidence is incomplete");
  requireValue(receipt.desktop?.offlineRestart === "pass", "desktop offline restart evidence is incomplete");
  requireValue(receipt.desktop?.capabilityDenial === "pass", "desktop capability denial evidence is incomplete");
  requireValue(receipt.android?.runtime === "pass", "Android application runtime evidence is incomplete");
  requireValue(receipt.android?.capabilityDenial === "pass", "Android capability denial evidence is incomplete");
  requireValue(receipt.ios?.runtime === "pass", "iOS application runtime evidence is incomplete");
  for (const artifact of receipt.retainedArtifacts ?? []) {
    requireValue(exists(artifact.path), `retained platform artifact is missing: ${artifact.path}`);
    requireValue(sha256(artifact.path) === artifact.sha256, `retained platform artifact hash drifted: ${artifact.path}`);
  }
  pass("platform-evidence", "hash-verified browser, desktop, Android, and iOS task-5 receipts");

  return {
    schemaVersion: 1,
    change: "v3-tauri-universal-example",
    status: "pass",
    evidenceKind: "source-workspace-contract",
    countsAsPlatformBuildEvidence: false,
    separatePlatformEvidence: receiptPath,
    checks,
  };
}

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    const entry = resolve(path, name);
    return statSync(entry).isDirectory() ? walk(entry) : [entry];
  });
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const report = verifyTauriUniversalExample();
  const reportPath = argumentValue("--report");
  if (reportPath) {
    const absolute = resolve(process.cwd(), reportPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify({ ...report, recordedAt: new Date().toISOString() }, null, 2)}\n`);
  }
  process.stdout.write(`Universal Tauri contract passed: ${report.checks.length} checks\n`);
}
