import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

const root = process.cwd();
const evidenceRoot = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge",
);
let unitReceipt = "";
let consumerReceipt = "";
let coverage: Record<string, unknown> | undefined;

setDefaultTimeout(180_000);

function runPnpm(args: string[]): string {
  return execFileSync("pnpm", args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
  });
}

function ensureReceipts(): void {
  if (unitReceipt && consumerReceipt) return;
  unitReceipt = runPnpm(["run", "test:a2ui-bridge"]);
  consumerReceipt = runPnpm(["run", "verify:a2ui-bridge"]);
}

function visualManifest() {
  const path = join(evidenceRoot, "visual-evidence.json");
  assert.ok(existsSync(path), "visual-evidence.json must be captured before BDD certification");
  return JSON.parse(readFileSync(path, "utf8"));
}

Given("the exact official A2UI v0.9.1 runtime dependencies are installed", function () {
  const manifest = JSON.parse(
    readFileSync(join(root, "packages/a2ui-react/package.json"), "utf8"),
  );
  assert.equal(manifest.dependencies["@a2ui/react"], "0.10.2");
  assert.equal(manifest.dependencies["@a2ui/web_core"], "0.10.5");
  assert.equal(manifest.dependencies["@a2ui/markdown-it"], "0.1.0");
  assert.equal(manifest.dependencies.zod, "3.25.76");
});

When("the A2UI protocol bridge receipts are executed", function () {
  ensureReceipts();
});

Then("the official v0.9.1 processor creates a catalog-backed surface", function () {
  assert.match(unitReceipt, /creates an official v0\.9\.1 surface/);
  assert.match(unitReceipt, /catalog-backed surface/);
});

Then("official component and data-model updates render through A2uiSurface", function () {
  assert.match(unitReceipt, /renders official component and data-model updates/);
});

Then("unsupported protocol versions and unknown components fail closed", function () {
  assert.match(unitReceipt, /rejects unsupported protocol versions and unknown components/);
});

Then("an allowlisted tenant action updates the canonical graph", function () {
  assert.match(unitReceipt, /executes an allowlisted tenant graph action/);
});

Then("unknown actions, tenants, entity types, and fields are denied", function () {
  assert.match(unitReceipt, /denies unknown actions, tenants, entity types, and fields/);
});

Then("destructive actions require out-of-band approval", function () {
  assert.match(unitReceipt, /requires out-of-band approval for destructive actions/);
});

