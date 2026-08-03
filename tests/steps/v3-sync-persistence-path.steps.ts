import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

const root = process.cwd();
const coreRequire = createRequire(join(root, "packages/entity-graph-core/package.json"));
const syncRequire = createRequire(join(root, "packages/entity-graph-sync/package.json"));
let coreReceipt = "";
let syncReceipt = "";
let consumerReceipt = "";

setDefaultTimeout(120_000);

function runPnpm(args: string[]): string {
  return execFileSync("pnpm", args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
}

function ensureReceipts(): void {
  if (coreReceipt && syncReceipt && consumerReceipt) return;
  coreReceipt = runPnpm([
    "--filter",
    "@prometheus-ags/entity-graph-core",
    "exec",
    "vitest",
    "run",
    "src/adapters/pglite-persistence.integration.test.ts",
    "--reporter",
    "verbose",
  ]);
  syncReceipt = runPnpm([
    "--filter",
    "@prometheus-ags/entity-graph-sync",
    "exec",
    "vitest",
    "run",
    "src/providers/loro-convergence.test.ts",
    "src/providers/loro-websocket-channel.test.ts",
    "src/providers/loro-websocket.integration.test.ts",
    "--reporter",
    "verbose",
  ]);
  consumerReceipt = runPnpm(["run", "verify:sync-persistence"]);
}

Given("the mandatory PGlite and Loro release dependencies are installed", function () {
  const corePackage = JSON.parse(
    readFileSync(join(root, "packages/entity-graph-core/package.json"), "utf8"),
  );
  const syncPackage = JSON.parse(
    readFileSync(join(root, "packages/entity-graph-sync/package.json"), "utf8"),
  );
  assert.equal(corePackage.devDependencies["@electric-sql/pglite"], "0.5.4");
  assert.match(syncPackage.devDependencies["loro-crdt"], /^\^?1\.13\.9$/);
  assert.equal(syncPackage.devDependencies.ws, "8.21.1");
  assert.ok(coreRequire.resolve("@electric-sql/pglite"));
  assert.ok(syncRequire.resolve("loro-crdt"));
});

When("the mandatory local-first integration receipts are executed", function () {
  ensureReceipts();
});

Then(
  "a real file-backed PGlite database restores the canonical graph after close and reopen",
  function () {
    assert.match(coreReceipt, /mandatory real PGlite persistence/);
    assert.match(coreReceipt, /after close\/reopen/);
    assert.match(coreReceipt, /1 passed/);
  },
);

Then("the restored list contains entity IDs rather than copied entity data", function () {
  const source = readFileSync(
    join(
      root,
      "packages/entity-graph-core/src/adapters/pglite-persistence.integration.test.ts",
    ),
    "utf8",
  );
  assert.match(source, /\.ids\)\.toEqual\(\["task-1"\]\)/);
  assert.doesNotMatch(source, /setListResult\([^\n]+\[\s*\{/);
});

Then("different-field offline writes survive in both delivery orders", function () {
  assert.match(syncReceipt, /preserves different-field offline writes with fifo delivery/);
  assert.match(syncReceipt, /preserves different-field offline writes with reverse delivery/);
});

Then("same-field conflicts converge using deterministic peer identity", function () {
  assert.match(syncReceipt, /resolves same-field conflicts by deterministic peer identity with fifo delivery/);
  assert.match(syncReceipt, /resolves same-field conflicts by deterministic peer identity with reverse delivery/);
});

Then("inbound peer projections are not echoed as new local writes", function () {
  const convergence = readFileSync(
    join(root, "packages/entity-graph-sync/src/providers/loro-convergence.test.ts"),
    "utf8",
  );
  const bridge = readFileSync(
    join(root, "packages/entity-graph-sync/src/bridge.ts"),
    "utf8",
  );
  assert.match(convergence, /inbound graph projection must not be republished/);
  assert.match(bridge, /applyingPeerKeys/);
});

Then("disconnected WebSocket writes are flushed after reconnect", function () {
  assert.match(syncReceipt, /retains an offline write across an unexpected close and reconnect/);
});

Then("reconnect requests the peer snapshots missed during the outage", function () {
  assert.match(syncReceipt, /answers a peer sync request with every latest local snapshot/);
});

Then(
  "a real WebSocket relay recovers concurrent writes after an unexpected termination",
  function () {
    assert.match(syncReceipt, /real WebSocket relay reconnect integration/);
    assert.match(syncReceipt, /after termination, offline writes, and resynchronization/);
  },
);

Then("a packed ESM and CommonJS consumer resolves the new sync surface", function () {
  assert.match(consumerReceipt, /packed Node ESM convergence consumer passed/);
  assert.match(consumerReceipt, /packed Node CommonJS consumer passed/);
});

Then("the packed ESM consumer performs cross-client convergence", function () {
  assert.match(consumerReceipt, /packed Node ESM convergence consumer passed/);
});

Then("the packed NodeNext consumer accepts the new public types", function () {
  assert.match(
    consumerReceipt,
    /PASS: packed core\/sync ESM, CommonJS, NodeNext, and loopback convergence consumer/,
  );
});

Then(
  "the offline sync capability references implemented integration and packed evidence",
  function () {
    const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
    const capability = coverage.capabilities.find(
      ({ id }: { id: string }) => id === "graph.offline-persistence-sync",
    );
    assert.ok(capability);
    assert.deepEqual(
      capability.releaseEvidence
        .filter(({ status }: { status: string }) => status === "implemented")
        .map(({ kind, command }: { kind: string; command: string }) => [kind, command]),
      [
        ["integration", "pnpm run test:sync-persistence"],
        ["packed-consumer", "pnpm run verify:sync-persistence"],
      ],
    );
    assert.ok(
      coverage.qualityGates.some(
        ({ id, status }: { id: string; status: string }) =>
          id === "release.sync.persistence-convergence" && status === "implemented",
      ),
    );
  },
);

Then("the sync runtime export ledger matches its published package surface", function () {
  const ledger = JSON.parse(
    readFileSync(
      join(root, "prometheus-entity-skills/_shared/references/sync-library-exports.json"),
      "utf8",
    ),
  );
  assert.deepEqual(ledger, [...ledger].sort());
  for (const name of [
    "createLoroLoopbackNetwork",
    "createLoroProvider",
    "createSyncProviderRegistry",
    "createWebSocketLoroChannel",
    "startSyncBridge",
  ]) {
    assert.ok(ledger.includes(name), name);
  }
  assert.match(
    readFileSync(join(root, "packages/entity-graph-sync/package.json"), "utf8"),
    /verify-skills-exports\.mjs --sync/,
  );
});

Then("skills and release documentation teach the certified boundary", function () {
  for (const path of [
    "README.md",
    "RELEASING.md",
    "examples/README.md",
    "packages/entity-graph-sync/README.md",
    "prometheus-entity-skills/SKILL.md",
    "prometheus-entity-skills/SKILLS.md",
    "prometheus-entity-skills/_shared/references/library-api.md",
    "prometheus-entity-skills/_shared/references/sync-persistence-path.md",
    "prometheus-entity-skills/entity-graph-realtime/skills/entity-realtime-local-first/SKILL.md",
  ]) {
    const contents = readFileSync(join(root, path), "utf8");
    assert.match(contents, /sync|Loro|PGlite/i, path);
  }
});

Then("overall example and visual coverage remains in progress", function () {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  assert.equal(coverage.status, "in-progress");
  assert.equal(coverage.documentationSite.status, "planned");
  assert.ok(
    coverage.showcases.every(
      ({ status, runtimeEvidence, visualEvidence }: {
        status: string;
        runtimeEvidence: { status: string };
        visualEvidence: { status: string };
      }) =>
        ["planned", "implemented"].includes(status) &&
        runtimeEvidence.status === status &&
        visualEvidence.status === status,
    ),
  );
});

Then("no mandatory sync scenario is skipped", function () {
  assert.doesNotMatch(`${coreReceipt}\n${syncReceipt}`, /skipped|todo/i);
  for (const path of [
    "packages/entity-graph-sync/src/providers/loro-convergence.test.ts",
    "packages/entity-graph-sync/src/providers/loro-websocket-channel.test.ts",
    "packages/entity-graph-sync/src/providers/loro-websocket.integration.test.ts",
    "packages/entity-graph-core/src/adapters/pglite-persistence.integration.test.ts",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(source, /\.skip\(|\.todo\(|loroAvailable|skipping loro/i, path);
  }
});

Then("headless sync evidence does not claim rendered visual certification", function () {
  const gate = readFileSync(
    join(
      root,
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-sync-persistence-path/dependency-gate.md",
    ),
    "utf8",
  );
  assert.match(gate, /Screenshots would be decorative/);
  assert.match(gate, /Later Vite, Next\.js, Flutter, Tauri, agentic A2UI, and Docusaurus/);
});

Then(
  "the sibling gateway contract is manual-only and never part of the mandatory local gate",
  function () {
    const workflow = readFileSync(
      join(root, ".github/workflows/entity-sync-contract.yml"),
      "utf8",
    );
    const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.match(workflow, /^on:\n {2}workflow_dispatch:/m);
    assert.doesNotMatch(workflow, /^ {2}(push|pull_request):/m);
    assert.match(workflow, /repository: Prometheus-AGS\/prometheus-entity-sync/);
    assert.doesNotMatch(rootPackage.scripts.test, /entity-sync-contract|prometheus-entity-sync/);
  },
);

Then("the sibling contract installs a packed current core without a local link", function () {
  const workflow = readFileSync(
    join(root, ".github/workflows/entity-sync-contract.yml"),
    "utf8",
  );
  assert.match(
    workflow,
    /@prometheus-ags\/entity-graph-core pack --pack-destination/,
  );
  assert.match(
    workflow,
    /@prometheus-ags\/entity-sync-pglite add --save-dev "\$CORE_TARBALL"/,
  );
  assert.match(workflow, /pnpm --dir entity-sync run typecheck/);
  assert.doesNotMatch(workflow, /link:|\/Users\//);
});
