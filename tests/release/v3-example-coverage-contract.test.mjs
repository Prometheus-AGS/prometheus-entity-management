import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  executeSharedScenarios,
  readExampleCoverage,
  readScenarioContract,
  validateExampleCoverage,
  validateScenarioContract,
  verifyExampleCoverage,
} from "../../scripts/verify-example-coverage.mjs";

const contract = readScenarioContract();
const coverage = readExampleCoverage();

function joined(errors) {
  return errors.join("\n");
}

function implementEvidence(evidence) {
  evidence.status = "implemented";
  evidence.command = "pnpm run verify:example-coverage";
  evidence.paths = ["examples/shared/scenario-contract.json"];
}

test("the checked-in semantic contract executes every required outcome", () => {
  assert.deepEqual(validateScenarioContract(contract), []);
  const execution = executeSharedScenarios(contract);
  assert.deepEqual(execution.errors, []);
  assert.equal(Object.keys(execution.results).length, 13);
  assert.ok(Object.values(execution.results).every(({ status }) => status === "pass"));

  const report = verifyExampleCoverage();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.summary, {
    scenarios: 13,
    scenariosPassed: 13,
    capabilities: 16,
    stableArtifacts: 16,
    showcases: 5,
    overallCoverageStatus: "in-progress",
    releaseCertified: false,
  });
});

test("the coverage ledger registers the shared contract as an implemented quality gate", () => {
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.examples.shared-semantic-contract",
  );
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-example-coverage-contract");
  assert.equal(gate.feature, "tests/features/release/v3-example-coverage-contract.feature");
  assert.equal(gate.command, "pnpm run verify:example-coverage");

  const missing = structuredClone(coverage);
  missing.qualityGates = missing.qualityGates.filter(({ id }) => id !== gate.id);
  assert.match(
    joined(validateExampleCoverage(missing, contract)),
    /coverage is missing the implemented v3-example-coverage-contract quality gate/,
  );

  const duplicate = structuredClone(coverage);
  duplicate.qualityGates.push(structuredClone(gate));
  assert.match(
    joined(validateExampleCoverage(duplicate, contract)),
    /coverage has duplicate quality gate release\.examples\.shared-semantic-contract/,
  );
});

test("the coverage ledger registers the official A2UI bridge as an implemented quality gate", () => {
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.protocol.a2ui-official",
  );
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-a2ui-protocol-bridge");
  assert.equal(gate.feature, "tests/features/release/v3-a2ui-protocol-bridge.feature");
  assert.equal(gate.command, "pnpm run verify:a2ui-bridge");

  const missing = structuredClone(coverage);
  missing.qualityGates = missing.qualityGates.filter(({ id }) => id !== gate.id);
  assert.match(
    joined(validateExampleCoverage(missing, contract)),
    /coverage is missing the implemented v3-a2ui-protocol-bridge quality gate/,
  );

  const drifted = structuredClone(coverage);
  drifted.qualityGates.find(({ id }) => id === gate.id).evidence.push(
    "evidence/missing-a2ui-report.json",
  );
  assert.match(
    joined(validateExampleCoverage(drifted, contract)),
    /implemented evidence path is missing or empty: evidence\/missing-a2ui-report\.json/,
  );
});

test("fixtures are exact, tenant-scoped, deterministic, keyless, and ID-normalized", () => {
  assert.deepEqual(
    contract.domain.entityTypes.map(({ id }) => id).sort(),
    ["Activity", "Comment", "Project", "Task", "User"],
  );
  const entityIds = new Set(
    Object.values(contract.domain.seed).flatMap((entities) => entities.map(({ id }) => id)),
  );
  for (const [key, ids] of Object.entries(contract.domain.lists)) {
    assert.ok(ids.every((id) => typeof id === "string" && entityIds.has(id)), key);
  }
  for (const entities of Object.values(contract.domain.seed)) {
    assert.ok(entities.every(({ tenantId }) => tenantId === contract.tenant.id));
  }
  assert.equal(contract.transports.length, 8);
  assert.ok(contract.transports.every(({ deterministic }) => deterministic));
  assert.ok(contract.transports.every(({ externalCredentials }) => !externalCredentials));
  assert.equal(contract.fixedClock, "2030-01-15T12:00:00.000Z");
});

