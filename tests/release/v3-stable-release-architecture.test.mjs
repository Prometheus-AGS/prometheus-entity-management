import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertStableStageAuthority,
  buildReleaseCandidateManifest,
  validatePublishedNpmResult,
} from "../../scripts/release-candidate-pipeline.mjs";

const root = new URL("../..", import.meta.url);
const sourceSha = "0123456789abcdef0123456789abcdef01234567";

test("stable manifest has a separate direct-publish authority contract", async () => {
  const manifest = await buildReleaseCandidateManifest({
    root,
    sourceSha,
    createdAt: "2026-08-23T18:30:00.000Z",
  });
  const contract = JSON.parse(await readFile(new URL("../../release/v3-release-contract.json", import.meta.url), "utf8"));

  assert.equal(manifest.release.channel, "stable");
  assert.equal(manifest.release.distTag, "latest");
  assert.equal(manifest.publication.action, "publish-stable");
  assert.equal(manifest.publication.authorityEnvironment, "npm-stable");
  assert.equal(manifest.publication.allowedCommand, "npm publish");
  assert.equal(manifest.publication.latestMutationAllowed, true);
  assert.equal(manifest.publication.sourceSha, sourceSha);
  assert.equal(manifest.npm.action, "publish-stable");
  assert.ok(manifest.artifacts.filter(({ ecosystem }) => ecosystem === "npm").every(
    ({ action, distTag, version }) => action === "publish-stable" && distTag === "latest" && version === contract.release.version,
  ));
});

test("stable authority requires OIDC, exact source, and no long-lived token", () => {
  const manifest = {
    source: { sha: sourceSha },
    release: { channel: "stable", distTag: "latest", stableTag: "latest" },
    publication: { action: "publish-stable", latestMutationAllowed: true },
  };
  const env = {
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: sourceSha,
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-stable",
    PROMETHEUS_RELEASE_AUTHORITY: "publish-stable",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.invalid/request",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "ephemeral",
  };
  assert.deepEqual(assertStableStageAuthority(manifest, env), {
    authorizedAction: "npm publish",
    environment: "npm-stable",
    distTag: "latest",
    sourceSha,
  });
  assert.throws(() => assertStableStageAuthority(manifest, { ...env, NPM_TOKEN: "forbidden" }), /long-lived/);
  assert.throws(() => assertStableStageAuthority(manifest, { ...env, GITHUB_SHA: "f".repeat(40) }), /workflow SHA/);
});

test("stable result validation rejects RC stage identifiers", () => {
  const candidate = {
    packageName: "@prometheus-ags/entity-graph-core",
    version: "3.0.0",
    integrity: "sha512-certified",
  };
  const result = {
    ...candidate,
    receipt: "npm-publish-receipt",
  };
  assert.deepEqual(validatePublishedNpmResult(candidate, result), result);
  assert.throws(
    () => validatePublishedNpmResult(candidate, { ...result, stageId: "2e227719-6f83-4ccb-8a61-041a96518779" }),
    /must not return an RC stageId/,
  );
});

test("hosted publication workflow is deployment-only and preserves candidate reuse", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8");
  assert.match(workflow, /candidate_run_id/);
  assert.match(workflow, /candidate_sha/);
  assert.match(workflow, /environment: npm-stable/);
  assert.match(workflow, /PROMETHEUS_RELEASE_AUTHORITY: publish-stable/);
  assert.doesNotMatch(workflow, /pnpm (?:install|run (?:ci|test|build|lint|typecheck))/);
  assert.doesNotMatch(workflow, /npm (?:test|run (?:test|build|lint))/);
});
