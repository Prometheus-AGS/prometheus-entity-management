import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AfterAll,
  Given,
  Then,
  When,
  setDefaultTimeout,
} from "@cucumber/cucumber";

type FrameworkNeutralReport = {
  schemaVersion: number;
  artifact: {
    packageName: string;
    runtimeReactDependencies: "none";
    declarationReactDependencies: "none";
    resolvedReactPackages: "none";
  };
  consumers: {
    installSource: "packed-tarball-only";
    nodeEsmSharedGraph: "pass";
    nodeCommonJsSharedGraph: "pass";
    isolatedGraphFactories: "pass";
    typescriptWithoutReactTypes: "pass";
  };
};

const root = process.cwd();
const reportDirectory = mkdtempSync(join(tmpdir(), "framework-neutral-core-bdd-"));
const reportPath = join(reportDirectory, "report.json");
let report: FrameworkNeutralReport | undefined;
let reactCompatibilityOutput = "";

setDefaultTimeout(120_000);

function ensureReport(): FrameworkNeutralReport {
  if (report) return report;
  execFileSync(
    "pnpm",
    ["run", "verify:framework-neutral-core", "--", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as FrameworkNeutralReport;
  return report;
}

function ensureReactCompatibility(): string {
  if (reactCompatibilityOutput) return reactCompatibilityOutput;
  reactCompatibilityOutput = execFileSync(
    "pnpm",
    [
      "--filter",
      "@prometheus-ags/prometheus-entity-management",
      "exec",
      "vitest",
      "run",
      "src/graph-store.test.tsx",
      "--reporter=verbose",
    ],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    },
  );
  return reactCompatibilityOutput;
}

AfterAll(function () {
  rmSync(reportDirectory, { recursive: true, force: true });
});

Given("the framework-neutral core verifier is available", function () {
  assert.equal(existsSync(join(root, "scripts", "verify-framework-neutral-core.mjs")), true);
  assert.equal(existsSync(join(root, "packages", "entity-graph-react", "src", "graph-store.test.tsx")), true);
});

When("the packed framework-neutral core is verified", function () {
  ensureReport();
});

Then("its runtime dependency graph contains no React packages", function () {
  const result = ensureReport();
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.artifact.packageName, "@prometheus-ags/entity-graph-core");
  assert.equal(result.artifact.resolvedReactPackages, "none");
  assert.equal(result.consumers.installSource, "packed-tarball-only");
});

Then("its ESM and CommonJS artifacts contain no React imports", function () {
  assert.equal(ensureReport().artifact.runtimeReactDependencies, "none");
});

Then("its TypeScript declarations contain no React types", function () {
  assert.equal(ensureReport().artifact.declarationReactDependencies, "none");
});

Then("ESM and CommonJS consumers share the default graph singleton", function () {
  const consumers = ensureReport().consumers;
  assert.equal(consumers.nodeEsmSharedGraph, "pass");
  assert.equal(consumers.nodeCommonJsSharedGraph, "pass");
});

Then("independent graph factories do not leak entities", function () {
  assert.equal(ensureReport().consumers.isolatedGraphFactories, "pass");
});

Then("TypeScript consumes the core without React type packages", function () {
  assert.equal(ensureReport().consumers.typescriptWithoutReactTypes, "pass");
});

When("the React graph-store compatibility tests run", function () {
  ensureReactCompatibility();
});

Then("React hooks observe writes through the core singleton", function () {
  assert.match(ensureReactCompatibility(), /subscribes components to writes made through the core singleton/);
});

Then("the React compatibility hook preserves imperative store methods", function () {
  assert.match(ensureReactCompatibility(), /preserves imperative StoreApi methods on the React compatibility hook/);
});

Then("the React sync-status hook observes the vanilla status store", function () {
  assert.match(ensureReactCompatibility(), /subscribes to framework-neutral local-first status/);
});

