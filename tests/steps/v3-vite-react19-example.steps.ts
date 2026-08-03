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
    sourceModes: string[];
    initialRemoteSeedsBaseList: boolean;
  };
  production: {
    typecheck: "pass";
    build: "pass";
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
  };
  artifacts: Array<{ path: string; sha256: string }>;
};

const root = process.cwd();
const reportPath = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example/task-3-verification.json",
);
let report: VerificationReport | undefined;

setDefaultTimeout(10 * 60 * 1_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync(
    "node",
    ["scripts/verify-vite-react19-example.mjs", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      stdio: "inherit",
      timeout: 10 * 60 * 1_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

Given(
  "the React 19 and Vite 8 showcase certification inputs are available",
  function () {
    for (const path of [
      "examples/vite-app/package.json",
      "examples/vite-app/src/pages/release-showcase/release-showcase-page.tsx",
      "examples/coverage.json",
      "packages/entity-graph-react/src/hooks/use-entity-query.test.ts",
      "tests/browser/v3-vite-react19-example.spec.ts",
      "tests/browser/v3-vite-react19-example.playwright.config.ts",
      "scripts/verify-vite-react19-example.mjs",
    ]) {
      assert.equal(existsSync(join(root, path)), true, `missing React input ${path}`);
    }

    const vitePackage = JSON.parse(
      readFileSync(join(root, "examples/vite-app/package.json"), "utf8"),
    ) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    assert.match(vitePackage.dependencies.react, /^19\./);
    assert.match(vitePackage.devDependencies.vite, /^8\./);
  },
);

When("the React showcase certification executes", function () {
  ensureReport();
});

Then("local, remote, and hybrid query sources pass focused unit tests", function () {
  const evidence = ensureReport();
  assert.equal(evidence.unit.status, "pass");
  assert.deepEqual(evidence.unit.sourceModes, ["local", "remote", "hybrid"]);
});

Then("an initial remote result populates the canonical base list", function () {
  assert.equal(ensureReport().unit.initialRemoteSeedsBaseList, true);
});

Then("every declared React showcase scenario has browser evidence", function () {
  const evidence = ensureReport();
  for (const id of evidence.browser.declaredScenarioIds) {
    assert.equal(evidence.browser.scenarios[id]?.status, "pass", id);
  }
  assert.equal(evidence.browser.unexpectedTests, 0);
  assert.ok(evidence.browser.expectedTests >= 3);
});

Then(
  "normalized identity, optimistic mutation, relationship, view, transport, realtime, persistence, convergence, lifecycle, and DevTools flows pass",
  function () {
    const scenarios = ensureReport().browser.scenarios;
    for (const id of [
      "example.graph.normalized-cross-view",
      "example.crud.optimistic-confirm",
      "example.crud.optimistic-rollback",
      "example.relationship.cascade-invalidation",
      "example.view.local-remote-hybrid",
      "example.transport.rest-graphql-equivalence",
      "example.realtime.coalesced-cross-view",
      "example.offline.persistence-convergence",
      "example.runtime.lifecycle-security",
      "example.runtime.devtools",
    ]) {
      assert.equal(scenarios[id]?.status, "pass", id);
    }
  },
);

Then(
  "the production browser surface has no serious or critical accessibility violations",
  function () {
    assert.deepEqual(ensureReport().browser.accessibility, {
      status: "pass",
      serious: 0,
      critical: 0,
    });
  },
);

Then("the React production build and typecheck pass", function () {
  const evidence = ensureReport();
  assert.equal(evidence.production.typecheck, "pass");
  assert.equal(evidence.production.build, "pass");
  assert.equal(evidence.commands.every((command) => command.exitCode === 0), true);
});

Then(
  "source-workspace browser evidence is not counted as packed-package evidence",
  function () {
    const boundary = ensureReport().evidenceBoundary;
    assert.equal(boundary.kind, "source-workspace-production-browser");
    assert.equal(boundary.countsAsPackedPackageEvidence, false);
  },
);

Then("screenshots, trace metadata, and exact tool versions are recorded", function () {
  const evidence = ensureReport();
  assert.ok(evidence.artifacts.filter((artifact) => artifact.path.endsWith(".png")).length >= 3);
  assert.ok(evidence.artifacts.some((artifact) => artifact.path.endsWith(".zip")));
  for (const version of ["node", "pnpm", "react", "vite", "playwright", "typescript"]) {
    assert.match(evidence.versions[version] ?? "", /\d+\.\d+/);
  }
  for (const artifact of evidence.artifacts) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  }
});
