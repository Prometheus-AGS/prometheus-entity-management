import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const ledgerPath = join(
  root,
  "prometheus-entity-skills/_shared/references/tauri-library-exports.json",
);
const contractScript = join(root, "scripts/tauri-public-api-contract.mjs");
const deviceEvidencePath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-mobile-plugin/device/device-evidence.json",
);

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("the Tauri runtime and declaration surface has a fail-closed skill ledger", async () => {
  assert.equal(existsSync(ledgerPath), true, "Tauri export ledger is missing");
  assert.equal(existsSync(contractScript), true, "Tauri export verifier is missing");

  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  assert.equal(ledger.package, "@prometheus-ags/entity-graph-tauri");
  assert.deepEqual(ledger.generatedFrom, ["dist/index.mjs", "dist/index.d.ts"]);
  for (const name of ["platformPing", "generatedCommands", "generatedEvents", "PLUGIN_NAME"]) {
    assert.ok(ledger.runtimeExports.includes(name), `missing runtime export ${name}`);
  }
  for (const name of ["PlatformPing", "RustPlatformPing", "GraphCommands"]) {
    assert.ok(ledger.declarationExports.includes(name), `missing declaration export ${name}`);
  }

  const { verifyTauriLedger } = await import(`${contractScript}?test=${Date.now()}`);
  const directory = mkdtempSync(join(tmpdir(), "prometheus-tauri-ledger-"));
  try {
    const stalePath = join(directory, "tauri-library-exports.json");
    ledger.runtimeExports.pop();
    writeFileSync(stalePath, `${JSON.stringify(ledger, null, 2)}\n`);
    await assert.rejects(() => verifyTauriLedger(stalePath), /ledger is stale/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("coverage records implemented desktop, packed, security, and mobile proof", () => {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const gate = coverage.qualityGates.find(({ id }) => id === "release.platform.tauri-plugin");
  assert.equal(gate.status, "implemented");
  assert.equal(gate.command, "pnpm run verify:tauri-plugin");
  assert.ok(gate.policies.includes("prometheus-entity-skills/_shared/references/tauri-library-exports.json"));

  const platform = coverage.capabilities.find(({ id }) => id === "platform.tauri");
  for (const [kind, status] of [
    ["desktop", "implemented"],
    ["packed-consumer", "implemented"],
    ["mobile", "implemented"],
  ]) {
    assert.ok(
      platform.releaseEvidence.some(
        (entry) => entry.kind === kind && entry.status === status,
      ),
      `missing ${status} ${kind} evidence`,
    );
  }

  const security = coverage.capabilities.find(({ id }) => id === "security.tenant-actions-secrets");
  assert.ok(
    security.releaseEvidence.some(
      (entry) =>
        entry.ownerChange === "v3-tauri-mobile-plugin" &&
        entry.kind === "security" &&
        entry.status === "implemented",
    ),
  );
});

test("mobile receipts prove both native bridges, capability denial, and artifact integrity", () => {
  assert.equal(existsSync(deviceEvidencePath), true, "mobile device evidence manifest is missing");
  const evidence = JSON.parse(readFileSync(deviceEvidencePath, "utf8"));
  assert.equal(evidence.command, "plugin:entity-graph-tauri|graph_platform_ping");

  const expectedPlatforms = {
    android: { targetKind: "physical-device", platform: "android" },
    ios: { targetKind: "simulator", platform: "ios" },
  };
  for (const [name, expected] of Object.entries(expectedPlatforms)) {
    const platform = evidence.platforms[name];
    assert.equal(platform.targetKind, expected.targetKind);
    assert.deepEqual(platform.success.response, {
      plugin: "entity-graph-tauri",
      platform: expected.platform,
    });
    assert.match(platform.denial.error, /graph_platform_ping not allowed/);
    assert.match(platform.denial.error, /entity-graph-tauri:default/);

    for (const receipt of [platform.success, platform.denial]) {
      for (const artifact of receipt.artifacts) {
        const absolutePath = join(root, artifact.path);
        assert.equal(existsSync(absolutePath), true, `missing evidence artifact ${artifact.path}`);
        assert.equal(sha256(absolutePath), artifact.sha256, `stale hash for ${artifact.path}`);
      }
    }
  }
});

test("package and root scripts enforce Tauri skill synchronization", () => {
  const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const packageManifest = JSON.parse(
    readFileSync(join(root, "packages/entity-graph-tauri/package.json"), "utf8"),
  );
  assert.match(rootManifest.scripts["refresh:exports"], /entity-graph-tauri/);
  assert.match(rootManifest.scripts["verify:skills"], /entity-graph-tauri/);
  assert.match(packageManifest.scripts["refresh:exports"], /tauri-public-api-contract\.mjs --write/);
  assert.match(packageManifest.scripts["verify:skills"], /tauri-public-api-contract\.mjs/);
});

test("the npm package boundary excludes generated Android and iOS build state", () => {
  const packageManifest = JSON.parse(
    readFileSync(join(root, "packages/entity-graph-tauri/package.json"), "utf8"),
  );
  assert.ok(packageManifest.files.includes("rust-plugin/android/src"));
  assert.ok(packageManifest.files.includes("rust-plugin/ios/Sources"));
  assert.equal(packageManifest.files.includes("rust-plugin/android"), false);
  assert.equal(packageManifest.files.includes("rust-plugin/ios"), false);
});

test("agent and release guides state least privilege and honest persistence limits", () => {
  for (const path of [
    "packages/entity-graph-tauri/README.md",
    "release/tauri-mobile-plugin.md",
    "prometheus-entity-skills/_shared/references/tauri-mobile-plugin.md",
  ]) {
    const guide = readFileSync(join(root, path), "utf8");
    assert.match(guide, /entity-graph-tauri:default/);
    assert.match(guide, /allow-graph-upsert-entity/);
    assert.match(guide, /in-memory/i);
    assert.match(guide, /createTauriSqlPersistenceAdapter/);
    assert.match(guide, /Android/);
    assert.match(guide, /iOS/);
  }

  const skill = readFileSync(join(root, "prometheus-entity-skills/SKILL.md"), "utf8");
  const catalog = readFileSync(join(root, "prometheus-entity-skills/SKILLS.md"), "utf8");
  const skillFrontmatter = skill.split("---")[1];
  assert.match(skillFrontmatter, /Tauri/);
  assert.match(skill, /tauri-mobile-plugin\.md/);
  assert.match(catalog, /tauri-library-exports\.json/);
  assert.match(catalog, /tauri-mobile-plugin\.md/);

  const commandSource = readFileSync(
    join(root, "packages/entity-graph-tauri/src/commands.ts"),
    "utf8",
  );
  assert.match(commandSource, /native in-memory mirror/i);
  assert.doesNotMatch(commandSource, /snapshot to the configured SQLite database/i);

  const packageReadme = readFileSync(
    join(root, "packages/entity-graph-tauri/README.md"),
    "utf8",
  );
  assert.match(packageReadme, /generated command and event helpers/);
  assert.doesNotMatch(packageReadme, /raw generated maps/);
});

test("the certification fixture is a runnable mobile host that uses the generated command binding", () => {
  const fixtureRoot = join(root, "tests/fixtures/tauri-plugin-host");
  const requiredFiles = [
    "src/main.rs",
    "frontend/main.ts",
    "capabilities/mobile-allowed.json",
    "capabilities/mobile-denied.json",
    "tauri.mobile-denied.conf.json",
  ];
  for (const path of requiredFiles) {
    assert.equal(existsSync(join(fixtureRoot, path)), true, `missing runnable host file: ${path}`);
  }

  const cargoManifest = readFileSync(join(fixtureRoot, "Cargo.toml"), "utf8");
  assert.match(cargoManifest, /crate-type\s*=\s*\[[^\]]*"staticlib"[^\]]*"cdylib"[^\]]*"rlib"/s);

  const rustHost = readFileSync(join(fixtureRoot, "src/lib.rs"), "utf8");
  assert.match(rustHost, /#\[cfg_attr\(mobile, tauri::mobile_entry_point\)\]/);
  assert.match(rustHost, /\.plugin\(entity_graph_tauri::init\(\)\)/);

  const frontend = readFileSync(join(fixtureRoot, "frontend/main.ts"), "utf8");
  assert.match(frontend, /generated-bindings/);
  assert.match(frontend, /commands\.graphPlatformPing\(\)/);

  const config = JSON.parse(readFileSync(join(fixtureRoot, "tauri.conf.json"), "utf8"));
  assert.notEqual(config.version, "0.0.0");
  assert.ok(config.app.security.capabilities.includes("mobile-allowed"));

  const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(rootManifest.scripts["build:tauri-host"], /frontend\/main\.ts/);
});

test("the generated Tauri host bundle is excluded from authored-source lint", () => {
  const eslintConfig = readFileSync(join(root, "eslint.config.mjs"), "utf8");
  assert.match(
    eslintConfig,
    /tests\/fixtures\/tauri-plugin-host\/fixtures\/contract\.js/,
    "esbuild output must not be linted as authored source",
  );
});

test("the workspace pins the current Tauri CLI for a reproducible mobile lane", () => {
  const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(rootManifest.devDependencies["@tauri-apps/cli"], "2.11.4");

  const fixtureManifestPath = join(root, "tests/fixtures/tauri-plugin-host/package.json");
  assert.equal(existsSync(fixtureManifestPath), true, "mobile host pnpm runner is missing");
  const fixtureManifest = JSON.parse(readFileSync(fixtureManifestPath, "utf8"));
  assert.match(fixtureManifest.scripts.tauri, /node_modules\/\.bin\/tauri/);
});

test("the mobile certification host pins the known-good stable Rust toolchain", () => {
  const toolchainPath = join(
    root,
    "tests/fixtures/tauri-plugin-host/rust-toolchain.toml",
  );
  assert.equal(existsSync(toolchainPath), true, "mobile host Rust toolchain pin is missing");

  const toolchain = readFileSync(toolchainPath, "utf8");
  assert.match(toolchain, /channel\s*=\s*"stable"/);
  assert.match(toolchain, /profile\s*=\s*"minimal"/);
});

test("the iOS Swift product matches the Cargo package name used by Tauri's linker", () => {
  const cargoManifest = readFileSync(
    join(root, "packages/entity-graph-tauri/rust-plugin/Cargo.toml"),
    "utf8",
  );
  const cargoName = cargoManifest.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  assert.equal(cargoName, "entity-graph-tauri");

  const swiftPackage = readFileSync(
    join(root, "packages/entity-graph-tauri/rust-plugin/ios/Package.swift"),
    "utf8",
  );
  assert.match(swiftPackage, /\.library\(\s*name:\s*"entity-graph-tauri"/s);
  assert.match(swiftPackage, /targets:\s*\["entity-graph-tauri"\]/);
});
