import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  readReleaseContract,
  readReleaseCoverage,
  validateReleaseContract,
  validateReleaseCoverage,
} from "../../scripts/validate-v3-release-contract.mjs";

const baseline = readReleaseContract();

const gateResults = JSON.parse(
  readFileSync(
    new URL(
      "../../.kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/gate-results.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("the checked-in release contract passes schema and workspace validation", () => {
  const result = validateReleaseContract(baseline);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.artifacts, 16);
  assert.equal(result.summary.npmPackages, 12);
  assert.equal(result.summary.requiredRegistries, 3);
  assert.equal(result.summary.plannedShowcases, 0);
  assert.equal(result.summary.implementedShowcases, 5);
});

test("coverage links the contract and keeps unfinished showcases honest", () => {
  const coverage = readReleaseCoverage();
  assert.deepEqual(validateReleaseCoverage(baseline, coverage), []);
  const candidate = structuredClone(coverage);
  candidate.showcases[0].status = "certified";
  candidate.showcases.pop();
  candidate.qualityGates = [];
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /five required 3\.0 showcases/);
  assert.match(errors.join("\n"), /showcase status must be planned or implemented/);
  assert.match(errors.join("\n"), /missing the implemented v3-main-ci-baseline quality gate/);
  assert.match(errors.join("\n"), /missing the implemented v3-package-module-contracts quality gate/);
  assert.match(errors.join("\n"), /missing the implemented v3-framework-neutral-core quality gate/);
  assert.match(errors.join("\n"), /missing the implemented v3-binding-singleton-contract quality gate/);
  assert.match(errors.join("\n"), /missing the implemented v3-example-coverage-contract quality gate/);
  assert.match(errors.join("\n"), /missing the implemented v3-a2ui-protocol-bridge quality gate/);
});

test("coverage fails closed when packed-package evidence or command drifts", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  const packageGate = candidate.qualityGates.find(
    ({ id }) => id === "release.packages.packed-module-contracts",
  );
  packageGate.command = "pnpm run build";
  packageGate.policies = [];
  packageGate.evidence.push("evidence/does-not-exist.json");
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /missing the implemented v3-package-module-contracts quality gate/);

  packageGate.command = "pnpm run verify:package-contracts";
  const pathErrors = validateReleaseCoverage(baseline, candidate);
  assert.match(pathErrors.join("\n"), /authoritative release contract/);
  assert.match(pathErrors.join("\n"), /references missing path evidence\/does-not-exist\.json/);
});

test("coverage fails closed when framework-neutral evidence or command drifts", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  const coreGate = candidate.qualityGates.find(
    ({ id }) => id === "release.core.framework-neutral",
  );
  coreGate.command = "pnpm run build";
  coreGate.policies = [];
  coreGate.evidence.push("evidence/missing-core-report.json");
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /missing the implemented v3-framework-neutral-core quality gate/);

  coreGate.command = "pnpm run verify:framework-neutral-core";
  const pathErrors = validateReleaseCoverage(baseline, candidate);
  assert.match(pathErrors.join("\n"), /v3-framework-neutral-core must reference the authoritative release contract/);
  assert.match(pathErrors.join("\n"), /references missing path evidence\/missing-core-report\.json/);
});

test("coverage fails closed when binding singleton evidence or policy drifts", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  const bindingGate = candidate.qualityGates.find(
    ({ id }) => id === "release.bindings.one-core-singleton",
  );
  bindingGate.command = "pnpm run build";
  bindingGate.policies = ["release/v3-release-contract.json"];
  bindingGate.evidence.push("evidence/missing-binding-report.json");
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /missing the implemented v3-binding-singleton-contract quality gate/);

  bindingGate.command = "pnpm run verify:binding-singletons";
  const pathErrors = validateReleaseCoverage(baseline, candidate);
  assert.match(pathErrors.join("\n"), /must reference the release and fixed-package policies/);
  assert.match(pathErrors.join("\n"), /references missing path evidence\/missing-binding-report\.json/);
});

