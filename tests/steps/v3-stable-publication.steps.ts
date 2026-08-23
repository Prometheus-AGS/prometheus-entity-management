import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AfterAll, Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

import {
  assertRcStageAuthority,
  assertStableStageAuthority,
  stageReleaseCandidate,
} from "../../scripts/release-candidate-pipeline.mjs";

type PreReport = {
  mode: string;
  result: string;
  checks: { id: string; status: string }[];
};

type StageReport = {
  status: string;
  latestUnchanged: boolean | null;
};

type Manifest = Parameters<typeof assertStableStageAuthority>[0];
type Env = Record<string, string>;

const root = process.cwd();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "v3-stable-publication-bdd-"));
const reportPath = join(temporaryDirectory, "verification.json");

const SHA = "d".repeat(40);

let report: PreReport | undefined;
let manifest: Manifest | undefined;
let env: Env | undefined;
let stageReport: StageReport | undefined;

setDefaultTimeout(120_000);

AfterAll(function () {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function ensureReport(): PreReport {
  if (report) return report;
  execFileSync(
    "node",
    [
      "scripts/verify-stable-publication.mjs",
      "--created-at",
      "2026-08-23T00:00:00.000Z",
      "--report",
      reportPath,
    ],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as PreReport;
  return report;
}

function makeManifest(): Manifest {
  return {
    source: { sha: SHA },
    release: {
      channel: "stable",
      candidateVersion: "3.0.0",
      distTag: "latest",
      stableTag: "latest",
    },
    publication: { authorized: false, latestMutationAllowed: true },
    npm: { publishOrder: ["core", "binding"] },
    artifacts: [
      {
        id: "core",
        ecosystem: "npm",
        packageName: "core",
        version: "3.0.0",
        distTag: "latest",
        internalDependencies: [],
      },
      {
        id: "binding",
        ecosystem: "npm",
        packageName: "binding",
        version: "3.0.0",
        distTag: "latest",
        internalDependencies: ["core"],
      },
    ],
  } as Manifest;
}

function makeEnv(): Env {
  return {
    GITHUB_ACTIONS: "true",
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-stable",
    PROMETHEUS_RELEASE_AUTHORITY: "stage-stable",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.example.invalid",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "oidc-token",
    GITHUB_SHA: SHA,
  };
}

function stableAdapters(promoted: boolean) {
  const before = { core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } };
  const after = promoted
    ? { core: { latest: "3.0.0" }, binding: { latest: "3.0.0" } }
    : before;
  let snapshotCalls = 0;
  return {
    assertStageAuthority: async () => ({}),
    snapshotTags: async () => structuredClone(snapshotCalls++ === 0 ? before : after),
    lookupNpmVersion: async () => null,
    stageNpm: async (artifact: { packageName: string; version: string }, candidate: { integrity: string }) => ({
      receipt: `stage-${artifact.packageName}`,
      packageName: artifact.packageName,
      version: artifact.version,
      integrity: candidate.integrity,
      stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
    }),
  };
}

const candidates = {
  core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
  binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
};

Given("the v3 stable-publication inputs are available", function () {
  for (const path of [
    "release/v3-release-contract.json",
    "release/release-candidate-policy.json",
    ".github/workflows/publish.yml",
    "RELEASING.md",
    "scripts/release-candidate-pipeline.mjs",
    "scripts/verify-stable-publication.mjs",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `missing stable-publication input ${path}`);
  }
});

When("the stable pre-publication verification executes", function () {
  ensureReport();
});

Then("the verification report passes all nine pre-publish checks", function () {
  const result = ensureReport();
  assert.equal(result.mode, "pre");
  assert.equal(result.result, "pass");
  assert.equal(result.checks.length, 9);
  for (const check of result.checks) assert.equal(check.status, "pass", check.id);
});

Given("a synthetic stable-channel manifest and npm-stable authority environment", function () {
  manifest = makeManifest();
  env = makeEnv();
});

Then("the stable authority assertion authorizes npm stable publish on latest", function () {
  assert.ok(manifest && env);
  const result = assertStableStageAuthority(manifest, env);
  assert.deepEqual(result, {
    authorizedAction: "npm stable publish",
    environment: "npm-stable",
    distTag: "latest",
  });
});

When("the environment downgrades to the RC environment and authority", function () {
  assert.ok(env);
  env = {
    ...env,
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc",
    PROMETHEUS_RELEASE_AUTHORITY: "stage-rc",
  };
});

Then("the stable authority assertion rejects it", function () {
  assert.ok(manifest && env);
  assert.throws(() => assertStableStageAuthority(manifest, env), /npm-stable environment/);
});

Then("the RC authority assertion refuses the stable-channel manifest", function () {
  assert.ok(manifest && env);
  assert.throws(() => assertRcStageAuthority(manifest, env), /stable-channel manifest/);
});

When("a synthetic stable stage completes with latest promoted", async function () {
  assert.ok(manifest);
  stageReport = (await stageReleaseCandidate(
    manifest,
    candidates,
    stableAdapters(true),
  )) as StageReport;
});

Then("the stage report completes with latestUnchanged false", function () {
  assert.ok(stageReport);
  assert.equal(stageReport.status, "complete");
  assert.equal(stageReport.latestUnchanged, false);
});

Then("a synthetic stage whose tags stay put fails the promotion assertion", async function () {
  assert.ok(manifest);
  await assert.rejects(
    stageReleaseCandidate(manifest, candidates, stableAdapters(false)),
    /stable promotion incomplete/,
  );
});
