import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type VerificationReport = {
  status: "pass";
  evidenceBoundary: {
    kind: string;
    countsAsPackedPackageEvidence: false;
  };
  versions: Record<string, string>;
  commands: Array<{ label: string; exitCode: number }>;
  unit: {
    status: "pass";
    concurrentTenantPayloadsDisjoint: boolean;
    perRequestGraphsSerializable: boolean;
    globalStoreUntouchedByServerPath: boolean;
    hydratedListsSatisfyStaleTimePredicate: boolean;
  };
  production: {
    typecheck: "pass";
    build: "pass";
    dynamicSsrRoute: string;
  };
  browser: {
    status: "pass";
    expectedTests: number;
    unexpectedTests: number;
    declaredScenarioIds: string[];
    scenarios: Record<string, { status: "pass"; proof: Record<string, unknown> }>;
    accessibility: {
      status: "pass";
      serious: number;
      critical: number;
    };
    hydrationMismatchErrors: number;
    duplicateHydratedListFetches: number;
  };
  artifacts: Array<{ path: string; sha256: string }>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/task-3-verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(15 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync(
    "node",
    ["scripts/verify-nextjs-app-router-example.mjs", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      stdio: "inherit",
      timeout: 15 * 60 * 1_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

Given(
  "the Next.js App Router showcase certification inputs are available",
  function () {
    for (const path of [
      "examples/nextjs-app/package.json",
      "examples/nextjs-app/src/lib/server/request-graph.ts",
      "examples/nextjs-app/src/lib/server/demo-data-source.ts",
      "examples/nextjs-app/src/components/request-hydration-boundary.tsx",
      "examples/nextjs-app/src/app/release-showcase/page.tsx",
      "examples/coverage.json",
      "examples/nextjs-app/src/lib/server/request-isolation.test.ts",
      "tests/browser/v3-nextjs-app-router-example.spec.ts",
      "tests/browser/v3-nextjs-app-router-example.playwright.config.ts",
      "scripts/verify-nextjs-app-router-example.mjs",
    ]) {
      assert.equal(existsSync(join(root, path)), true, `missing Next.js input ${path}`);
    }

    const nextPackage = JSON.parse(
      readFileSync(join(root, "examples/nextjs-app/package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    assert.match(nextPackage.dependencies.react, /^19\./);
    assert.match(nextPackage.dependencies.next, /^16\./);
  },
);

When("the Next.js showcase certification executes", function () {
  ensureReport();
});

Then("concurrent tenant payloads stay disjoint and reference-independent", function () {
  const evidence = ensureReport();
  assert.equal(evidence.unit.status, "pass");
  assert.equal(evidence.unit.concurrentTenantPayloadsDisjoint, true);
});

Then("per-request graphs hydrate and dehydrate as serializable round trips", function () {
  assert.equal(ensureReport().unit.perRequestGraphsSerializable, true);
});

Then("the server path never writes the process-global graph store", function () {
  assert.equal(ensureReport().unit.globalStoreUntouchedByServerPath, true);
});

Then("hydrated list slots satisfy the fresh-inside-staleTime predicate", function () {
  assert.equal(ensureReport().unit.hydratedListsSatisfyStaleTimePredicate, true);
});

Then("every declared Next.js showcase scenario has browser evidence", function () {
  const evidence = ensureReport();
  for (const id of evidence.browser.declaredScenarioIds) {
    assert.equal(evidence.browser.scenarios[id]?.status, "pass", id);
  }
  assert.equal(evidence.browser.unexpectedTests, 0);
  assert.ok(evidence.browser.expectedTests >= 4);
});

Then(
  "SSR prefetch HTML, normalized identity, optimistic mutation, relationship, view, realtime takeover, and lifecycle flows pass",
  function () {
    const scenarios = ensureReport().browser.scenarios;
    for (const id of [
      "example.graph.normalized-cross-view",
      "example.crud.optimistic-confirm",
      "example.relationship.cascade-invalidation",
      "example.view.local-remote-hybrid",
      "example.realtime.coalesced-cross-view",
      "example.runtime.ssr-isolation-hydration",
      "example.runtime.lifecycle-security",
    ]) {
      assert.equal(scenarios[id]?.status, "pass", id);
    }
    const isolation = scenarios["example.runtime.ssr-isolation-hydration"];
    assert.equal(isolation?.proof.serverHtmlContainsPrefetchedTask, true);
    assert.equal(isolation?.proof.crossRequestLeakage, false);
  },
);

Then(
  "hydration produces no mismatch errors and no duplicate fetches of hydrated lists",
  function () {
    const evidence = ensureReport();
    assert.equal(evidence.browser.hydrationMismatchErrors, 0);
    assert.equal(evidence.browser.duplicateHydratedListFetches, 0);
    const isolation =
      evidence.browser.scenarios["example.runtime.ssr-isolation-hydration"];
    assert.equal(isolation?.proof.duplicateListFetches, 0);
  },
);

Then(
  "the Next.js production browser surface has no serious or critical accessibility violations",
  function () {
    const accessibility = ensureReport().browser.accessibility;
    assert.equal(accessibility.status, "pass");
    assert.equal(accessibility.serious, 0);
    assert.equal(accessibility.critical, 0);
  },
);

Then("the Next.js production build and typechecks pass", function () {
  const evidence = ensureReport();
  assert.equal(evidence.production.typecheck, "pass");
  assert.equal(evidence.production.build, "pass");
  assert.equal(evidence.production.dynamicSsrRoute, "/release-showcase");
});

Then(
  "Next.js source-workspace browser evidence is not counted as packed-package evidence",
  function () {
    const boundary = ensureReport().evidenceBoundary;
    assert.equal(boundary.kind, "source-workspace-production-browser");
    assert.equal(boundary.countsAsPackedPackageEvidence, false);
  },
);

Then("Next.js screenshots, trace metadata, and exact tool versions are recorded", function () {
  const evidence = ensureReport();
  assert.ok(evidence.artifacts.length >= 4, "expected screenshots and trace zips");
  for (const artifact of evidence.artifacts) {
    assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
    assert.equal(existsSync(join(root, artifact.path)), true, artifact.path);
  }
  for (const key of ["node", "pnpm", "react", "next", "playwright", "typescript"]) {
    assert.ok(evidence.versions[key], `missing recorded version ${key}`);
  }
});