Then("the coverage ledger maps the framework-neutral core gate to packed evidence", function () {
  const coverage = JSON.parse(readFileSync(join(root, "examples", "coverage.json"), "utf8")) as {
    qualityGates: Array<{
      id: string;
      status: string;
      change: string;
      feature: string;
      command?: string;
      evidence: string[];
    }>;
  };
  const gate = coverage.qualityGates.find(({ id }) => id === "release.core.framework-neutral");
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-framework-neutral-core");
  assert.equal(gate.feature, "tests/features/release/v3-framework-neutral-core.feature");
  assert.equal(gate.command, "pnpm run verify:framework-neutral-core");
  for (const path of gate.evidence) assert.equal(existsSync(join(root, path)), true, path);
});

Then("release documentation distinguishes the core store from React hooks", function () {
  const contract = readFileSync(join(root, "release", "framework-neutral-core.md"), "utf8");
  const coreReadme = readFileSync(join(root, "packages", "entity-graph-core", "README.md"), "utf8");
  const reactReadme = readFileSync(join(root, "packages", "entity-graph-react", "README.md"), "utf8");
  assert.match(contract, /createGraphStore\(\)/);
  assert.match(contract, /graphStore/);
  assert.match(contract, /not a React hook/);
  assert.match(coreReadme, /deprecated core `useGraphStore` name is a StoreApi-shaped alias/);
  assert.match(reactReadme, /React hook subscribed to `graphStore`/);
});

Then("skill references teach the 3.0 core and React import boundary", function () {
  const api = readFileSync(join(root, "prometheus-entity-skills", "_shared", "references", "library-api.md"), "utf8");
  const architecture = readFileSync(join(root, "prometheus-entity-skills", "_shared", "references", "architecture-rules.md"), "utf8");
  const releaseContract = readFileSync(join(root, "prometheus-entity-skills", "_shared", "references", "v3-release-contract.md"), "utf8");
  for (const source of [api, architecture, releaseContract]) {
    assert.match(source, /createGraphStore/);
    assert.match(source, /graphStore/);
  }
  assert.match(releaseContract, /verify:framework-neutral-core/);
});

Then("migration guidance documents the deprecated alias and request isolation", function () {
  const migration = readFileSync(
    join(root, "prometheus-entity-skills", "entity-graph-setup", "references", "migration-patterns.md"),
    "utf8",
  );
  assert.match(migration, /one isolated `createGraphStore\(\)` instance per server request/);
  assert.match(migration, /deprecated `useGraphStore` alias/);
});

Then("the framework-neutral gate remains distinct from binding and release certification", function () {
  const coreContract = readFileSync(join(root, "release", "framework-neutral-core.md"), "utf8");
  const bindingContract = readFileSync(join(root, "release", "binding-singleton-contract.md"), "utf8");
  assert.match(coreContract, /This gate itself does not prove that framework bindings resolve exactly one core package instance/);
  assert.match(coreContract, /separate six-binding proof/);
  assert.match(bindingContract, /six stable JavaScript framework bindings/);
  assert.match(bindingContract, /does not certify browser rendering/);

  const coverage = JSON.parse(readFileSync(join(root, "examples", "coverage.json"), "utf8")) as {
    status: string;
    qualityGates: Array<{ id: string; status: string }>;
    showcases: Array<{
      status: string;
      runtimeEvidence: { status: string };
      visualEvidence: { status: string };
    }>;
    documentationSite: { status: string };
  };
  const bindingGate = coverage.qualityGates.find(({ id }) => id === "release.bindings.one-core-singleton");
  assert.equal(bindingGate?.status, "implemented");
  assert.equal(coverage.status, "in-progress");
  assert.ok(
    coverage.showcases.every(
      ({ status, runtimeEvidence, visualEvidence }) =>
        ["planned", "implemented"].includes(status) &&
        runtimeEvidence.status === status &&
        visualEvidence.status === status,
    ),
  );
  assert.equal(coverage.documentationSite.status, "planned");
});
