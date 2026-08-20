import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "examples/nextjs-app");

const REQUIRED_FILES = [
  "src/lib/hydration-payload.ts",
  "src/lib/server/demo-data-source.ts",
  "src/lib/server/request-graph.ts",
  "src/lib/server/request-isolation.test.ts",
  "src/lib/fetch-metrics.ts",
  "src/components/request-hydration-boundary.tsx",
  "src/app/release-showcase/page.tsx",
  "src/app/release-showcase/loading.tsx",
  "src/app/release-showcase/error.tsx",
  "src/app/loading.tsx",
  "src/app/error.tsx",
  "src/features/release-showcase/release-showcase-service.ts",
  "src/features/release-showcase/release-showcase-store.ts",
  "src/features/release-showcase/release-showcase-hooks.ts",
  "src/demo-pages/release-showcase/release-showcase-page.tsx",
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const candidate = join(dir, entry);
    return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
  });
}

function isClientModule(path) {
  const head = readFileSync(path, "utf8").slice(0, 200);
  return head.includes('"use client"') || head.includes("'use client'");
}

test("the Next.js SSR showcase file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(appRoot, file)), true, `missing ${file}`);
  }
  for (const file of [
    "tests/browser/v3-nextjs-app-router-example.spec.ts",
    "tests/browser/v3-nextjs-app-router-example.playwright.config.ts",
    "scripts/verify-nextjs-app-router-example.mjs",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("server modules never import the React binding (cross-request leakage boundary)", () => {
  const serverModules = walk(join(appRoot, "src/lib/server")).filter(
    (path) => !path.endsWith(".test.ts"),
  );
  assert.ok(serverModules.length >= 2, "expected server modules under src/lib/server");
  for (const path of serverModules) {
    const source = readFileSync(path, "utf8");
    assert.ok(
      !source.includes("@prometheus-ags/prometheus-entity-management"),
      `server module ${path} imports the React binding (process-global store)`,
    );
  }

  const routeFiles = walk(join(appRoot, "src/app")).filter(
    (path) =>
      /(page|layout|loading)\.tsx$/.test(path) && !isClientModule(path),
  );
  for (const path of routeFiles) {
    const source = readFileSync(path, "utf8");
    assert.ok(
      !source.includes('from "@prometheus-ags/prometheus-entity-management"'),
      `server route ${path} imports the React binding directly`,
    );
  }
});

test("client modules never import the per-request server layer", () => {
  const clientFiles = walk(join(appRoot, "src")).filter(
    (path) => /\.tsx?$/.test(path) && isClientModule(path),
  );
  for (const path of clientFiles) {
    const source = readFileSync(path, "utf8");
    assert.ok(
      !/lib\/server\//.test(source),
      `client module ${path} imports from src/lib/server`,
    );
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
  const nextConfig = readFileSync(join(appRoot, "next.config.ts"), "utf8");
  assert.ok(
    !/packages\/[^"']*\/src/.test(nextConfig),
    "next.config.ts must not alias the library into package sources",
  );
  const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
  assert.equal(
    pkg.dependencies["@prometheus-ags/prometheus-entity-management"],
    "workspace:*",
  );
  assert.equal(pkg.dependencies["@prometheus-ags/entity-graph-core"], "workspace:*");
});

test("coverage records the nextjs showcase as implemented with its declared scenarios", () => {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8"));
  const showcase = coverage.showcases.find((entry) => entry.id === "nextjs");
  assert.ok(showcase, "nextjs showcase missing from examples/coverage.json");
  assert.equal(showcase.status, "implemented");
  assert.equal(showcase.change, "v3-nextjs-app-router-example");
  for (const id of [
    "example.graph.normalized-cross-view",
    "example.crud.optimistic-confirm",
    "example.relationship.cascade-invalidation",
    "example.view.local-remote-hybrid",
    "example.realtime.coalesced-cross-view",
    "example.runtime.ssr-isolation-hydration",
    "example.runtime.lifecycle-security",
  ]) {
    assert.ok(showcase.scenarioIds.includes(id), `showcase missing scenario ${id}`);
  }
  assert.equal(showcase.runtimeEvidence.status, "implemented");
  assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:nextjs-app-router");
  assert.equal(showcase.visualEvidence.status, "implemented");
});

test("root gates exist for the change", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const script of [
    "verify:nextjs-app-router",
    "test:v3-nextjs-app-router-example",
    "bdd:nextjs-app-router",
  ]) {
    assert.ok(pkg.scripts[script], `missing root script ${script}`);
  }
});
