import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");
const TCK_COMMIT = "5996b79f9cefa6fc390980e383e358a66fb9e49e";
const evidenceRoot = ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent";

test("the official SDK and immutable upstream TCK are exact release inputs", async () => {
  const manifest = JSON.parse(await read("packages/entity-graph-a2a/package.json"));
  assert.equal(manifest.dependencies["@a2a-js/sdk"], "1.0.1");
  const runner = await read("scripts/run-a2a-tck.mjs");
  assert.match(runner, new RegExp(TCK_COMMIT));
  assert.match(runner, /--transport[\s\S]*jsonrpc/);
  assert.match(runner, /unexplainedSkips/);
  assert.match(runner, /JSONRPC_SKIP_RATIONALES/);
  assert.doesNotMatch(runner, /--ignore|--allow-fail|--no-strict/);
});

test("the BDD contract covers official lifecycle, policy, packaging, and truthful exclusions", async () => {
  const feature = await read("tests/features/release/v3-a2a-conformance-agent.feature");
  for (const phrase of [
    "AgentCard discovery advertises only implemented A2A v1 capabilities",
    "ordered task, working, artifact, and terminal SSE envelopes",
    "forbidden batch field rolls back every mutation",
    "deterministic CI emits repeatable A2UI v0.9.1 metadata",
    "the opt-in external executor uses injected discovery and transport with local lifecycle IDs",
    "packed ESM, CommonJS, NodeNext, and Node16 consumers",
    "immutable commit, binding, reports, and explained exclusions",
    "without decorative screenshots",
  ]) assert.match(feature, new RegExp(phrase));
});

test("the packed verifier exercises both module systems, declarations, and the isolated migration seam", async () => {
  const verifier = await read("scripts/verify-a2a-conformance.mjs");
  const declarationFix = await read("scripts/fix-a2a-cjs-declarations.mjs");
  assert.match(verifier, /pack-destination/);
  assert.match(verifier, /validatePackedManifestData/);
  assert.match(verifier, /@a2a-js\/sdk.*1\.0\.1/);
  assert.match(verifier, /NodeNext/);
  assert.match(verifier, /Node16/);
  assert.match(verifier, /entity-graph-a2a\/legacy/);
  assert.match(verifier, /createLegacyA2AAdapter/);
  assert.match(verifier, /createExternalA2AExecutor/);
  assert.match(verifier, /packed external JSON-RPC executor passed/);
  assert.doesNotMatch(verifier, /workspace:\*/);
  assert.match(declarationFix, /resolution-mode/);
  assert.match(declarationFix, /import type/);
});

test("TCK fixture routing is test-only and does not leak magic scenario IDs into production", async () => {
  const fixture = await read("scripts/a2a-tck-scenario-executor.mjs");
  assert.match(fixture, /tck-input-required/);
  assert.match(fixture, /tck-artifact-text/);
  assert.match(fixture, /tck-message-response/);
  const production = (
    await Promise.all([
      read("packages/entity-graph-a2a/src/handler.ts"),
      read("packages/entity-graph-a2a/src/server.ts"),
      read("packages/entity-graph-a2a/src/policy.ts"),
    ])
  ).join("\n");
  assert.doesNotMatch(production, /tck-/i);
});

test("the latest upstream receipt has no failure or unexplained selected-binding skip", async () => {
  const path = `${evidenceRoot}/tck/receipt.json`;
  assert.ok(existsSync(join(root, path)), path);
  const receipt = JSON.parse(await read(path));
  assert.equal(receipt.schemaVersion, "2");
  assert.equal(receipt.processExitCode, 0);
  assert.equal(receipt.tck.commit, TCK_COMMIT);
  assert.equal(receipt.binding, "JSONRPC");
  assert.equal(receipt.transportLevels.jsonrpc.MUST.failed, 0);
  assert.equal(receipt.transportLevels.agentCard.MUST.failed, 0);
  assert.deepEqual(receipt.failedApplicableMust, []);
  assert.deepEqual(receipt.unexplainedSkips, []);
  assert.equal(receipt.candidate.revision, receipt.candidateSha);
  assert.equal(typeof receipt.candidate.worktreeDirty, "boolean");
  for (const artifact of Object.values(receipt.candidate.artifacts)) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  }
  assert.ok(receipt.skippedJsonRpc.every(({ status, rationale }) =>
    status === "inapplicable" && typeof rationale === "string" && rationale.length > 20));
  for (const name of ["compatibility.json", "compatibility.html", "tck_report.html", "junitreport.xml"]) {
    assert.match(receipt.artifacts[name].sha256, /^[a-f0-9]{64}$/);
  }
});

test("headless server certification does not fabricate renderer evidence", () => {
  assert.equal(existsSync(join(root, evidenceRoot, "visual-evidence.json")), false);
  assert.equal(existsSync(join(root, evidenceRoot, "screenshots")), false);
});

test("coverage, ledgers, and guides declare the implemented A2A boundary without overclaiming", async () => {
  const coverage = JSON.parse(await read("examples/coverage.json"));
  const gate = coverage.qualityGates.find(({ id }) => id === "release.protocol.a2a-jsonrpc-v1");
  assert.equal(gate.status, "implemented");
  assert.equal(gate.command, "pnpm run verify:a2a-conformance");

  const ledger = JSON.parse(
    await read("prometheus-entity-skills/_shared/references/a2a-library-exports.json"),
  );
  assert.equal(ledger["."].length, 30);
  assert.deepEqual(ledger["./legacy"], ["LegacyA2AAdapter", "createLegacyA2AAdapter"]);

  const docs = (
    await Promise.all([
      read("README.md"),
      read("release/a2a-conformance-agent.md"),
      read("packages/entity-graph-a2a/README.md"),
      read("prometheus-entity-skills/_shared/references/a2a-conformance-agent.md"),
    ])
  ).join("\n");
  assert.match(docs, /Protocol validity never grants application authority\./);
  assert.match(docs, /@prometheus-ags\/entity-graph-a2a\/legacy/);
  assert.match(docs, /REST/);
  assert.match(docs, /gRPC/);
  assert.match(docs, /push notification/i);
  assert.match(docs, /extension signing/i);
});
