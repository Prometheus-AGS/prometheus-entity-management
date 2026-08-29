import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");

test("the package targets exact official A2UI distributions and protocol entry points", async () => {
  const manifest = JSON.parse(await read("packages/a2ui-react/package.json"));
  assert.equal(manifest.dependencies["@a2ui/react"], "0.10.2");
  assert.equal(manifest.dependencies["@a2ui/web_core"], "0.10.5");
  assert.equal(manifest.dependencies["@a2ui/markdown-it"], "0.1.0");
  assert.equal(manifest.dependencies.zod, "3.25.76");
  assert.ok(manifest.exports["./ag-ui"]);
  const sources = await Promise.all([
    read("packages/a2ui-react/src/official/catalog.ts"),
    read("packages/a2ui-react/src/official/runtime.ts"),
    read("packages/a2ui-react/src/react/a2ui-provider.tsx"),
  ]);
  assert.ok(sources.every((source) => /@a2ui\/(react|web_core)\/v0_9/.test(source)));
});

test("official and React layers do not own graph I/O or AG-UI parsing", async () => {
  const source = (
    await Promise.all([
      read("packages/a2ui-react/src/official/catalog.ts"),
      read("packages/a2ui-react/src/official/runtime.ts"),
      read("packages/a2ui-react/src/react/a2ui-provider.tsx"),
    ])
  ).join("\n");
  assert.doesNotMatch(source, /useGraphStore|graphStore|getState\(/);
  assert.doesNotMatch(source, /STATE_SNAPSHOT|STATE_DELTA|MESSAGE_START|JSON\.parse|jsonl/i);
  assert.match(await read("packages/a2ui-react/src/policy/entity-graph-policy.ts"), /GraphStore/);
});

test("the BDD contract covers protocol, policy, packaging, and real visual evidence", async () => {
  const feature = await read("tests/features/release/v3-a2ui-protocol-bridge.feature");
  for (const phrase of [
    "official v0.9.1 processor",
    "destructive actions require out-of-band approval",
    "packed ESM, CommonJS, NodeNext, and Node16 consumers",
    "desktop and mobile screenshots",
    "keyboard activation",
    "accessibility scan",
    "A2UI root and AG-UI compatibility export ledgers",
    "protocol validation separately from application authority",
  ]) assert.match(feature, new RegExp(phrase));
});

test("A2UI docs, skills, coverage, and both runtime entry points stay synchronized", async () => {
  const ledger = JSON.parse(
    await read("prometheus-entity-skills/_shared/references/a2ui-library-exports.json"),
  );
  assert.equal(ledger["."].length, 19);
  assert.equal(ledger["./ag-ui"].length, 9);
  assert.ok(ledger["."].includes("PROMETHEUS_A2UI_RC_PROTOCOL_VERSION"));
  assert.ok(ledger["."].includes("PrometheusA2uiSurface"));
  assert.ok(ledger["."].includes("createEntityGraphA2uiActionPolicy"));
  assert.ok(ledger["./ag-ui"].includes("EntityChat"));
  assert.ok(!ledger["."].includes("EntityChat"));

  const coverage = JSON.parse(await read("examples/coverage.json"));
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.protocol.a2ui-official",
  );
  assert.equal(gate.status, "implemented");
  assert.equal(gate.command, "pnpm run verify:a2ui-bridge");
  for (const capabilityId of ["protocol.a2a-a2ui", "security.tenant-actions-secrets"]) {
    const capability = coverage.capabilities.find(({ id }) => id === capabilityId);
    assert.equal(
      capability.releaseEvidence.find(
        ({ ownerChange }) => ownerChange === "v3-a2ui-protocol-bridge",
      ).status,
      "implemented",
    );
  }

  const docs = (
    await Promise.all([
      read("packages/a2ui-react/README.md"),
      read("release/a2ui-protocol-bridge.md"),
      read("prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md"),
    ])
  ).join("\n");
  assert.match(docs, /Protocol validity never grants application authority/);
  assert.match(docs, /@prometheus-ags\/a2ui-react\/ag-ui/);
  assert.match(docs, /openUrl.*excluded/is);
  assert.match(await read("scripts/verify-skills-exports.mjs"), /--a2ui/);
});

test("the packed verifier uses tarballs and forbids workspace aliases", async () => {
  const verifier = await read("scripts/verify-a2ui-protocol-bridge.mjs");
  const declarationFix = await read("scripts/fix-a2ui-cjs-declarations.mjs");
  assert.match(verifier, /pack-destination/);
  assert.match(verifier, /packed official root separation passed/);
  assert.match(verifier, /packed AG-UI compatibility subpath passed/);
  assert.match(verifier, /NodeNext/);
  assert.match(verifier, /Node16/);
  assert.doesNotMatch(verifier, /workspace:\*/);
  assert.match(declarationFix, /resolution-mode/);
  assert.match(declarationFix, /import type/);
});

test("visual evidence is nonempty, hashed, accessible, and tied to the built artifact", async () => {
  const path = ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/visual-evidence.json";
  assert.ok(existsSync(join(root, path)), path);
  const manifest = JSON.parse(await read(path));
  assert.equal(manifest.protocol, "v0.9.1");
  assert.match(manifest.artifact.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(manifest.keyboard.outcomes, ["executed", "unauthorized-field", "approval-denied"]);
  assert.equal(manifest.accessibility.axe.critical, 0);
  assert.equal(manifest.accessibility.axe.serious, 0);
  for (const image of manifest.screenshots) {
    assert.match(image.sha256, /^[a-f0-9]{64}$/);
    assert.ok((await stat(join(root, ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge", image.path))).size > 1_000);
  }
});
