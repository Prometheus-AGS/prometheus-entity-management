import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AfterAll, Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type ReleaseReport = {
  status: "pass";
  registryMutation: false;
  artifacts: {
    declared: number;
    npm: number;
    dependencyOrder: string[];
    privateWorkspaceRoot: string;
  };
  workflow: {
    privateRootDenied: boolean;
    releaseNotes: string;
    provenance: string;
    oidc: boolean;
    stageEnvironment: string;
    longLivedNpmToken: boolean;
    humanApprovalInCi: boolean;
  };
  recovery: {
    partialRetry: string;
    dependencyOrderEnforced: boolean;
    immutableConflictBlocked: boolean;
    candidateBundle: string;
  };
  protectedTags: {
    latestMutationAllowed: boolean;
    snapshotComparison: string;
  };
  consumers: {
    packageCount: number;
    candidateSet: string;
    nodeEsm: string;
    nodeCommonJs: string;
    typescriptNodeNext: string;
    typescriptNode16: string;
    typescriptBundler: string;
  };
  platforms: {
    dart: string;
    rustCli: string;
    rustMcp: string;
    rustTauri: string;
  };
  externalLimits: string[];
};

const root = process.cwd();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "prometheus-release-pipeline-bdd-"));
const packageReportPath = join(temporaryDirectory, "packed-consumers.json");
const reportPath = join(temporaryDirectory, "release-verification.json");
const visualPath = join(temporaryDirectory, "release-verification.svg");
let report: ReleaseReport | undefined;
let relocatedCandidatePath: string | undefined;
let rejectedEscapes = false;
let rcVersionRulePassed = false;
let rehearsalEvidenceRulePassed = false;
let stagedEvidenceRulePassed = false;

setDefaultTimeout(15 * 60 * 1_000);

