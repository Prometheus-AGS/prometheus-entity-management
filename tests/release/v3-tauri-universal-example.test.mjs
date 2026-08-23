import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { verifyTauriUniversalExample } from "../../scripts/verify-tauri-universal-example.mjs";

const root = process.cwd();

test("the universal Tauri source contract is complete and honest about platform evidence", () => {
  const report = verifyTauriUniversalExample({ root });
  assert.equal(report.status, "pass");
  assert.equal(report.countsAsPlatformBuildEvidence, false);
  assert.deepEqual(
    report.checks.map(({ id }) => id),
    [
      "workspace",
      "native-host",
      "configuration",
      "capability",
      "layering",
      "offline-runtime",
      "platform-shells",
      "platform-evidence",
    ],
  );
});

test("the verifier rejects an Android-invalid zero application version", () => {
  const path = "examples/tauri-universal/src-tauri/tauri.conf.json";
  const config = JSON.parse(readFileSync(path, "utf8"));
  config.version = "0.0.0";
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, JSON.stringify(config)]]),
      }),
    /must remain buildable at 0\.0\.1/,
  );
});

test("the verifier rejects a mobile build phase that can fall back to nightly", () => {
  const path = "examples/tauri-universal/src-tauri/gen/apple/project.yml";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace("RUSTUP_TOOLCHAIN=stable ", "")]]),
      }),
    /iOS Xcode Rust build must force the stable toolchain/,
  );
});

test("the verifier rejects an Android build phase that inherits registry credentials", () => {
  const path =
    "examples/tauri-universal/src-tauri/gen/android/buildSrc/src/main/java/com/prometheusags/entitygraph/universal/kotlin/BuildTask.kt";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace('environment.remove("NPM_TOKEN")', "")]]),
      }),
    /Android Gradle Rust build must remove inherited NPM_TOKEN/,
  );
});

test("the verifier rejects an iOS build phase that inherits registry credentials", () => {
  const path = "examples/tauri-universal/src-tauri/gen/apple/project.yml";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([
          [path, source.replace("unset CARGO_REGISTRY_TOKEN NPM_TOKEN NODE_AUTH_TOKEN", "")],
        ]),
      }),
    /iOS Xcode Rust build must remove inherited registry credentials/,
  );
});

test("the verifier rejects a checked-in Xcode build phase that inherits registry credentials", () => {
  const path =
    "examples/tauri-universal/src-tauri/gen/apple/prometheus-tauri-universal-example.xcodeproj/project.pbxproj";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([
          [path, source.replace("unset CARGO_REGISTRY_TOKEN NPM_TOKEN NODE_AUTH_TOKEN\\n", "")],
        ]),
      }),
    /checked-in iOS Xcode build phase must remove inherited registry credentials/,
  );
});

test("the verifier rejects native build outputs copied into iOS resources", () => {
  const path = "examples/tauri-universal/src-tauri/gen/apple/project.yml";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace("      - path: Assets.xcassets\n", "      - path: Assets.xcassets\n      - path: Externals\n")]]),
      }),
    /generated iOS project must exclude native build outputs from application resources/,
  );
});

test("the verifier rejects stale generated iOS version metadata", () => {
  const path = "examples/tauri-universal/src-tauri/gen/apple/project.yml";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace("CFBundleShortVersionString: 0.0.1", "CFBundleShortVersionString: 0.0.0")]]),
      }),
    /generated iOS application metadata must remain synchronized at 0\.0\.1/,
  );
});

test("the verifier rejects generated iOS metadata that drops the deep-link scheme", () => {
  const path = "examples/tauri-universal/src-tauri/gen/apple/project.yml";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace("CFBundleURLName: prometheus-entity", "CFBundleURLName: missing")]]),
      }),
    /generated iOS project metadata must preserve the registered deep-link scheme/,
  );
});

test("the verifier rejects a capability that grants destructive clear", () => {
  const path = "examples/tauri-universal/src-tauri/capabilities/universal-main.json";
  const capability = JSON.parse(readFileSync(path, "utf8"));
  capability.permissions.push("entity-graph-tauri:allow-graph-clear");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, JSON.stringify(capability)]]),
      }),
    /must remain withheld: entity-graph-tauri:allow-graph-clear/,
  );
});

test("the verifier rejects a capability that grants destructive removal", () => {
  const path = "examples/tauri-universal/src-tauri/capabilities/universal-main.json";
  const capability = JSON.parse(readFileSync(path, "utf8"));
  capability.permissions.push("entity-graph-tauri:allow-graph-remove-entity");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, JSON.stringify(capability)]]),
      }),
    /must remain withheld: entity-graph-tauri:allow-graph-remove-entity/,
  );
});