Then("renderer components never access the graph store directly", function () {
  const official = readFileSync(join(root, "packages/a2ui-react/src/official/runtime.ts"), "utf8");
  const react = readFileSync(join(root, "packages/a2ui-react/src/react/a2ui-provider.tsx"), "utf8");
  assert.doesNotMatch(`${official}\n${react}`, /useGraphStore|graphStore|getState\(/);
});

Then("the package root contains official A2UI exports without legacy chat exports", function () {
  assert.match(consumerReceipt, /packed official root separation passed/);
});

Then("the AG-UI compatibility subpath preserves the alpha chat surface", function () {
  assert.match(consumerReceipt, /packed AG-UI compatibility subpath passed/);
});

Then("the packed ESM, CommonJS, NodeNext, and Node16 consumers pass without workspace aliases", function () {
  assert.match(consumerReceipt, /PASS: packed A2UI ESM, CommonJS, NodeNext, Node16, and render consumer/);
});

Then("the bridge imports explicit official v0_9 entry points", function () {
  for (const path of [
    "packages/a2ui-react/src/official/catalog.ts",
    "packages/a2ui-react/src/official/runtime.ts",
    "packages/a2ui-react/src/react/a2ui-provider.tsx",
  ]) {
    assert.match(readFileSync(join(root, path), "utf8"), /@a2ui\/(react|web_core)\/v0_9/);
  }
});

Then("the bridge does not implement JSONL parsing or an alternate surface model", function () {
  for (const directory of ["official", "react", "policy"]) {
    const paths = execFileSync("rg", ["--files", `packages/a2ui-react/src/${directory}`], {
      cwd: root,
      encoding: "utf8",
    }).trim().split("\n");
    const source = paths.map((path) => readFileSync(join(root, path), "utf8")).join("\n");
    assert.doesNotMatch(source, /JSON\.parse|jsonl|STATE_SNAPSHOT|MESSAGE_START/);
  }
});

Then("the default catalog excludes side-effecting openUrl", function () {
  assert.match(unitReceipt, /excludes openUrl from the default catalog/);
});

When("the A2UI browser evidence is inspected", function () {
  visualManifest();
});

Then("desktop and mobile screenshots have nonzero dimensions and immutable hashes", function () {
  const manifest = visualManifest();
  for (const image of manifest.screenshots) {
    const absolute = join(evidenceRoot, image.path);
    assert.ok(existsSync(absolute), image.path);
    assert.ok(statSync(absolute).size > 1_000, image.path);
    assert.ok(image.width > 0 && image.height > 0, image.path);
    assert.match(image.sha256, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(
    manifest.screenshots.map(({ id }: { id: string }) => id),
    ["desktop-initial", "desktop-policy-outcomes", "mobile-policy-outcomes"],
  );
});

Then("keyboard activation records allowed, field-denied, and approval-denied outcomes", function () {
  const manifest = visualManifest();
  assert.deepEqual(manifest.keyboard.outcomes, [
    "executed",
    "unauthorized-field",
    "approval-denied",
  ]);
  assert.equal(manifest.keyboard.pointerClicks, 0);
  assert.ok(manifest.keyboard.keys.every((key: string) => ["Tab", "Enter"].includes(key)));
});

Then("the automated accessibility scan has zero critical or serious violations", function () {
  const axe = visualManifest().accessibility.axe;
  assert.equal(axe.critical, 0);
  assert.equal(axe.serious, 0);
});

Then(
  "the manual WCAG checklist records names, focus, contrast, targets, motion, and status semantics",
  function () {
    const checklist = visualManifest().accessibility.manualChecklist;
    for (const key of [
      "accessibleNames",
      "keyboardAndFocus",
      "contrast",
      "targetSize",
      "reducedMotion",
      "statusNotColorOnly",
      "mediaAlternatives",
      "liveRegions",
    ]) {
      assert.equal(checklist[key], "pass", key);
    }
  },
);

Then("the evidence identifies the built artifact, browser, route, and protocol version", function () {
  const manifest = visualManifest();
  assert.equal(manifest.protocol, "v0.9.1");
  assert.equal(manifest.route, "http://127.0.0.1:4177/");
  assert.match(manifest.browser.name, /Chrome|Chromium/);
  assert.match(manifest.artifact.entry, /packages\/a2ui-react\/dist\/index\.mjs$/);
  assert.match(manifest.artifact.sha256, /^[a-f0-9]{64}$/);
});

When("the declared A2UI documentation surface is inspected", function () {
  coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
});

Then("coverage records implemented official protocol and graph-policy evidence", function () {
  const ledger = coverage as {
    qualityGates: Array<{
      id: string;
      status: string;
      command?: string;
      tags?: string[];
      policies?: string[];
      evidence?: string[];
    }>;
    capabilities: Array<{
      id: string;
      releaseEvidence: Array<{ ownerChange: string; status: string }>;
    }>;
  };
  const gate = ledger.qualityGates.find(({ id }) => id === "release.protocol.a2ui-official");
  assert.equal(gate?.status, "implemented");
  assert.equal(gate?.command, "pnpm run verify:a2ui-bridge");
  assert.deepEqual(gate?.tags, ["@release", "@v3-a2ui-protocol-bridge"]);
  assert.deepEqual(gate?.policies, [
    "release/v3-release-contract.json",
    "examples/coverage.json",
  ]);
  const declaredEvidence = new Set(gate?.evidence ?? []);
  for (const path of [
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/bdd-red.md",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/task-3-test-receipt.md",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/packed-consumer-report.json",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/visual-evidence.json",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/task-4-ledgers-docs.md",
    "release/a2ui-protocol-bridge.md",
  ]) assert.ok(declaredEvidence.has(path), path);
  for (const capabilityId of ["protocol.a2a-a2ui", "security.tenant-actions-secrets"]) {
    const capability = ledger.capabilities.find(({ id }) => id === capabilityId);
    const evidence = capability?.releaseEvidence.find(
      ({ ownerChange }) => ownerChange === "v3-a2ui-protocol-bridge",
    );
    assert.equal(evidence?.status, "implemented", capabilityId);
  }
});

Then("the A2UI root and AG-UI compatibility export ledgers match built artifacts", function () {
  const receipt = runPnpm(["--filter", "@prometheus-ags/a2ui-react", "run", "verify:skills"]);
  assert.match(receipt, /A2UI root: 18 runtime exports match ledger/);
  assert.match(receipt, /A2UI \.\/ag-ui: 9 runtime exports match ledger/);
});

Then(
  "the package and release guides teach protocol validation separately from application authority",
  function () {
    const docs = [
      "packages/a2ui-react/README.md",
      "release/a2ui-protocol-bridge.md",
      "prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md",
    ].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
    assert.match(docs, /Protocol validity never grants application authority/);
    assert.match(docs, /@a2ui\/react@0\.10\.2/);
    assert.match(docs, /@a2ui\/web_core@0\.10\.5/);
    assert.match(docs, /openUrl.*excluded/is);
  },
);

Then("alpha chat consumers have an explicit AG-UI subpath migration", function () {
  const docs = readFileSync(join(root, "packages/a2ui-react/README.md"), "utf8");
  assert.match(docs, /@prometheus-ags\/a2ui-react\/ag-ui/);
  assert.match(docs, /EntityChat/);
  assert.match(docs, /3\.0.*breaking/is);
});
