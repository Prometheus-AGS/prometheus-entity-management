import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "examples/agentic-a2ui");

const REQUIRED_FILES = [
  "src/lib/demo-data.ts",
  "src/lib/graph-seed.ts",
  "src/lib/audit-store.ts",
  "src/agent/agent-server.ts",
  "src/agent/agent-client.ts",
  "src/agent/agent-flows.ts",
  "src/agent/surface-messages.ts",
  "src/a2ui/runtime.ts",
  "src/features/tasks/task-store.ts",
  "src/features/tasks/task-hooks.ts",
  "src/features/tasks/demo-realtime-adapter.ts",
  "src/pages/agent-console-page.tsx",
  "tests/golden-replay.test.ts",
  "tests/golden/happy.json",
  "tests/golden/denied.json",
  "tests/golden/malformed.json",
  "tests/golden/cancelled.json",
  "tests/golden/surface-task-sync.json",
  "tests/golden/tenant-denied.json",
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const candidate = join(dir, entry);
    return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
  });
}

test("the agentic A2UI example file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(appRoot, file)), true, `missing ${file}`);
  }
  for (const file of [
    "tests/browser/v3-agentic-a2ui-example.spec.ts",
    "tests/browser/v3-agentic-a2ui-example.playwright.config.ts",
    "scripts/verify-agentic-a2ui-example.mjs",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("components never touch the graph or agent server directly (layering)", () => {
  const components = walk(join(appRoot, "src/pages"));
  for (const path of components) {
    const source = readFileSync(path, "utf8");
    assert.ok(
      !source.includes('from "@prometheus-ags/entity-graph-core"'),
      `component ${path} imports the graph store directly`,
    );
    assert.ok(
      !source.includes("agent-client"),
      `component ${path} speaks the A2A wire directly`,
    );
  }
});

test("no model credential or secret surface exists anywhere in the example", () => {
  const sources = walk(join(appRoot, "src")).concat(walk(join(appRoot, "tests")));
  const secretPattern = /api[_-]?key\s*[:=]|openai|anthropic|\bsk-[a-z0-9]{6,}/i;
  for (const path of sources) {
    if (/golden/.test(path)) continue;
    const source = readFileSync(path, "utf8");
    assert.ok(!secretPattern.test(source), `possible credential reference in ${path}`);
  }
});

test("the example consumes the library through package exports, not source aliases", () => {
  const tsconfig = JSON.parse(readFileSync(join(appRoot, "tsconfig.json"), "utf8"));
  const paths = tsconfig.compilerOptions?.paths ?? {};
  for (const [alias, targets] of Object.entries(paths)) {
    if (alias.startsWith("@prometheus-ags")) {
      for (const target of targets) {
        assert.ok(
          !/packages\/.*\/src/.test(String(target)),
          `source-path alias ${alias} -> ${target} must not count as packed-package evidence`,
        );
      }
    }
  }
  const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
  for (const dep of [
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/prometheus-entity-management",
    "@prometheus-ags/a2ui-react",
    "@prometheus-ags/entity-graph-a2a",
  ]) {
    assert.equal(pkg.dependencies[dep], "workspace:*", `${dep} must be a workspace dep`);
  }
  assert.equal(pkg.dependencies["@a2a-js/sdk"], "1.0.1", "official A2A SDK pin");
});

test("golden fixtures pin the four protocol flows plus surface and tenant guard", () => {
  const happy = JSON.parse(readFileSync(join(appRoot, "tests/golden/happy.json"), "utf8"));
  assert.equal(happy.finalState, "TASK_STATE_COMPLETED");
  assert.equal(happy.canonicalStatus, "done");
  const denied = JSON.parse(readFileSync(join(appRoot, "tests/golden/denied.json"), "utf8"));
  assert.equal(denied.finalState, "TASK_STATE_REJECTED");
  assert.equal(denied.survived, true);
  const malformed = JSON.parse(readFileSync(join(appRoot, "tests/golden/malformed.json"), "utf8"));
  assert.equal(typeof malformed.code, "number");
  const cancelled = JSON.parse(readFileSync(join(appRoot, "tests/golden/cancelled.json"), "utf8"));
  assert.equal(cancelled.finalState, "TASK_STATE_CANCELED");
  const surface = JSON.parse(
    readFileSync(join(appRoot, "tests/golden/surface-task-sync.json"), "utf8"),
  );
  assert.equal(surface[0].createSurface.surfaceId, "surface-task-sync");
  const tenant = JSON.parse(
    readFileSync(join(appRoot, "tests/golden/tenant-denied.json"), "utf8"),
  );
  assert.equal(tenant.status, 403);
});

test("coverage records the agentic-a2ui showcase as implemented with its declared scenarios", () => {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const showcase = coverage.showcases.find((entry) => entry.id === "agentic-a2ui");
  assert.ok(showcase, "agentic-a2ui showcase missing from examples/coverage.json");
  assert.equal(showcase.status, "implemented");
  assert.equal(showcase.change, "v3-agentic-a2ui-example");
  for (const id of [
    "example.graph.normalized-cross-view",
    "example.crud.optimistic-confirm",
    "example.realtime.coalesced-cross-view",
    "example.protocol.a2a-a2ui-policy",
    "example.runtime.lifecycle-security",
  ]) {
    assert.ok(showcase.scenarioIds.includes(id), `showcase missing scenario ${id}`);
  }
  assert.equal(showcase.runtimeEvidence.status, "implemented");
  assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:agentic-a2ui");
  assert.equal(showcase.visualEvidence.status, "implemented");
});

test("root gates exist for the change", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const script of [
    "verify:agentic-a2ui",
    "test:v3-agentic-a2ui-example",
    "test:agentic-a2ui:golden",
    "test:agentic-a2ui:browser",
    "bdd:agentic-a2ui",
  ]) {
    assert.ok(pkg.scripts[script], `missing root script ${script}`);
  }
});