test("scenario outcome drift fails rather than rewriting the expected contract", () => {
  const candidate = structuredClone(contract);
  const scenario = candidate.scenarios.find(({ id }) => id === "example.crud.optimistic-rollback");
  scenario.expected.afterRollback = "done";
  const result = executeSharedScenarios(candidate);
  assert.match(joined(result.errors), /actual outcome differs from contract/);
  assert.equal(result.results[scenario.id].status, "fail");
});

test("missing and stale scenario mappings fail closed in both directions", () => {
  const stale = structuredClone(coverage);
  stale.capabilities[0].scenarioIds[0] = "example.stale-scenario";
  assert.match(joined(validateExampleCoverage(stale, contract)), /unknown scenario example\.stale-scenario/);

  const missing = structuredClone(coverage);
  for (const capability of missing.capabilities) {
    capability.scenarioIds = capability.scenarioIds.filter(
      (id) => id !== "example.runtime.lifecycle-security",
    );
  }
  assert.match(
    joined(validateExampleCoverage(missing, contract)),
    /scenario example\.runtime\.lifecycle-security has no capability mapping/,
  );
});

test("every stable release artifact must remain mapped", () => {
  const candidate = structuredClone(coverage);
  for (const capability of candidate.capabilities) {
    capability.artifactIds = capability.artifactIds.filter((id) => id !== "npm-core");
  }
  assert.match(
    joined(validateExampleCoverage(candidate, contract)),
    /stable artifact npm-core has no capability mapping/,
  );
});

test("runnable semantic evidence rejects command and path drift", () => {
  const wrongCommand = structuredClone(coverage);
  wrongCommand.capabilities[0].runnableEvidence[0].command = "pnpm run build";
  assert.match(
    joined(validateExampleCoverage(wrongCommand, contract)),
    /graph\.normalized-identity: missing runnable semantic evidence/,
  );

  const missingPath = structuredClone(coverage);
  missingPath.capabilities[0].runnableEvidence[0].paths.push("evidence/does-not-exist.json");
  assert.match(
    joined(validateExampleCoverage(missingPath, contract)),
    /implemented evidence path is missing or empty: evidence\/does-not-exist\.json/,
  );

  const escapingPath = structuredClone(coverage);
  escapingPath.capabilities[0].runnableEvidence[0].paths.push("../outside-repository.json");
  assert.match(
    joined(validateExampleCoverage(escapingPath, contract)),
    /implemented evidence path escapes the repository: \.\.\/outside-repository\.json/,
  );

  const missingReport = structuredClone(coverage);
  missingReport.semanticContract.report = "evidence/does-not-exist.json";
  assert.match(
    joined(validateExampleCoverage(missingReport, contract)),
    /semantic contract report is missing or empty: evidence\/does-not-exist\.json/,
  );
});

test("the exact five showcase identities are required", () => {
  const candidate = structuredClone(coverage);
  candidate.showcases[4] = structuredClone(candidate.showcases[0]);
  assert.match(
    joined(validateExampleCoverage(candidate, contract)),
    /coverage does not match the required 3\.0 showcase ID set/,
  );
});

test("the universal Tauri ledger binds implemented platform evidence without overclaim", () => {
  const showcase = coverage.showcases.find(({ id }) => id === "tauri-desktop-mobile");
  assert.ok(showcase);
  assert.equal(showcase.path, "examples/tauri-universal");
  assert.equal(showcase.status, "implemented");
  assert.equal(showcase.runtimeEvidence.status, "implemented");
  assert.equal(showcase.visualEvidence.status, "implemented");
  assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:tauri-universal");
  assert.equal(showcase.visualEvidence.command, "pnpm run test:tauri-universal:browser");

  const offline = coverage.capabilities.find(
    ({ id }) => id === "graph.offline-persistence-sync",
  );
  const offlineEvidence = offline.releaseEvidence.find(
    ({ ownerChange }) => ownerChange === "v3-tauri-universal-example",
  );
  assert.equal(offlineEvidence.status, "implemented");
  assert.equal(offlineEvidence.command, "pnpm run verify:tauri-universal");

  const platform = coverage.capabilities.find(({ id }) => id === "platform.tauri");
  const hostEvidence = platform.releaseEvidence.find(
    ({ ownerChange, kind }) =>
      ownerChange === "v3-tauri-universal-example" && kind === "desktop",
  );
  assert.equal(hostEvidence.status, "implemented");
  assert.equal(hostEvidence.command, "pnpm run verify:tauri-universal");
});