AfterAll(function () {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function ensureReport(): ReleaseReport {
  if (report) return report;
  execFileSync(
    "pnpm",
    ["run", "verify:package-contracts", "--", "--report", packageReportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 15 * 60 * 1_000,
    },
  );
  execFileSync(
    "node",
    [
      "scripts/verify-release-candidate.mjs",
      "--source-sha",
      "0123456789abcdef0123456789abcdef01234567",
      "--created-at",
      "2026-08-02T12:00:00.000Z",
      "--package-report",
      packageReportPath,
      "--report",
      reportPath,
      "--visual",
      visualPath,
    ],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as ReleaseReport;
  return report;
}

Given("the v3 release-candidate contract and workflow are available", function () {
  for (const path of [
    "release/v3-release-contract.json",
    "release/release-candidate-policy.json",
    ".github/workflows/publish.yml",
    "scripts/release-candidate-pipeline.mjs",
    "scripts/verify-release-candidate.mjs",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `missing release input ${path}`);
  }
});

When("the release-candidate verification executes against packed consumers", function () {
  ensureReport();
});

Then("exactly sixteen declared artifacts and twelve npm packages are selected", function () {
  assert.equal(ensureReport().artifacts.declared, 16);
  assert.equal(ensureReport().artifacts.npm, 12);
});

Then("the declared artifacts are selected in dependency order", function () {
  const evidence = ensureReport();
  assert.equal(evidence.recovery.dependencyOrderEnforced, true);
  const order = evidence.artifacts.dependencyOrder;
  assert.ok(
    order.indexOf("@prometheus-ags/entity-graph-core") <
      order.indexOf("@prometheus-ags/prometheus-entity-management"),
  );
});

Then("the private workspace root cannot be published", function () {
  const evidence = ensureReport();
  assert.equal(evidence.workflow.privateRootDenied, true);
  assert.equal(evidence.artifacts.privateWorkspaceRoot, "@prometheus-ags/entity-graph-workspace");
  assert.equal(evidence.artifacts.dependencyOrder.includes(evidence.artifacts.privateWorkspaceRoot), false);
});

Then("the workflow preserves release notes and provenance", function () {
  assert.equal(ensureReport().workflow.releaseNotes, "changesets-version-pr");
  assert.equal(ensureReport().workflow.provenance, "actions-attest-v4");
});

Then("staging requires OIDC and the protected npm-rc environment", function () {
  assert.equal(ensureReport().workflow.oidc, true);
  assert.equal(ensureReport().workflow.stageEnvironment, "npm-rc");
});

Then("the stage runtime verifies authority before registry access", async function () {
  const { stageReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const networkReads: string[] = [];
  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.1", distTag: "next", stableTag: "latest" },
    publication: { latestMutationAllowed: false },
    npm: { publishOrder: ["core"] },
    artifacts: [
      {
        id: "npm-core",
        ecosystem: "npm",
        packageName: "core",
        version: "3.0.0-rc.1",
        internalDependencies: [],
      },
    ],
  };
  await assert.rejects(
    stageReleaseCandidate(
      manifest,
      { core: { path: "/candidate/core.tgz", integrity: "sha512-core" } },
      {
        assertStageAuthority: () => {
          throw new Error("stage authority denied");
        },
        snapshotTags: async () => {
          networkReads.push("snapshot");
          return { core: { latest: "2.2.0" } };
        },
        lookupNpmVersion: async () => {
          networkReads.push("lookup");
          return { version: "3.0.0-rc.1", integrity: "sha512-core" };
        },
        stageNpm: async () => {
          throw new Error("stage must not run");
        },
      },
    ),
    /stage authority denied/,
  );
  assert.deepEqual(networkReads, []);
});

Then("no long-lived npm write token or automated human approval is present", function () {
  assert.equal(ensureReport().workflow.longLivedNpmToken, false);
  assert.equal(ensureReport().workflow.humanApprovalInCi, false);
});

Then("pnpm forwards release arguments without a literal separator", function () {
  for (const path of [
    ".github/workflows/publish.yml",
    "release/release-candidate-pipeline.md",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(
      source,
      /pnpm run release:rc:(?:plan|rehearse|stage)\s+--\s*(?:\\|\n)/,
      `${path} forwards a literal -- to release-candidate.mjs`,
    );
  }
});

Then("a rehearsal cannot move latest", function () {
  assert.equal(ensureReport().protectedTags.latestMutationAllowed, false);
  assert.equal(ensureReport().protectedTags.snapshotComparison, "pass");
});

Then("the certification records no registry mutation", function () {
  assert.equal(ensureReport().registryMutation, false);
});

When("candidate version rules are evaluated", async function () {
  const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(typeof pipeline.assertReleaseCandidateVersion, "function");
  assert.equal(
    pipeline.assertReleaseCandidateVersion("3.0.0", "3.0.0-rc.1", "rc"),
    "3.0.0-rc.1",
  );
  assert.throws(
    () => pipeline.assertReleaseCandidateVersion("3.0.0", "3.0.0-alpha.0", "rc"),
    /must use a numbered rc prerelease/,
  );
  rcVersionRulePassed = true;
});

Then("alpha prereleases are rejected and numbered rc prereleases are accepted", function () {
  assert.equal(rcVersionRulePassed, true);
});

When("release candidate staging evidence rules are evaluated", async function () {
  const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(typeof pipeline.validateRehearsalForStaging, "function");
  assert.equal(typeof pipeline.validateStagedNpmResult, "function");

  const manifest = {
    schemaVersion: "1.0.0",
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.1", distTag: "next" },
    npm: { publishOrder: ["core"] },
    protectedTags: { names: ["latest"] },
    artifacts: [
      {
        id: "npm-core",
        ecosystem: "npm",
        packageName: "core",
        version: "3.0.0-rc.1",
        action: "stage-rc",
        internalDependencies: [],
      },
      {
        id: "dart-flutter",
        ecosystem: "dart",
        packageName: "flutter",
        action: "dry-run-only",
      },
      {
        id: "rust-tauri",
        ecosystem: "rust",
        packageName: "tauri",
        action: "embedded-in-npm",
      },
    ],
  };
  const rehearsal = {
    schemaVersion: "1.0.0",
    registryMutation: false,
    protectedTags: {
      before: { core: { latest: "2.2.0" } },
      after: { core: { latest: "2.2.0" } },
      unchanged: true,
    },
    journal: {
      schemaVersion: "1.0.0",
      sourceSha: manifest.source.sha,
      candidateVersion: manifest.release.candidateVersion,
      distTag: manifest.release.distTag,
      order: ["core"],
      artifacts: {
        core: {
          id: "npm-core",
          packageName: "core",
          dependencies: [],
          state: "complete",
          history: [
            { state: "declared", evidence: { sourceSha: manifest.source.sha } },
            { state: "packed", evidence: { bundlePath: "packages/core.tgz", integrity: "sha512-core" } },
            { state: "verified", evidence: { gate: "npm-publish-dry-run", receipt: "dry-core" } },
            { state: "classified", evidence: { classification: "absent", scope: "disposable-dry-run-registry" } },
            { state: "submitted", evidence: { outcome: "dry-run-no-upload", receipt: "dry-core" } },
            { state: "registry-verified", evidence: { registryIntegrity: "sha512-core", registry: "disposable-dry-run-registry" } },
            { state: "complete", evidence: { receipt: "dry-core" } },
          ],
        },
      },
    },
    receipts: [
      { id: "npm-core", receipt: "dry-core", integrity: "sha512-core" },
      { id: "dart-flutter", receipt: "dry-dart" },
    ],
    skipped: [{ id: "rust-tauri", reason: "embedded-in-npm" }],
  };

  assert.doesNotThrow(() => pipeline.validateRehearsalForStaging(manifest, rehearsal));
  const forged = structuredClone(rehearsal);
  forged.journal.artifacts.core.history[2].evidence.gate = "forged-gate";
  assert.throws(
    () => pipeline.validateRehearsalForStaging(manifest, forged),
    /npm-publish-dry-run/,
  );
  rehearsalEvidenceRulePassed = true;

  assert.deepEqual(
    pipeline.validateStagedNpmResult(
      { packageName: "core", version: "3.0.0-rc.1", integrity: "sha512-core" },
      {
        packageName: "core",
        version: "3.0.0-rc.1",
        integrity: "sha512-core",
        stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
        receipt: "stage-core",
      },
    ),
    {
      packageName: "core",
      version: "3.0.0-rc.1",
      integrity: "sha512-core",
      stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
      receipt: "stage-core",
    },
  );
  assert.throws(
    () =>
      pipeline.validateStagedNpmResult(
        { packageName: "core", version: "3.0.0-rc.1", integrity: "sha512-core" },
        { packageName: "core", version: "3.0.0-rc.1", integrity: "sha512-core", receipt: "stage-core" },
      ),
    /stageId/,
  );
  stagedEvidenceRulePassed = true;
});

Then("incomplete or forged rehearsal reports are rejected", function () {
  assert.equal(rehearsalEvidenceRulePassed, true);
});

Then("staged packages require npm stage identifiers and matching integrity", function () {
  assert.equal(stagedEvidenceRulePassed, true);
});

Then("a partial staging failure is safely retryable", function () {
  assert.equal(
    ensureReport().recovery.partialRetry,
    "matching-skip-absent-stage-conflict-block",
  );
});

Then("exact npm view integrity fields are decoded", async function () {
  const { createReleaseCommandAdapters } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const adapters = createReleaseCommandAdapters({
    root,
    candidateDirectory: join(temporaryDirectory, "npm-view-shape"),
    runCommand: async () => ({
      stdout: JSON.stringify({
        version: "3.0.0-rc.1",
        "dist.integrity": "sha512-registry",
      }),
      stderr: "",
      code: 0,
    }),
  });
  assert.deepEqual(
    await adapters.lookupNpmVersion({
      packageName: "@prometheus-ags/example",
      version: "3.0.0-rc.1",
    }),
    { version: "3.0.0-rc.1", integrity: "sha512-registry" },
  );
});

Then("absent npm versions are decoded from JSON or plain-text errors", async function () {
  const { createReleaseCommandAdapters } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const responses = [
    {
      code: 1,
      stdout: JSON.stringify({ error: { code: "E404" } }),
      stderr: "",
    },
    {
      code: 1,
      stdout: "",
      stderr: "npm error code E404\nnpm error 404 No match found for version 3.0.0-rc.1",
    },
  ];
  const adapters = createReleaseCommandAdapters({
    root,
    candidateDirectory: join(temporaryDirectory, "npm-view-absence"),
    runCommand: async () => responses.shift(),
  });
  const artifact = {
    packageName: "@prometheus-ags/example",
    version: "3.0.0-rc.1",
  };
  assert.equal(await adapters.lookupNpmVersion(artifact), null);
  assert.equal(await adapters.lookupNpmVersion(artifact), null);
});

Then("partial stage errors preserve the recovery journal", async function () {
  const { stageReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const progress: Array<Record<string, unknown>> = [];
  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.1", distTag: "next", stableTag: "latest" },
    publication: { latestMutationAllowed: false },
    npm: { publishOrder: ["core", "binding"] },
    artifacts: [
      { id: "core", ecosystem: "npm", packageName: "core", version: "3.0.0-rc.1", internalDependencies: [] },
      { id: "binding", ecosystem: "npm", packageName: "binding", version: "3.0.0-rc.1", internalDependencies: ["core"] },
    ],
  };
  await assert.rejects(
    stageReleaseCandidate(
      manifest,
      {
        core: { path: "/candidate/core.tgz", integrity: "sha512-core" },
        binding: { path: "/candidate/binding.tgz", integrity: "sha512-binding" },
      },
      {
        assertStageAuthority: async () => true,
        snapshotTags: async () => ({ core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } }),
        lookupNpmVersion: async () => null,
        stageNpm: async (artifact: { packageName: string }, candidate: { integrity: string }) => {
          if (artifact.packageName === "binding") throw new Error("simulated partial stage failure");
          return {
            receipt: "stage-core",
            packageName: "core",
            version: "3.0.0-rc.1",
            integrity: candidate.integrity,
            stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
          };
        },
      },
      { onProgress: async (report: Record<string, unknown>) => progress.push(structuredClone(report)) },
    ),
    /simulated partial stage failure/,
  );
  const failure = progress.at(-1) as {
    status: string;
    registryMutation: boolean;
    staged: string[];
    attempts: Array<{ packageName: string; state: string }>;
    journal: { artifacts: Record<string, { state: string }> };
  };
  assert.equal(failure.status, "failed");
  assert.equal(failure.registryMutation, true);
  assert.deepEqual(failure.staged, ["core"]);
  assert.deepEqual(failure.attempts.at(-1), { packageName: "binding", state: "attempting" });
  assert.equal(failure.journal.artifacts.core.state, "complete");
  assert.equal(failure.journal.artifacts.binding.state, "classified");
});

Then("immutable registry conflicts block the release", function () {
  assert.equal(ensureReport().recovery.immutableConflictBlocked, true);
});

When(
  "a rehearsed candidate bundle is resolved in a different workflow workspace",
  async function () {
    const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
    assert.equal(typeof pipeline.resolveCandidateBundlePath, "function");
    relocatedCandidatePath = pipeline.resolveCandidateBundlePath(
      "/stage-runner/work/repo/.release-candidate",
      "packages/prometheus-ags-entity-graph-core-3.0.0-rc.0.tgz",
    );
    rejectedEscapes = ["../rehearsal-runner/core.tgz", "/rehearsal-runner/core.tgz"].every(
      (candidatePath) => {
        try {
          pipeline.resolveCandidateBundlePath(
            "/stage-runner/work/repo/.release-candidate",
            candidatePath,
          );
          return false;
        } catch (error) {
          assert.match((error as Error).message, /inside the downloaded candidate bundle/);
          return true;
        }
      },
    );
  },
);

Then("staging uses a bundle-relative tarball path", function () {
  assert.equal(
    relocatedCandidatePath,
    "/stage-runner/work/repo/.release-candidate/packages/prometheus-ags-entity-graph-core-3.0.0-rc.0.tgz",
  );
  assert.equal(ensureReport().recovery.candidateBundle, "bundle-relative-cross-job");
});

Then("candidate paths cannot escape the downloaded bundle", function () {
  assert.equal(rejectedEscapes, true);
});

Then("native registries retain explicit dispositions", function () {
  assert.deepEqual(ensureReport().platforms, {
    dart: "dry-run-only",
    rustCli: "dry-run-only",
    rustMcp: "dry-run-only",
    rustTauri: "embedded-in-npm",
  });
});

Then("packed consumers use only the candidate tarballs", function () {
  assert.equal(ensureReport().consumers.packageCount, 12);
  assert.equal(ensureReport().consumers.candidateSet, "tarballs-only");
});

Then("ESM, CommonJS, NodeNext, Node16, and Bundler consumers pass", function () {
  const consumers = ensureReport().consumers;
  for (const gate of [
    "nodeEsm",
    "nodeCommonJs",
    "typescriptNodeNext",
    "typescriptNode16",
    "typescriptBundler",
  ] as const) {
    assert.equal(consumers[gate], "pass", `${gate} did not pass`);
  }
});

Then("the release visual certifies the locally proven pipeline", function () {
  assert.equal(existsSync(visualPath), true);
  const visual = readFileSync(visualPath, "utf8");
  assert.match(visual, /16 declared artifacts/);
  assert.match(visual, /12 packed npm consumers/);
  assert.match(visual, /latest protected/);
  assert.match(visual, /NO REGISTRY MUTATION/);
});

Then("npm and GitHub configuration limits remain explicit", function () {
  const limits = ensureReport().externalLimits.join("\n");
  assert.match(limits, /trusted-publisher configuration/);
  assert.match(limits, /environment reviewers/);
  assert.match(limits, /authorized GitHub Actions run/);
});

Then("the coverage ledger declares the recoverable RC gate implemented", function () {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8")) as {
    qualityGates: Array<Record<string, unknown>>;
  };
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.pipeline.recoverable-rc",
  );
  assert.equal(gate?.status, "implemented");
  assert.equal(gate?.change, "v3-release-pipeline-rc");
  assert.equal(gate?.command, "pnpm run verify:release-pipeline");
});

Then("release guidance preserves registry and stable-promotion limits", function () {
  const guide = readFileSync(join(root, "release/release-candidate-pipeline.md"), "utf8");
  assert.match(guide, /does not authorize npm `latest`/i);
  assert.match(guide, /v3-release-certification/);
  assert.match(guide, /v3-stable-publication/);
  assert.match(guide, /cannot prove.*trusted-publisher/is);
});

Then("the Tauri public facade remains strict-consumer compatible", function () {
  const guide = readFileSync(join(root, "release/tauri-mobile-plugin.md"), "utf8");
  assert.match(guide, /generated-public\.ts/);
  assert.match(guide, /NodeNext/);
  assert.match(guide, /skipLibCheck: false/);
  const ledger = JSON.parse(
    readFileSync(
      join(root, "prometheus-entity-skills/_shared/references/tauri-library-exports.json"),
      "utf8",
    ),
  ) as { runtimeExports: string[]; declarationExports: string[] };
  assert.equal(ledger.runtimeExports.length, 26);
  assert.equal(ledger.declarationExports.length, 57);
});

Then("final evidence certifies only the release-pipeline change archive ready", function () {
  const finalPath = join(
    root,
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/final-verification.json",
  );
  const evidence = JSON.parse(readFileSync(finalPath, "utf8")) as {
    verdict: string;
    dimensions: Record<string, string>;
    changeCertified: boolean;
    fullReleaseCertified: boolean;
    publicationAuthorized: boolean;
    registryMutation: boolean;
  };
  assert.equal(evidence.verdict, "pass-change-certified-archive-ready-publication-blocked");
  assert.equal(evidence.dimensions.openSpecArchive, "ready");
  assert.equal(evidence.changeCertified, true);
  assert.equal(evidence.fullReleaseCertified, false);
  assert.equal(evidence.publicationAuthorized, false);
  assert.equal(evidence.registryMutation, false);
});

Then("downstream release certification and publication remain blocked", function () {
  const finalPath = join(
    root,
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/final-verification.json",
  );
  const evidence = JSON.parse(readFileSync(finalPath, "utf8")) as {
    unresolvedLimits: Array<{ ownerChange: string }>;
    externalAuthority: Record<string, string>;
  };
  const owners = evidence.unresolvedLimits.map(({ ownerChange }) => ownerChange);
  for (const owner of [
    "v3-release-certification",
    "v3-stable-publication",
    "v3-docs-github-pages",
  ]) {
    assert.ok(owners.includes(owner), `missing downstream owner ${owner}`);
  }
  assert.ok(
    Object.values(evidence.externalAuthority).every((status) => status === "unproven"),
  );
});

Then("the task six visual keeps release-state dimensions independent", function () {
  const visualPath = join(
    root,
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/task-6-release-disposition.svg",
  );
  const visual = readFileSync(visualPath, "utf8");
  for (const claim of [
    /RC PIPELINE\s+COMPLETE/,
    /CHANGE EVIDENCE\s+COMPLETE/,
    /OPENSPEC ARCHIVE\s+READY/,
    /FULL 3\.0 CERTIFICATION\s+PENDING/,
    /STABLE PUBLICATION\s+BLOCKED/,
    /NO PUBLIC STATE MUTATION/,
  ]) {
    assert.match(visual, claim);
  }
});
