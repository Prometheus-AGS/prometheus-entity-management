import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

const root = process.cwd();
const evidenceRoot = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent",
);
const TCK_COMMIT = "5996b79f9cefa6fc390980e383e358a66fb9e49e";
let testReceipt = "";
let packedReceipt = "";
let tckReceipt = "";
let coverage: Record<string, unknown> = {};

setDefaultTimeout(300_000);

function runPnpm(args: string[]): string {
  return execFileSync("pnpm", args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 300_000,
  });
}

function receipt() {
  const path = join(evidenceRoot, "tck/receipt.json");
  assert.ok(existsSync(path), "the official TCK receipt must exist");
  return JSON.parse(readFileSync(path, "utf8"));
}

function ensureReceipts(): void {
  if (testReceipt && packedReceipt && tckReceipt) return;
  testReceipt = runPnpm(["run", "test:a2a-conformance"]);
  packedReceipt = runPnpm(["run", "verify:a2a-conformance"]);
  tckReceipt = runPnpm(["run", "test:a2a-tck"]);
}

Given("the exact official A2A SDK and TCK revisions are pinned", function () {
  const manifest = JSON.parse(
    readFileSync(join(root, "packages/entity-graph-a2a/package.json"), "utf8"),
  );
  assert.equal(manifest.dependencies["@a2a-js/sdk"], "1.0.1");
  const runner = readFileSync(join(root, "scripts/run-a2a-tck.mjs"), "utf8");
  assert.match(runner, new RegExp(TCK_COMMIT));
});

When("the A2A conformance receipts are executed", function () {
  ensureReceipts();
});

When("the declared A2A documentation surface is inspected", function () {
  coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
});

Then("AgentCard discovery advertises only implemented A2A v1 capabilities", function () {
  assert.match(testReceipt, /discovers an A2A v1 card that advertises only implemented capabilities/);
});

Then("SendMessage, GetTask, ListTasks, history, and terminal guards pass", function () {
  assert.match(testReceipt, /supports SendMessage, GetTask, ListTasks, history limits, and terminal guards/);
});

Then("malformed, unsupported, and media-type failures use official JSON-RPC errors", function () {
  assert.match(testReceipt, /uses official JSON-RPC errors for malformed and unknown calls/);
  assert.match(testReceipt, /rejects absent versions, wrong media types, and unknown paths/);
});

Then("ordered task, working, artifact, and terminal SSE envelopes pass", function () {
  assert.match(testReceipt, /streams ordered task, working, artifact, and terminal envelopes over SSE/);
});

Then("a working task can be canceled and observed by subscribers", function () {
  assert.match(testReceipt, /cancels a working task and exposes the terminal update to subscribers/);
});

Then("the pinned official JSON-RPC TCK has zero applicable MUST failures", function () {
  assert.match(tckReceipt, /MUST 59 passed, 0 failed/);
  const data = receipt();
  assert.equal(data.processExitCode, 0);
  assert.deepEqual(data.failedApplicableMust, []);
  assert.deepEqual(data.unexplainedSkips, []);
});

Then("default-denied graph requests leave the canonical graph unchanged", function () {
  assert.match(testReceipt, /fails closed by default and never applies a denied graph request/);
});

Then("a forbidden batch field rolls back every mutation", function () {
  assert.match(testReceipt, /preauthorizes the entire batch so a forbidden field rolls back every mutation/);
});

Then("destructive replacement requires out-of-band approval", function () {
  assert.match(testReceipt, /requires approval for replacement and preserves the original on denial/);
});

Then("authentication and caller scoping hide unauthorized task state", function () {
  assert.match(testReceipt, /returns 401 before dispatch and cannot mutate when authentication fails/);
  assert.match(testReceipt, /makes hidden and nonexistent tasks indistinguishable across caller scopes/);
});

Then(
  "deterministic CI emits repeatable A2UI v0.9.1 metadata without a model credential",
  function () {
    assert.match(testReceipt, /emits repeatable A2UI v0\.9\.1 metadata without a model credential/);
  },
);

Then(
  "the opt-in external executor uses injected discovery and transport with local lifecycle IDs",
  function () {
    assert.match(
      testReceipt,
      /discovers an opt-in external JSON-RPC agent through the injected fetch and remaps its lifecycle/,
    );
    assert.match(packedReceipt, /packed external JSON-RPC executor passed/);
    const report = JSON.parse(
      readFileSync(join(evidenceRoot, "packed-consumer-report.json"), "utf8"),
    );
    assert.equal(report.consumers.externalExecutor, "pass");
  },
);

Then("official enum values drive the deterministic lifecycle", function () {
  assert.match(testReceipt, /uses official enum values in the deterministic lifecycle/);
});

Then("pre-v3 slash methods are available only from the explicit legacy subpath", function () {
  assert.match(testReceipt, /translates retained slash methods only through the explicit legacy adapter/);
  assert.match(packedReceipt, /packed explicit legacy subpath passed/);
});

Then(
  "packed ESM, CommonJS, NodeNext, and Node16 consumers pass without workspace aliases",
  function () {
    assert.match(
      packedReceipt,
      /PASS: packed A2A ESM, CommonJS, NodeNext, Node16, official root, legacy subpath, and external executor consumer/,
    );
  },
);

