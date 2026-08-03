import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("package.json"));

test("the Next.js example forces a fresh request-owned graph for every document request", () => {
  const layout = read("examples/nextjs-app/src/app/layout.tsx");
  const serverGraph = read("examples/nextjs-app/src/features/next-runtime/server-graph.ts");

  assert.match(layout, /export const dynamic = "force-dynamic"/);
  assert.match(layout, /await preloadRequestGraph\(\)/);
  assert.match(serverGraph, /createGraphStore\(\)/);
  assert.doesNotMatch(serverGraph, /\bgraphStore\b|getState\(\).*global/i);
});

test("the focused unit gate covers store, server snapshot, realtime, and action isolation", () => {
  assert.match(manifest.scripts["test:nextjs-app-router:unit"], /engine\.test\.ts/);
  assert.match(manifest.scripts["test:nextjs-app-router:unit"], /realtime-manager\.test\.ts/);
  assert.match(manifest.scripts["test:nextjs-app-router:unit"], /graph-store\.test\.tsx/);
  assert.match(manifest.scripts["test:nextjs-app-router:unit"], /vitest\.config\.mts/);
});

test("the production verifier creates an external app from candidate tarballs only", () => {
  const verifier = read("scripts/verify-nextjs-app-router-example.mjs");

  assert.match(verifier, /core-package-pack/);
  assert.match(verifier, /react-package-pack/);
  assert.match(verifier, /candidate-tarballs-only/);
  assert.match(verifier, /packed-consumer-production-build/);
  assert.match(verifier, /workspaceLinksPresent: false/);
  assert.doesNotMatch(verifier, /workspace:\*/);
});

test("the browser gate proves concurrent SSR, hydration, routes, mutation, and takeover", () => {
  const browser = read("tests/browser/v3-nextjs-app-router-example.spec.ts");

  assert.match(browser, /Array\.from\(\{ length: 12 \}/);
  assert.match(browser, /data-client-fetch-count/);
  assert.match(browser, /hydrationErrors/);
  assert.match(browser, /routeTransitionPreservedGraph/);
  assert.match(browser, /Move to review/);
  assert.match(browser, /Apply client event/);
});

test("the browser server cannot silently fall back to a workspace source app", () => {
  const config = read("tests/browser/v3-nextjs-app-router-example.playwright.config.ts");

  assert.match(config, /PROMETHEUS_NEXT_PACKED_APP is required/);
  assert.match(config, /reuseExistingServer: false/);
  assert.equal(manifest.scripts["verify:nextjs-app-router"], "node scripts/verify-nextjs-app-router-example.mjs");
});
