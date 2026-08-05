import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const APP_ROOT = "examples/tauri-universal";
const CLEAR_DENIAL =
  "entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear";
const REMOVE_DENIAL =
  "entity-graph-tauri.graph_remove_entity not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-remove-entity";
const CURRENT_SOURCE_FILES = [
  `${APP_ROOT}/src/features/platform/services/platform-service.ts`,
  `${APP_ROOT}/src/features/platform/components/platform-dashboard.tsx`,
  `${APP_ROOT}/src-tauri/src/lib.rs`,
  `${APP_ROOT}/src-tauri/capabilities/universal-main.json`,
  `${APP_ROOT}/src-tauri/gen/android/buildSrc/src/main/java/com/prometheusags/entitygraph/universal/kotlin/BuildTask.kt`,
  `${APP_ROOT}/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.jar`,
  `${APP_ROOT}/src-tauri/gen/apple/project.yml`,
  `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example.xcodeproj/project.pbxproj`,
  `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example_iOS/Info.plist`,
  `${APP_ROOT}/src-tauri/gen/apple/LaunchScreen.storyboard`,
];

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
  const readSourceBytes = (path) =>
    overrides.has(path)
      ? Buffer.from(overrides.get(path), "utf8")
      : readFileSync(resolve(root, path));
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
  requireValue(rustHost.includes("main_webview_denies_the_destructive_remove_command"), "native remove-denial test is missing");
  requireValue(rustHost.includes("main_webview_runs_the_registered_command_round_trip"), "native command round-trip test is missing");
  pass("native-host", "entity graph, SQLite, and deep-link plugins plus command/clear/remove denial tests");

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
  const iosGeneratedProject = readText(
    `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example.xcodeproj/project.pbxproj`,
  );
  requireValue(rustToolchain.includes('channel = "stable"'), "mobile Rust toolchain must remain stable");
  requireValue(
    androidBuildTask.includes('environment("RUSTUP_TOOLCHAIN", "stable")'),
    "Android Gradle Rust build must force the stable toolchain",
  );
  for (const credentialName of ["CARGO_REGISTRY_TOKEN", "NPM_TOKEN", "NODE_AUTH_TOKEN"]) {
    requireValue(
      androidBuildTask.includes(`environment.remove("${credentialName}")`),
      `Android Gradle Rust build must remove inherited ${credentialName}`,
    );
  }
  requireValue(
    iosProject.includes("RUSTUP_TOOLCHAIN=stable pnpm tauri ios xcode-script"),
    "iOS Xcode Rust build must force the stable toolchain",
  );
  requireValue(
    iosProject.includes("unset CARGO_REGISTRY_TOKEN NPM_TOKEN NODE_AUTH_TOKEN"),
    "iOS Xcode Rust build must remove inherited registry credentials",
  );
  requireValue(
    iosGeneratedProject.includes("unset CARGO_REGISTRY_TOKEN NPM_TOKEN NODE_AUTH_TOKEN\\nRUSTUP_TOOLCHAIN=stable"),
    "checked-in iOS Xcode build phase must remove inherited registry credentials",
  );
  requireValue(
    !iosProject.includes("- path: Externals") && !iosGeneratedProject.includes("libapp.a in Resources"),
    "generated iOS project must exclude native build outputs from application resources",
  );
  requireValue(
    iosProject.includes("CFBundleShortVersionString: 0.0.1") &&
      iosProject.includes('CFBundleVersion: "0.0.1"'),
    "generated iOS application metadata must remain synchronized at 0.0.1",
  );
  requireValue(
    iosProject.includes("CFBundleURLName: prometheus-entity") &&
      iosProject.includes("- prometheus-entity"),
    "generated iOS project metadata must preserve the registered deep-link scheme",
  );
  requireValue(
    iosProject.includes("- path: assets") &&
      iosProject.includes("buildPhase: resources") &&
      iosGeneratedProject.includes("/* assets */") &&
      iosGeneratedProject.includes("assets in Resources"),
    "generated iOS project must retain the Tauri-created web assets resource directory",
  );
  const iosInfo = readText(
    `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example_iOS/Info.plist`,
  );
  requireValue(
    /<key>CFBundleShortVersionString<\/key>\s*<string>0\.0\.1<\/string>/.test(iosInfo) &&
      /<key>CFBundleVersion<\/key>\s*<string>0\.0\.1<\/string>/.test(iosInfo),
    "generated iOS Info.plist must remain synchronized at 0.0.1",
  );
  requireValue(
    /<key>CFBundleURLSchemes<\/key>[\s\S]*?<string>prometheus-entity<\/string>/.test(iosInfo),
    "generated iOS Info.plist must preserve the registered deep-link scheme",
  );
  pass(
    "configuration",
    "one buildable config owns desktop/mobile routes, stable Rust, synchronized iOS versions, and sanitized native child environments",
  );

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
  const platformHooks = readText(`${sourceRoot}/features/platform/hooks.ts`);
  requireValue(
    platformHooks.includes("useGraphStore") && platformHooks.includes("usePlatformStore"),
    "platform hooks must select the canonical graph store and platform orchestration store",
  );
  requireValue(
    !platformHooks.includes("services/platform-service"),
    "platform hooks must not bypass the platform store to call the service",
  );
  pass(
    "layering",
    "components use hooks; hooks select the canonical graph/platform stores; service and native imports remain below the platform store",
  );

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
    "isGraphClearCapabilityDenial",
    'formatError(error) === GRAPH_CLEAR_CAPABILITY_DENIAL',
    '"entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear"',
    "if (!isGraphClearCapabilityDenial(error)) throw error",
    "isGraphRemoveCapabilityDenial",
    'formatError(error) === GRAPH_REMOVE_CAPABILITY_DENIAL',
    '"entity-graph-tauri.graph_remove_entity not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-remove-entity"',
    "if (!isGraphRemoveCapabilityDenial(error)) throw error",
    "KNOWN_TASK_IDS.has(candidate.taskId)",
    'candidate.id === `task-status:${candidate.taskId}`',
    "new Date(candidate.enqueuedAt).toISOString() === candidate.enqueuedAt",
    "new Set(value.map((mutation) => mutation.taskId)).size === value.length",
    'state.patchEntity(ENTITY_TYPES.task, taskId, { status, pendingSync: true })',
  ]) {
    requireValue(service.includes(contract), `offline or boundary contract is missing: ${contract}`);
  }
  const firstQueueParse = service.indexOf(
    "this.queue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));",
  );
  const firstGraphHydration = service.indexOf("this.runtime = startLocalFirstGraph({");
  requireValue(
    firstQueueParse !== -1 && firstGraphHydration !== -1 && firstQueueParse < firstGraphHydration,
    "persisted queue input must be parsed before graph hydration",
  );
  const restoreStart = service.indexOf("async restore(): Promise<PlatformSnapshot>");
  const restoreQueueParse = service.indexOf(
    "const restoredQueue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));",
    restoreStart,
  );
  const restoreHydration = service.indexOf("await this.runtime?.hydrate();", restoreStart);
  requireValue(
    restoreStart !== -1 &&
      restoreQueueParse !== -1 &&
      restoreHydration !== -1 &&
      restoreQueueParse < restoreHydration,
    "manual restore must validate the persisted queue before graph hydration",
  );
  pass(
    "offline-runtime",
    "persisted queue shape and known task identity validation precede SQLite/localStorage graph hydration; durable queue, optimistic patch, and deep-link validation remain present",
  );

  const requiredPlatformFiles = [
    `${APP_ROOT}/src-tauri/gen/android/app/src/main/AndroidManifest.xml`,
    `${APP_ROOT}/src-tauri/gen/android/app/src/main/java/com/prometheusags/entitygraph/universal/MainActivity.kt`,
    `${APP_ROOT}/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.jar`,
    `${APP_ROOT}/src-tauri/gen/apple/project.yml`,
    `${APP_ROOT}/src-tauri/gen/apple/LaunchScreen.storyboard`,
    `${APP_ROOT}/src-tauri/gen/apple/Assets.xcassets/Contents.json`,
    `${APP_ROOT}/src-tauri/gen/apple/prometheus-tauri-universal-example_iOS/Info.plist`,
    `${APP_ROOT}/src-tauri/icons/icon.png`,
  ];
  for (const path of requiredPlatformFiles) {
    requireValue(exists(path), `generated platform artifact is missing: ${path}`);
  }
  pass(
    "platform-shells",
    "desktop icon, tracked Android wrapper and iOS resources, Tauri-created web assets declaration, and generated application shells",
  );

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
  const currentReceiptPath =
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/task-6-current-mobile-evidence.json";
  requireValue(exists(currentReceiptPath), "task-6 current-source mobile evidence receipt is missing");
  const currentReceipt = readJson(currentReceiptPath);
  requireValue(currentReceipt.status === "pass", "task-6 current-source mobile evidence must pass");
  requireValue(
    currentReceipt.sourceBase === "0de1e81f63dace24142bc139c0da6584a698c74d",
    "task-6 current-source base drifted",
  );
  const currentSourceFiles = [
    ...CURRENT_SOURCE_FILES,
    ...walk(resolve(root, `${APP_ROOT}/src-tauri/gen/apple/Assets.xcassets`))
      .map((path) => relative(root, path))
      .sort(),
  ];
  const currentSourceBundleSha256 = createHash("sha256");
  for (const path of currentSourceFiles) {
    currentSourceBundleSha256.update(path).update("\0").update(readSourceBytes(path)).update("\0");
  }
  requireValue(
    currentReceipt.currentSourceBundleSha256 === currentSourceBundleSha256.digest("hex"),
    "task-6 current-source receipt does not match the reviewed runtime and mobile generators",
  );
  requireValue(currentReceipt.macos?.build === "pass", "current-source macOS bundle evidence is incomplete");
  requireValue(currentReceipt.android?.runtime === "pass", "current-source Android runtime evidence is incomplete");
  requireValue(
    currentReceipt.android?.capabilityDenial === "pass-exact-error-shape",
    "current-source Android capability denial evidence is incomplete",
  );
  requireValue(
    currentReceipt.android?.observedDenials?.clear === CLEAR_DENIAL,
    "current-source Android clear-denial evidence does not match the exact native error",
  );
  requireValue(
    currentReceipt.android?.observedDenials?.remove === REMOVE_DENIAL,
    "current-source Android remove-denial evidence does not match the exact native error",
  );
  requireValue(currentReceipt.ios?.runtime === "pass", "current-source iOS runtime evidence is incomplete");
  for (const artifact of currentReceipt.retainedArtifacts ?? []) {
    requireValue(exists(artifact.path), `current-source retained artifact is missing: ${artifact.path}`);
    requireValue(
      sha256(artifact.path) === artifact.sha256,
      `current-source retained artifact hash drifted: ${artifact.path}`,
    );
  }
  pass(
    "platform-evidence",
    "18 historical task-5 artifacts plus 5 current-source task-6 Android/iOS artifacts are hash-verified; current macOS, Android, and iOS build hashes are retained",
  );

  return {
    schemaVersion: 1,
    change: "v3-tauri-universal-example",
    status: "pass",
    evidenceKind: "source-workspace-contract",
    countsAsPlatformBuildEvidence: false,
    separatePlatformEvidence: receiptPath,
    currentSourcePlatformEvidence: currentReceiptPath,
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