Then("the packed manifest pins the official SDK and contains the legacy subpath", function () {
  const report = JSON.parse(readFileSync(join(evidenceRoot, "packed-consumer-report.json"), "utf8"));
  assert.equal(report.sdk, "@a2a-js/sdk@1.0.1");
  assert.equal(report.consumers.legacySubpath, "pass");
  assert.equal(report.workspaceAliases, "forbidden");
});

Then("the TCK receipt identifies its immutable commit, binding, reports, and explained exclusions", function () {
  const data = receipt();
  assert.equal(data.schemaVersion, "2");
  assert.equal(data.tck.commit, TCK_COMMIT);
  assert.equal(data.binding, "JSONRPC");
  assert.equal(data.transportLevels.jsonrpc.MUST.failed, 0);
  assert.equal(data.transportLevels.agentCard.MUST.failed, 0);
  assert.equal(data.candidate.revision, data.candidateSha);
  assert.equal(typeof data.candidate.worktreeDirty, "boolean");
  for (const artifact of Object.values(data.candidate.artifacts) as Array<{ sha256: string }>) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  }
  assert.ok(data.skippedJsonRpc.every(({ status, rationale }) =>
    status === "inapplicable" && typeof rationale === "string" && rationale.length > 20));
  for (const name of ["compatibility.json", "compatibility.html", "tck_report.html", "junitreport.xml"]) {
    assert.match(data.artifacts[name].sha256, /^[a-f0-9]{64}$/);
  }
});

Then("this change records protocol and artifact metadata checks without decorative screenshots", function () {
  assert.equal(existsSync(join(evidenceRoot, "visual-evidence.json")), false);
  assert.equal(existsSync(join(evidenceRoot, "screenshots")), false);
});

Then("rendered A2UI browser evidence remains owned by the agentic example change", function () {
  const plan = readFileSync(join(root, ".kbd-orchestrator/phases/full-3.0-release/plan.md"), "utf8");
  assert.match(plan, /v3-agentic-a2ui-example[\s\S]*browser E2E/i);
});

Then("coverage records implemented JSON-RPC and graph-policy evidence", function () {
  const qualityGates = coverage.qualityGates as Array<Record<string, unknown>>;
  const gate = qualityGates.find(({ id }) => id === "release.protocol.a2a-jsonrpc-v1");
  assert.equal(gate?.status, "implemented");
  assert.equal(gate?.command, "pnpm run verify:a2a-conformance");
  assert.ok((gate?.evidence as string[]).includes("release/a2a-conformance-agent.md"));
  assert.ok(existsSync(join(evidenceRoot, "task-4-ledgers-docs.md")));

  const capabilities = coverage.capabilities as Array<Record<string, unknown>>;
  for (const id of ["protocol.a2a-a2ui", "security.tenant-actions-secrets"]) {
    const capability = capabilities.find((candidate) => candidate.id === id);
    assert.ok(capability, `missing ${id}`);
    const a2aEvidence = (capability.releaseEvidence as Array<Record<string, unknown>>).find(
      ({ ownerChange }) => ownerChange === "v3-a2a-conformance-agent",
    );
    assert.equal(a2aEvidence?.status, "implemented");
    assert.match(String(a2aEvidence?.command), /^pnpm run (?:test|verify):a2a-conformance$/);
  }
});

Then("A2A root and legacy export ledgers match built artifacts", function () {
  const output = runPnpm(["--filter", "@prometheus-ags/entity-graph-a2a", "run", "verify:skills"]);
  assert.match(output, /OK: A2A root: 30 runtime exports match ledger\./);
  assert.match(output, /OK: A2A \.\/legacy: 2 runtime exports match ledger\./);
});

Then(
  "package, release, and skill guides separate protocol validity from authority",
  function () {
    for (const path of [
      "packages/entity-graph-a2a/README.md",
      "release/a2a-conformance-agent.md",
      "prometheus-entity-skills/_shared/references/a2a-conformance-agent.md",
      "prometheus-entity-skills/_shared/references/v3-release-contract.md",
    ]) {
      assert.match(readFileSync(join(root, path), "utf8"), /Protocol validity never grants application authority\./);
    }
  },
);

Then("alpha consumers have an explicit legacy subpath migration", function () {
  const combined = [
    "packages/entity-graph-a2a/README.md",
    "packages/entity-graph-a2a/CHANGELOG.md",
    "prometheus-entity-skills/_shared/references/a2a-conformance-agent.md",
  ].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
  assert.match(combined, /@prometheus-ags\/entity-graph-a2a\/legacy/);
  assert.match(combined, /slash method/i);
});

Then("excluded bindings and capabilities remain explicit", function () {
  const combined = [
    "README.md",
    "release/README.md",
    "release/a2a-conformance-agent.md",
    "examples/README.md",
  ].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
  for (const phrase of ["REST", "gRPC", "push notification", "extension signing", "rendered"]) {
    assert.match(combined, new RegExp(phrase, "i"));
  }
});
