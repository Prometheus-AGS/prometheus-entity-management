import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("mandatory PGlite, Loro, and real relay test dependencies are pinned", async () => {
  const core = JSON.parse(await source("packages/entity-graph-core/package.json"));
  const sync = JSON.parse(await source("packages/entity-graph-sync/package.json"));
  assert.equal(core.devDependencies["@electric-sql/pglite"], "0.5.4");
  assert.equal(sync.devDependencies["loro-crdt"], "1.13.9");
  assert.equal(sync.peerDependencies["loro-crdt"], ">=1.13.9 <2");
  assert.equal(sync.devDependencies.ws, "8.21.1");
  assert.equal(sync.devDependencies["@types/ws"], "8.18.1");
  assert.equal(
    sync.scripts["test:websocket-integration"],
    "vitest run src/providers/loro-websocket.integration.test.ts",
  );
});

test("the real relay lane terminates a socket and requires canonical convergence", async () => {
  const integration = await source(
    "packages/entity-graph-sync/src/providers/loro-websocket.integration.test.ts",
  );
  assert.match(integration, /new WebSocketServer\(\{ port: 0 \}\)/);
  assert.match(integration, /serverConnections\[0\]\.terminate\(\)/);
  assert.match(integration, /client A to enter reconnecting state/);
  assert.match(integration, /both canonical graph stores to converge/);
  assert.match(integration, /expect\(errors\)\.toEqual\(\[\]\)/);
});

test("mandatory receipts contain no conditional skip or todo path", async () => {
  for (const path of [
    "packages/entity-graph-core/src/adapters/pglite-persistence.integration.test.ts",
    "packages/entity-graph-sync/src/providers/loro-convergence.test.ts",
    "packages/entity-graph-sync/src/providers/loro-websocket-channel.test.ts",
    "packages/entity-graph-sync/src/providers/loro-websocket.integration.test.ts",
  ]) {
    const contents = await source(path);
    assert.doesNotMatch(contents, /\.skip\(|\.todo\(|runIf\(|skipIf\(|process\.env/, path);
  }
});

test("the packed verifier exercises runtime and type consumers from tarballs", async () => {
  const verifier = await source("scripts/verify-sync-persistence.mjs");
  assert.match(verifier, /pack-destination/);
  assert.match(verifier, /validatePackedManifestData/);
  assert.match(verifier, /packed Node ESM convergence consumer passed/);
  assert.match(verifier, /packed Node CommonJS consumer passed/);
  assert.match(verifier, /typescriptNodeNext = "pass"/);
  assert.doesNotMatch(verifier, /workspace:\*/);
});

test("the BDD contract names durability, convergence, relay recovery, and tarball proof", async () => {
  const feature = await source("tests/features/release/v3-sync-persistence-path.feature");
  assert.match(feature, /real file-backed PGlite/);
  assert.match(feature, /same-field conflicts converge/);
  assert.match(feature, /real WebSocket relay/);
  assert.match(feature, /packed ESM and CommonJS consumer/);
  assert.match(feature, /no mandatory sync scenario is skipped/);
  assert.match(feature, /sibling gateway remains explicit opt-in contract evidence/);
});

test("the external gateway contract is manual-only and consumes a packed current core", async () => {
  const workflow = await source(".github/workflows/entity-sync-contract.yml");
  assert.match(workflow, /^on:\n {2}workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^ {2}(push|pull_request):/m);
  assert.match(workflow, /repository: Prometheus-AGS\/prometheus-entity-sync/);
  assert.match(workflow, /@prometheus-ags\/entity-graph-core pack --pack-destination/);
  assert.match(
    workflow,
    /@prometheus-ags\/entity-sync-pglite add --save-dev "\$CORE_TARBALL"/,
  );
  assert.match(workflow, /pnpm --dir entity-sync run typecheck/);
  assert.doesNotMatch(workflow, /link:|\/Users\//);
});

test("coverage promotes only certified npm sync receipts", async () => {
  const coverage = JSON.parse(await source("examples/coverage.json"));
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.sync.persistence-convergence",
  );
  assert.equal(gate?.status, "implemented");
  assert.equal(gate?.command, "pnpm run test:sync-persistence");

  const capability = coverage.capabilities.find(
    ({ id }) => id === "graph.offline-persistence-sync",
  );
  assert.deepEqual(
    capability.releaseEvidence.map(({ kind, status, command }) => ({ kind, status, command })),
    [
      { kind: "integration", status: "implemented", command: "pnpm run test:sync-persistence" },
      { kind: "packed-consumer", status: "implemented", command: "pnpm run verify:sync-persistence" },
      { kind: "browser", status: "implemented", command: "pnpm run verify:vite-react19" },
      { kind: "mobile", status: "implemented", command: "pnpm run verify:flutter-riverpod-a2ui" },
      { kind: "platform", status: "implemented", command: "pnpm run verify:tauri-universal" },
    ],
  );
  assert.equal(coverage.status, "in-progress");
  assert.equal(coverage.documentationSite.status, "planned");
  assert.ok(
    coverage.showcases.every(
      ({ status, runtimeEvidence, visualEvidence }) =>
        ["planned", "implemented"].includes(status) &&
        runtimeEvidence.status === status &&
        visualEvidence.status === status,
    ),
  );
});

test("sync runtime exports and skills have a dedicated drift gate", async () => {
  const ledger = JSON.parse(
    await source("prometheus-entity-skills/_shared/references/sync-library-exports.json"),
  );
  assert.deepEqual(ledger, [...ledger].sort());
  assert.deepEqual(ledger, [
    "__resetSyncRegistry",
    "applyPeerChanges",
    "createLoroLoopbackNetwork",
    "createLoroProvider",
    "createSyncProviderRegistry",
    "createWebSocketLoroChannel",
    "createYjsProvider",
    "decodeLoroWebSocketMessage",
    "encodeLoroWebSocketMessage",
    "getAllSyncProviders",
    "getDefaultSyncProviderRegistry",
    "getRegisteredSyncTypes",
    "getSyncProvider",
    "getTypesForProvider",
    "registerSyncProvider",
    "startSyncBridge",
  ]);
  const manifest = JSON.parse(await source("packages/entity-graph-sync/package.json"));
  assert.match(manifest.scripts["verify:skills"], /--sync$/);
  const registry = await source("scripts/skills-package-registry.mjs");
  assert.match(registry, /id: "sync"/);
  assert.match(registry, /ledger: "sync-library-exports\.json"/);
});

test("documentation and skills teach the certified scope and exclusions", async () => {
  for (const path of [
    "README.md",
    "RELEASING.md",
    "examples/README.md",
    "packages/entity-graph-sync/README.md",
    "prometheus-entity-skills/_shared/references/sync-persistence-path.md",
    "prometheus-entity-skills/entity-graph-realtime/skills/entity-realtime-local-first/SKILL.md",
  ]) {
    const contents = await source(path);
    assert.match(contents, /PGlite/i, path);
    assert.match(contents, /Loro/i, path);
  }
  const syncReadme = await source("packages/entity-graph-sync/README.md");
  assert.match(syncReadme, /inbound echo/i);
  assert.match(syncReadme, /same-field/i);
  assert.match(syncReadme, /Vite, Next\.js, Flutter, Tauri, A2UI, Docusaurus/);
  assert.doesNotMatch(syncReadme, /micro-benchmark|~0\.08ms|~2kb/);
});
