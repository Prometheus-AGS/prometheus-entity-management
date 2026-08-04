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
import { satisfies, validRange } from "semver";

type ManifestPolicy = {
  packageName: string;
  productionCoreDependency: "absent";
  requiredCorePeer: string;
  workspaceDevelopmentCore: string;
};

type BindingSingletonReport = {
  schemaVersion: number;
  candidate: {
    coreVersion: string;
    installSource: "packed-tarball-only";
    fixedReleasePackages: number;
  };
  manifestPolicy: Record<string, ManifestPolicy>;
  resolution: {
    compatibleCoreInstallations: number;
    bindingCoreInstances: Record<string, string>;
    peerRangeFailure: {
      status: "pass";
      suppliedVersion: string;
      expectedRange: string;
      diagnosticIncludesPackage: boolean;
      diagnosticIncludesPeerContext: boolean;
    };
  };
  behavior: Record<string, string>;
  behaviorProofs: Record<string, string>;
  limitations: {
    visualEvidence: string;
    browserOrDeviceRuntime: string;
    publication: string;
  };
};

const root = process.cwd();
const corePackageName = "@prometheus-ags/entity-graph-core";
const bindingDirectories = [
  "entity-graph-react",
  "entity-graph-svelte",
  "entity-graph-solid",
  "entity-graph-web-components",
  "entity-graph-alpine",
  "entity-graph-htmx",
];
const reportDirectory = mkdtempSync(join(tmpdir(), "binding-singleton-bdd-"));
const reportPath = join(reportDirectory, "report.json");
let report: BindingSingletonReport | undefined;

setDefaultTimeout(240_000);

