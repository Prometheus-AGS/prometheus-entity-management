import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AfterAll, Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

import {
  readExampleCoverage,
  readScenarioContract,
  validateExampleCoverage,
  validateScenarioContract,
} from "../../scripts/verify-example-coverage.mjs";

type Evidence = {
  status: string;
  command?: string;
  paths?: string[];
};

type VerificationReport = {
  summary: {
    scenarios: number;
    scenariosPassed: number;
    capabilities: number;
    stableArtifacts: number;
    showcases: number;
    overallCoverageStatus: string;
    releaseCertified: boolean;
  };
  scenarioResults: Record<string, { status: string }>;
  errors: string[];
};

const root = process.cwd();
const reportDirectory = mkdtempSync(join(tmpdir(), "example-coverage-bdd-"));
const reportPath = join(reportDirectory, "report.json");
let report: VerificationReport | undefined;
let mutationErrors: Record<string, string[]> = {};

setDefaultTimeout(120_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync("pnpm", ["run", "verify:example-coverage", "--", "--report", reportPath], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

function implementEvidence(evidence: Evidence): void {
  evidence.status = "implemented";
  evidence.command = "pnpm run verify:example-coverage";
  evidence.paths = ["examples/shared/scenario-contract.json"];
}

AfterAll(function () {
  rmSync(reportDirectory, { recursive: true, force: true });
});

Given("the shared example coverage verifier is available", function () {
  assert.equal(existsSync(join(root, "scripts", "verify-example-coverage.mjs")), true);
  assert.equal(existsSync(join(root, "examples", "shared", "scenario-contract.json")), true);
});

When("the shared example contract is verified", function () {
  ensureReport();
});

Then("all thirteen semantic scenarios pass", function () {
  const result = ensureReport();
  assert.equal(result.summary.scenarios, 13);
  assert.equal(result.summary.scenariosPassed, 13);
  assert.ok(Object.values(result.scenarioResults).every(({ status }) => status === "pass"));
  assert.deepEqual(result.errors, []);
});

Then("the domain contains Project, User, Task, Comment, and Activity exactly once", function () {
  const contract = readScenarioContract();
  assert.deepEqual(
    contract.domain.entityTypes.map(({ id }: { id: string }) => id).sort(),
    ["Activity", "Comment", "Project", "Task", "User"],
  );
});

Then("all eight transport fixtures are deterministic and keyless", function () {
  const transports = readScenarioContract().transports;
  assert.equal(transports.length, 8);
  assert.ok(transports.every(({ deterministic }: { deterministic: boolean }) => deterministic));
  assert.ok(transports.every(({ externalCredentials }: { externalCredentials: boolean }) => !externalCredentials));
});

Then("every shared list contains known entity IDs only", function () {
  const contract = readScenarioContract();
  assert.deepEqual(validateScenarioContract(contract), []);
  const ids = new Set<string>(
    Object.values(contract.domain.seed).flatMap((entities) =>
      (entities as Array<{ id: string }>).map(({ id }) => id),
    ),
  );
  for (const entries of Object.values(contract.domain.lists)) {
    assert.ok((entries as string[]).every((id) => typeof id === "string" && ids.has(id)));
  }
});

Then("all sixteen stable capabilities have runnable semantic evidence", function () {
  const coverage = readExampleCoverage();
  assert.equal(coverage.capabilities.length, 16);
  for (const capability of coverage.capabilities) {
    assert.ok(
      capability.runnableEvidence.some(
        ({ kind, status, command }: { kind: string; status: string; command?: string }) =>
          kind === "semantic" && status === "implemented" && command === "pnpm run verify:example-coverage",
      ),
      capability.id,
    );
  }
});

Then("all sixteen stable release artifacts are mapped", function () {
  assert.equal(ensureReport().summary.stableArtifacts, 16);
  const mapped = new Set(
    readExampleCoverage().capabilities.flatMap(({ artifactIds }: { artifactIds: string[] }) => artifactIds),
  );
  assert.equal(mapped.size, 16);
});

Then("every scenario and capability mapping links in both directions", function () {
  const contract = readScenarioContract();
  const coverage = readExampleCoverage();
  assert.deepEqual(validateExampleCoverage(coverage, contract), []);
});

Then("all five showcase applications reference shared scenarios", function () {
  const coverage = readExampleCoverage();
  assert.equal(coverage.showcases.length, 5);
  assert.deepEqual(
    coverage.showcases.map(({ id }: { id: string }) => id).sort(),
    ["agentic-a2ui", "flutter-riverpod", "nextjs", "react-19-vite-8", "tauri-desktop-mobile"],
  );
  assert.ok(coverage.showcases.every(({ scenarioIds }: { scenarioIds: string[] }) => scenarioIds.length >= 3));
});

Then("the coverage ledger registers the implemented shared contract gate", function () {
  const gate = readExampleCoverage().qualityGates.find(
    ({ id }: { id: string }) => id === "release.examples.shared-semantic-contract",
  );
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-example-coverage-contract");
  assert.equal(gate.feature, "tests/features/release/v3-example-coverage-contract.feature");
  assert.equal(gate.command, "pnpm run verify:example-coverage");
});

Given("adversarial example coverage mutations", function () {
  const contract = readScenarioContract();
  const coverage = readExampleCoverage();

  const stale = structuredClone(coverage);
  stale.capabilities[0].scenarioIds[0] = "example.stale-scenario";

  const artifact = structuredClone(coverage);
  for (const capability of artifact.capabilities) {
    capability.artifactIds = capability.artifactIds.filter((id: string) => id !== "npm-core");
  }

  const command = structuredClone(coverage);
  command.capabilities[0].runnableEvidence[0].command = "pnpm run build";
  const path = structuredClone(coverage);
  path.capabilities[0].runnableEvidence[0].paths.push("evidence/does-not-exist.json");

  const nondeterministic = structuredClone(contract);
  nondeterministic.transports[0].deterministic = false;
  const tenant = structuredClone(contract);
  tenant.domain.seed.Task[0].tenantId = "tenant-cross-boundary";

  mutationErrors = {
    stale: validateExampleCoverage(stale, contract),
    artifact: validateExampleCoverage(artifact, contract),
    command: validateExampleCoverage(command, contract),
    path: validateExampleCoverage(path, contract),
    nondeterministic: validateScenarioContract(nondeterministic),
    tenant: validateScenarioContract(tenant),
  };
});

When("the mutated contracts are validated", function () {
  assert.equal(Object.keys(mutationErrors).length, 6);
});

Then("stale scenario mappings are rejected", function () {
  assert.match(mutationErrors.stale.join("\n"), /unknown scenario example\.stale-scenario/);
});

Then("missing stable artifact mappings are rejected", function () {
  assert.match(mutationErrors.artifact.join("\n"), /stable artifact npm-core has no capability mapping/);
});

Then("wrong evidence commands and missing paths are rejected", function () {
  assert.match(mutationErrors.command.join("\n"), /missing runnable semantic evidence/);
  assert.match(mutationErrors.path.join("\n"), /implemented evidence path is missing or empty/);
});

Then("nondeterministic or cross-tenant fixtures are rejected", function () {
  assert.match(mutationErrors.nondeterministic.join("\n"), /deterministic and keyless/);
  assert.match(mutationErrors.tenant.join("\n"), /tenant does not match/);
});

Then("the overall example coverage remains in progress", function () {
  assert.equal(ensureReport().summary.overallCoverageStatus, "in-progress");
});

Then("React Vite is implemented while the other showcase evidence stays planned", function () {
  for (const showcase of readExampleCoverage().showcases) {
    const expectedStatus = showcase.id === "react-19-vite-8" ? "implemented" : "planned";
    assert.equal(showcase.status, expectedStatus);
    assert.equal(showcase.runtimeEvidence.status, expectedStatus);
    assert.equal(showcase.visualEvidence.status, expectedStatus);
    assert.equal(showcase.runtimeEvidence.ownerChange, showcase.change);
    assert.equal(showcase.visualEvidence.ownerChange, showcase.change);
    if (expectedStatus === "implemented") {
      assert.equal(showcase.runtimeEvidence.command, "pnpm run verify:vite-react19");
      assert.equal(showcase.visualEvidence.command, "pnpm run verify:vite-react19");
      assert.ok(showcase.runtimeEvidence.paths?.length);
      assert.ok(showcase.visualEvidence.paths?.length);
    }
  }
});

Then("this headless contract does not claim release certification or visual evidence", function () {
  assert.equal(ensureReport().summary.releaseCertified, false);
  const readme = readFileSync(join(root, "examples", "shared", "README.md"), "utf8");
  assert.match(readme, /does \*\*not\*\* certify/);
  assert.match(readme, /React, Next\.js, A2UI, Flutter, or Tauri/);
  assert.match(readme, /runtime, platform, accessibility, and truthful visual evidence/);
});

Then("a complete state is accepted only after all release and showcase evidence is implemented", function () {
  const contract = readScenarioContract();
  const premature = structuredClone(readExampleCoverage());
  premature.status = "complete";
  assert.match(validateExampleCoverage(premature, contract).join("\n"), /cannot be complete/);

  const complete = structuredClone(readExampleCoverage());
  complete.status = "complete";
  for (const capability of complete.capabilities) {
    for (const evidence of capability.releaseEvidence) implementEvidence(evidence);
  }
  for (const showcase of complete.showcases) {
    showcase.status = "implemented";
    implementEvidence(showcase.runtimeEvidence);
    implementEvidence(showcase.visualEvidence);
  }
  assert.deepEqual(validateExampleCoverage(complete, contract), []);
});

Then("release documentation and skills teach the shared contract evidence boundary", function () {
  const paths = [
    "README.md",
    "RELEASING.md",
    "examples/README.md",
    "release/README.md",
    "prometheus-entity-skills/SKILL.md",
    "prometheus-entity-skills/SKILLS.md",
    "prometheus-entity-skills/_shared/references/v3-release-contract.md",
    "prometheus-entity-skills/_shared/references/example-coverage-contract.md",
  ];
  for (const path of paths) {
    const source = readFileSync(join(root, path), "utf8");
    assert.match(source, /shared example contract|example coverage|shared semantic contract/i, path);
  }
  const reference = readFileSync(
    join(root, "prometheus-entity-skills", "_shared", "references", "example-coverage-contract.md"),
    "utf8",
  );
  assert.match(reference, /pnpm run verify:example-coverage/);
  assert.match(reference, /does not prove that a showcase implements the behavior/);
  assert.match(reference, /does not add or change a package runtime export/);
});