test("invalid transports, list payloads, and tenant fixtures fail closed", () => {
  const transport = structuredClone(contract);
  transport.transports[0].deterministic = false;
  assert.match(joined(validateScenarioContract(transport)), /deterministic and keyless/);

  const list = structuredClone(contract);
  list.domain.lists["projects:active"][0] = { id: "project-atlas" };
  assert.match(joined(validateScenarioContract(list)), /lists must contain known entity IDs only/);

  const tenant = structuredClone(contract);
  tenant.domain.seed.Task[0].tenantId = "tenant-cross-boundary";
  assert.match(joined(validateScenarioContract(tenant)), /tenant does not match/);
});

test("coverage cannot claim completion until release and showcase evidence is implemented", () => {
  const premature = structuredClone(coverage);
  premature.status = "complete";
  assert.match(
    joined(validateExampleCoverage(premature, contract)),
    /coverage cannot be complete while release or showcase evidence remains incomplete/,
  );

  const dishonestShowcase = structuredClone(coverage);
  const plannedShowcase = dishonestShowcase.showcases.find(
    (showcase) => showcase.id === "tauri-desktop-mobile",
  );
  assert.ok(plannedShowcase, "the fixture must retain the Tauri showcase");
  plannedShowcase.status = "planned";
  plannedShowcase.runtimeEvidence.status = "planned";
  plannedShowcase.visualEvidence.status = "planned";
  implementEvidence(plannedShowcase.runtimeEvidence);
  assert.match(
    joined(validateExampleCoverage(dishonestShowcase, contract)),
    /planned showcases must keep runtime and visual evidence planned/,
  );

  const incompleteShowcase = structuredClone(coverage);
  const plannedIncompleteShowcase = incompleteShowcase.showcases.find(
    (showcase) => showcase.id === "tauri-desktop-mobile",
  );
  assert.ok(plannedIncompleteShowcase, "the fixture must retain the Tauri showcase");
  plannedIncompleteShowcase.runtimeEvidence.status = "planned";
  plannedIncompleteShowcase.visualEvidence.status = "planned";
  assert.match(
    joined(validateExampleCoverage(incompleteShowcase, contract)),
    /implemented showcases require implemented runtime and visual evidence/,
  );

  const dishonestPartial = structuredClone(coverage);
  const partialShowcase = dishonestPartial.showcases.find(
    (showcase) => showcase.id === "flutter-riverpod",
  );
  assert.ok(partialShowcase, "the fixture must retain the Flutter showcase");
  partialShowcase.status = "partial";
  partialShowcase.runtimeEvidence.status = "partial";
  partialShowcase.visualEvidence.status = "partial";
  partialShowcase.runtimeEvidence.status = "planned";
  assert.match(
    joined(validateExampleCoverage(dishonestPartial, contract)),
    /partial showcases require partial or implemented runtime evidence/,
  );
});

test("the validator admits a future truthful complete state", () => {
  const candidate = structuredClone(coverage);
  candidate.status = "complete";
  for (const capability of candidate.capabilities) {
    for (const evidence of capability.releaseEvidence) implementEvidence(evidence);
  }
  for (const showcase of candidate.showcases) {
    showcase.status = "implemented";
    implementEvidence(showcase.runtimeEvidence);
    implementEvidence(showcase.visualEvidence);
  }
  assert.deepEqual(validateExampleCoverage(candidate, contract), []);

  candidate.showcases[0].visualEvidence.paths = ["evidence/does-not-exist.png"];
  assert.match(
    joined(validateExampleCoverage(candidate, contract)),
    /implemented evidence path is missing or empty: evidence\/does-not-exist\.png/,
  );
});

test("malformed complete coverage returns diagnostics instead of throwing", () => {
  const candidate = structuredClone(coverage);
  candidate.status = "complete";
  for (const capability of candidate.capabilities) {
    for (const evidence of capability.releaseEvidence) implementEvidence(evidence);
  }
  delete candidate.showcases;
  let errors;
  assert.doesNotThrow(() => {
    errors = validateExampleCoverage(candidate, contract);
  });
  assert.match(joined(errors), /coverage schema/);
});

test("the rollback oracle does not hide duplicate result properties", () => {
  const source = readFileSync(
    new URL("../../scripts/verify-example-coverage.mjs", import.meta.url),
    "utf8",
  );
  const block = source.match(
    /"example\.crud\.optimistic-rollback": \(contract\) => \{([\s\S]*?)\n {2}\},\n {2}"example\.relationship\.cascade-invalidation"/,
  )?.[1];
  assert.ok(block);
  assert.equal(block.match(/patchCleared:/g)?.length, 1);
});