test("the verifier rejects direct graph access from a component", () => {
  const path = "examples/tauri-universal/src/features/platform/components/platform-dashboard.tsx";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, `${source}\nvoid useGraphStore;\n`]]),
      }),
    /component boundary violation/,
  );
});

test("the verifier rejects a hook that bypasses stores to import the platform service", () => {
  const path = "examples/tauri-universal/src/features/platform/hooks.ts";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, `${source}\nvoid import("./services/platform-service");\n`]]),
      }),
    /platform hooks must not bypass the platform store to call the service/,
  );
});

test("the verifier rejects graph hydration before persisted queue validation", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  const queueParse = "this.queue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));";
  const withoutFirstParse = source.replace(queueParse, "");
  const hydration = "this.runtime = startLocalFirstGraph({";
  const unsafeOrder = withoutFirstParse.replace(hydration, `${hydration}\n    ${queueParse}`);
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, unsafeOrder]]),
      }),
    /persisted queue input must be parsed before graph hydration/,
  );
});

test("the verifier rejects queue validation that accepts unknown task IDs", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, source.replace("    KNOWN_TASK_IDS.has(candidate.taskId) &&\n", "")]]),
      }),
    /offline or boundary contract is missing: KNOWN_TASK_IDS\.has\(candidate\.taskId\)/,
  );
});

test("the verifier rejects incomplete canonical queue validation", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  const unsafeVariants = [
    [
      'candidate.id === `task-status:${candidate.taskId}` &&',
      /offline or boundary contract is missing: candidate\.id === `task-status:\$\{candidate\.taskId\}`/,
    ],
    [
      "new Date(candidate.enqueuedAt).toISOString() === candidate.enqueuedAt &&",
      /offline or boundary contract is missing: new Date\(candidate\.enqueuedAt\)\.toISOString\(\) === candidate\.enqueuedAt/,
    ],
    [
      "new Set(value.map((mutation) => mutation.taskId)).size === value.length",
      /offline or boundary contract is missing: new Set\(value\.map\(\(mutation\) => mutation\.taskId\)\)\.size === value\.length/,
    ],
  ];

  for (const [contract, expected] of unsafeVariants) {
    const unsafeSource = source.replace(contract, "");
    assert.notEqual(unsafeSource, source);
    assert.throws(
      () =>
        verifyTauriUniversalExample({
          root,
          overrides: new Map([[path, unsafeSource]]),
        }),
      expected,
    );
  }
});

test("the verifier rejects substring-based capability denial classification", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([
          [
            path,
            source.replace(
              "return formatError(error) === GRAPH_CLEAR_CAPABILITY_DENIAL;",
              "return formatError(error).includes(GRAPH_CLEAR_CAPABILITY_DENIAL);",
            ),
          ],
        ]),
      }),
    /offline or boundary contract is missing: formatError\(error\) === GRAPH_CLEAR_CAPABILITY_DENIAL/,
  );
});

test("the verifier rejects manual restore hydration before queue validation", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  const queueParse =
    "const restoredQueue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));";
  const hydration = "await this.runtime?.hydrate();";
  const unsafeOrder = source.replace(
    `${queueParse}\n    ${hydration}`,
    `${hydration}\n    ${queueParse}`,
  );
  assert.notEqual(unsafeOrder, source);
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, unsafeOrder]]),
      }),
    /manual restore must validate the persisted queue before graph hydration/,
  );
});

test("the verifier rejects missing current-source mobile evidence", () => {
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        missingPaths: new Set([
          ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/task-6-current-mobile-evidence.json",
        ]),
      }),
    /task-6 current-source mobile evidence receipt is missing/,
  );
});

test("the verifier rejects current-source evidence after runtime source drift", () => {
  const path = "examples/tauri-universal/src/features/platform/services/platform-service.ts";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, `${source}\n// observed source drift\n`]]),
      }),
    /current-source receipt does not match the reviewed runtime and mobile generators/,
  );
});

test("the verifier rejects current-source evidence without the exact remove denial", () => {
  const path =
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/task-6-current-mobile-evidence.json";
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  receipt.android.observedDenials = {
    clear:
      "entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear",
    remove: "not allowed",
  };
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, JSON.stringify(receipt)]]),
      }),
    /remove-denial evidence does not match the exact native error/,
  );
});

test("the verifier rejects a missing generated mobile shell", () => {
  for (const path of [
    "examples/tauri-universal/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
    "examples/tauri-universal/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.jar",
    "examples/tauri-universal/src-tauri/gen/apple/LaunchScreen.storyboard",
    "examples/tauri-universal/src-tauri/gen/apple/Assets.xcassets/Contents.json",
  ]) {
    assert.throws(
      () =>
        verifyTauriUniversalExample({
          root,
          missingPaths: new Set([path]),
        }),
      new RegExp(`generated platform artifact is missing: ${path.replaceAll(".", "\\.")}`),
    );
  }
});