function ensureReport(): BindingSingletonReport {
  if (report) return report;
  execFileSync(
    "pnpm",
    ["run", "verify:binding-singletons", "--", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as BindingSingletonReport;
  return report;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;
}

AfterAll(function () {
  rmSync(reportDirectory, { recursive: true, force: true });
});

Given("the binding singleton verifier is available", function () {
  assert.equal(existsSync(join(root, "scripts", "verify-binding-singletons.mjs")), true);
  assert.equal(bindingDirectories.length, 6);
});

When("the packed binding singleton contract is verified", function () {
  ensureReport();
});

Then("all six stable bindings omit core from production dependencies", function () {
  const policies = Object.values(ensureReport().manifestPolicy);
  assert.equal(policies.length, 6);
  assert.ok(policies.every(({ productionCoreDependency }) => productionCoreDependency === "absent"));
});

Then("all six stable bindings require a publishable compatible core peer", function () {
  const result = ensureReport();
  for (const policy of Object.values(result.manifestPolicy)) {
    assert.ok(validRange(policy.requiredCorePeer), `${policy.packageName}: invalid peer range`);
    assert.equal(policy.requiredCorePeer.startsWith("workspace:"), false);
    assert.equal(
      satisfies(result.candidate.coreVersion, policy.requiredCorePeer, { includePrerelease: true }),
      true,
      `${policy.packageName}: candidate is outside the packed peer range`,
    );
  }
});

Then("source development uses the workspace core without making the peer optional", function () {
  for (const directory of bindingDirectories) {
    const manifest = readJson(`packages/${directory}/package.json`) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    };
    assert.equal(manifest.dependencies?.[corePackageName], undefined, directory);
    assert.equal(manifest.devDependencies?.[corePackageName], "workspace:*", directory);
    assert.equal(manifest.peerDependencies?.[corePackageName], "workspace:^", directory);
    assert.notEqual(manifest.peerDependenciesMeta?.[corePackageName]?.optional, true, directory);
  }
});

Then("the fixed release group contains the complete twelve-package npm contract", function () {
  const changesets = readJson(".changeset/config.json") as { fixed: string[][] };
  const release = readJson("release/v3-release-contract.json") as {
    versionPolicy: { npm: { packages: string[] } };
  };
  const expected = [...release.versionPolicy.npm.packages].sort();
  const matches = changesets.fixed.filter((group) => {
    const actual = [...group].sort();
    return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  });
  assert.equal(expected.length, 12);
  assert.equal(matches.length, 1);
  assert.equal(ensureReport().candidate.fixedReleasePackages, 12);
});

Then("the application and every stable binding resolve one physical core instance", function () {
  const resolution = ensureReport().resolution;
  assert.equal(resolution.compatibleCoreInstallations, 1);
  assert.equal(Object.keys(resolution.bindingCoreInstances).length, 7);
  assert.deepEqual(new Set(Object.values(resolution.bindingCoreInstances)), new Set(["core-instance-1"]));
});

Then("React, Svelte, Solid, Web Components, Alpine, and HTMX observe that graph", function () {
  const result = ensureReport();
  const behavior = result.behavior;
  for (const binding of ["react", "svelte", "solid", "webComponents", "alpine", "htmx"]) {
    assert.equal(behavior[binding], "pass", binding);
  }
  assert.equal(behavior.normalizedGraph, "one shared default graph");
  assert.match(result.behaviorProofs.react, /selector subscription observed a core write/);
  assert.match(result.behaviorProofs.svelte, /entity store observed a core write/);
  assert.match(result.behaviorProofs.solid, /createGraphStore accessor observed a core write/);
  assert.match(result.behaviorProofs.webComponents, /reactive controller observed a core write/);
  assert.match(result.behaviorProofs.alpine, /reactive entity binding observed a core write/);
  assert.match(result.behaviorProofs.htmx, /emitted a binding change event.*two-way writes/);
});

Then("a core {int} consumer is rejected by strict peer resolution", function (major: number) {
  const failure = ensureReport().resolution.peerRangeFailure;
  assert.equal(major, 4);
  assert.equal(failure.status, "pass");
  assert.equal(failure.suppliedVersion, `${major}.0.0`);
});

Then("the peer failure identifies the core package and expected range", function () {
  const failure = ensureReport().resolution.peerRangeFailure;
  assert.equal(failure.diagnosticIncludesPackage, true);
  assert.equal(failure.diagnosticIncludesPeerContext, true);
  assert.ok(validRange(failure.expectedRange));
  assert.equal(satisfies(failure.suppliedVersion, failure.expectedRange), false);
});

Then("the singleton evidence is explicitly headless", function () {
  assert.match(ensureReport().limitations.visualEvidence, /headless package topology/);
});

Then("browser and device runtime evidence remains required from later examples", function () {
  assert.equal(ensureReport().limitations.browserOrDeviceRuntime, "not claimed by this change");
});

Then("no registry publication is claimed by the singleton verifier", function () {
  assert.equal(
    ensureReport().limitations.publication,
    "no registry or dist-tag mutation performed",
  );
});

Then("the coverage ledger maps the binding singleton gate to packed evidence", function () {
  const coverage = readJson("examples/coverage.json") as {
    status: string;
    qualityGates: Array<{
      id: string;
      status: string;
      change: string;
      feature: string;
      command?: string;
      policies: string[];
      evidence: string[];
    }>;
    showcases: Array<{
      status: string;
      runtimeEvidence: { status: string };
      visualEvidence: { status: string };
    }>;
  };
  const gate = coverage.qualityGates.find(({ id }) => id === "release.bindings.one-core-singleton");
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-binding-singleton-contract");
  assert.equal(gate.feature, "tests/features/release/v3-binding-singleton-contract.feature");
  assert.equal(gate.command, "pnpm run verify:binding-singletons");
  assert.deepEqual(gate.policies, ["release/v3-release-contract.json", ".changeset/config.json"]);
  for (const path of gate.evidence) assert.equal(existsSync(join(root, path)), true, path);
  assert.equal(coverage.status, "in-progress");
  assert.ok(
    coverage.showcases.every(
      ({ status, runtimeEvidence, visualEvidence }) =>
        ["planned", "partial", "implemented"].includes(status) &&
        runtimeEvidence.status === status &&
        visualEvidence.status === status,
    ),
  );
});

Then("release documentation explains required core peers and the fixed package group", function () {
  const contract = readFileSync(join(root, "release", "binding-singleton-contract.md"), "utf8");
  const releaseReadme = readFileSync(join(root, "release", "README.md"), "utf8");
  const rootReadme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(contract, /core peer is required, not optional/);
  assert.match(contract, /no production `dependencies` entry for core/);
  assert.match(contract, /exactly one fixed group matching all twelve npm packages/);
  assert.match(contract, /fake core `4\.0\.0`/);
  assert.match(contract, /does not certify browser rendering/);
  assert.match(releaseReadme, /Implemented binding singleton gate/);
  assert.match(rootReadme, /binding singleton gate/);
});

Then("every stable binding README installs an application-owned core", function () {
  for (const directory of bindingDirectories) {
    const readme = readFileSync(join(root, "packages", directory, "README.md"), "utf8");
    assert.match(readme, /pnpm add[^\n]*@prometheus-ags\/entity-graph-core/, directory);
    assert.match(readme, /application owns the one compatible graph instance/, directory);
    assert.match(readme, /must not install a private core copy/, directory);
    assert.match(readme, /binding singleton contract/, directory);
  }
});

Then("non-React binding documentation uses the vanilla graphStore name", function () {
  const nonReactDirectories = bindingDirectories.filter((directory) => directory !== "entity-graph-react");
  for (const directory of nonReactDirectories) {
    const readme = readFileSync(join(root, "packages", directory, "README.md"), "utf8");
    assert.match(readme, /graphStore/, directory);
    assert.doesNotMatch(readme, /subscribes to `useGraphStore`|import \{ useGraphStore \}|useGraphStore\.getState|graph \(useGraphStore from core\)/, directory);
  }
});

Then("skill references require singleton verification without claiming full release readiness", function () {
  const paths = [
    "prometheus-entity-skills/SKILL.md",
    "prometheus-entity-skills/SKILLS.md",
    "prometheus-entity-skills/_shared/references/architecture-rules.md",
    "prometheus-entity-skills/_shared/references/library-api.md",
    "prometheus-entity-skills/_shared/references/v3-release-contract.md",
    "prometheus-entity-skills/entity-graph-setup/references/migration-patterns.md",
  ];
  for (const path of paths) {
    const source = readFileSync(join(root, path), "utf8");
    assert.match(source, /verify:binding-singletons|binding singleton contract|binding-singleton-contract/, path);
  }
  const releaseReference = readFileSync(
    join(root, "prometheus-entity-skills", "_shared", "references", "v3-release-contract.md"),
    "utf8",
  );
  assert.match(releaseReference, /does not certify native Tauri\/Flutter behavior/);
  assert.match(releaseReference, /stable publication/);
});