test("coverage fails closed when the shared example contract gate drifts", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  const exampleGate = candidate.qualityGates.find(
    ({ id }) => id === "release.examples.shared-semantic-contract",
  );
  exampleGate.command = "pnpm run build";
  exampleGate.policies = [];
  exampleGate.evidence.push("evidence/missing-example-contract.json");
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /missing the implemented v3-example-coverage-contract quality gate/);

  exampleGate.command = "pnpm run verify:example-coverage";
  const pathErrors = validateReleaseCoverage(baseline, candidate);
  assert.match(pathErrors.join("\n"), /must reference its release and shared contract policies/);
  assert.match(pathErrors.join("\n"), /references missing path evidence\/missing-example-contract\.json/);
});

test("coverage fails closed when the official A2UI bridge gate drifts", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  const a2uiGate = candidate.qualityGates.find(
    ({ id }) => id === "release.protocol.a2ui-official",
  );
  a2uiGate.command = "pnpm run build";
  a2uiGate.policies = [];
  a2uiGate.evidence.push("evidence/missing-a2ui-report.json");
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /missing the implemented v3-a2ui-protocol-bridge quality gate/);

  a2uiGate.command = "pnpm run verify:a2ui-bridge";
  const pathErrors = validateReleaseCoverage(baseline, candidate);
  assert.match(pathErrors.join("\n"), /must reference release and coverage policies/);
  assert.match(pathErrors.join("\n"), /references missing path evidence\/missing-a2ui-report\.json/);
});

test("coverage maps showcases and documentation to their owning changes", () => {
  const coverage = readReleaseCoverage();
  const candidate = structuredClone(coverage);
  candidate.showcases[0].change = "v3-abbreviated-name";
  candidate.documentationSite.change = "v3-docs-site";
  const errors = validateReleaseCoverage(baseline, candidate);
  assert.match(errors.join("\n"), /owning change must be v3-vite-react19-example/);
  assert.match(errors.join("\n"), /planned v3-docs-github-pages website deployment/);
});

test("verification evidence cannot confuse archive readiness with release certification", () => {
  assert.equal(gateResults.changeDisposition, "archived");
  assert.equal(gateResults.releaseDisposition, "blocked");
  assert.equal(gateResults.archive.promotedSpec, "openspec/specs/v3-release-contract/spec.md");
  assert.equal(gateResults.source.immutableSha, null);
  assert.ok(gateResults.gates.some(({ status }) => status === "fail"));
  assert.deepEqual(gateResults.manualAuthoritiesNotExercised, baseline.releaseGates.manualAuthority);
});

test("duplicate artifact identities and package coordinates are rejected", () => {
  const candidate = structuredClone(baseline);
  candidate.artifacts.push(structuredClone(candidate.artifacts[0]));
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /exactly 16 artifacts/);
  assert.match(result.errors.join("\n"), /duplicate artifact id npm-core/);
  assert.match(result.errors.join("\n"), /duplicate npm coordinate @prometheus-ags\/entity-graph-core/);
});

test("missing ownership and unsupported stability cannot pass", () => {
  const candidate = structuredClone(baseline);
  candidate.artifacts[0].owner = "";
  candidate.artifacts[1].stability = "preview";
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /owner/);
  assert.match(result.errors.join("\n"), /stability/);
});

test("the fixed npm group must match the real public workspace packages", () => {
  const candidate = structuredClone(baseline);
  candidate.versionPolicy.npm.packages.pop();
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /fixed npm package group/);
});

test("the release ESM extension matches every public package loader", () => {
  assert.equal(baseline.moduleContract.esmExtension, ".mjs");

  const candidate = structuredClone(baseline);
  candidate.moduleContract.esmExtension = ".js";
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /does not match release ESM extension \.js/);
});

test("artifact paths and manifest package names are verified", () => {
  const candidate = structuredClone(baseline);
  candidate.artifacts[0].path = "packages/not-a-real-package";
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /artifact path does not exist/);
});

test("invalid compatibility ranges are rejected", () => {
  const candidate = structuredClone(baseline);
  candidate.compatibility.node = "current-ish";
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /invalid node compatibility range/);
});

test("stable promotion keeps npm latest behind explicit approval", () => {
  const candidate = structuredClone(baseline);
  candidate.releaseGates.manualAuthority = candidate.releaseGates.manualAuthority.filter(
    (gate) => gate !== "npm-latest",
  );
  const result = validateReleaseContract(candidate);
  assert.match(result.errors.join("\n"), /npm-latest manual authority/);
});
