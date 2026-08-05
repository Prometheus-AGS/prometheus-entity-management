import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {PUBLIC_PACKAGES} from "../../scripts/public-packages.mjs";
import {
  assertExactTrust,
  DIRECT_PERMISSION,
  loadAuthorityManifest,
  parseTrustOutput,
  sanitizeNpmError,
  STAGE_PERMISSION,
  validateAuthorityManifest,
} from "../../scripts/npm-trust.mjs";

test("authority manifest covers exactly the twelve public npm packages", async () => {
  const manifest = validateAuthorityManifest(await loadAuthorityManifest());
  assert.equal(manifest.packages.length, 12);
  assert.deepEqual(new Set(manifest.packages), new Set(PUBLIC_PACKAGES.map(({name}) => name)));
  assert.equal(manifest.permissions.directPublish, false);
  assert.equal(manifest.permissions.stagePublish, true);
});

test("exact GitHub stage-only authority passes", async () => {
  const manifest = await loadAuthorityManifest();
  const response = parseTrustOutput(JSON.stringify({
    id: "trust-1",
    type: "github",
    repository: manifest.repository,
    file: manifest.workflowFile,
    environment: manifest.environment,
    permissions: [STAGE_PERMISSION],
  }), "pkg");
  assert.deepEqual(assertExactTrust("pkg", response, manifest), {
    packageName: "pkg",
    trustId: "trust-1",
    verified: true,
  });
});

test("incorrect claims and direct publish permission fail closed", async () => {
  const manifest = await loadAuthorityManifest();
  const base = {
    id: "trust-1",
    type: "github",
    repository: manifest.repository,
    file: manifest.workflowFile,
    environment: manifest.environment,
    permissions: [STAGE_PERMISSION],
  };
  assert.throws(() => assertExactTrust("pkg", {...base, file: "other.yml"}, manifest), /workflow claim/);
  assert.throws(
    () => assertExactTrust("pkg", {...base, permissions: [STAGE_PERMISSION, DIRECT_PERMISSION]}, manifest),
    /direct publish authority/,
  );
  assert.throws(() => assertExactTrust("pkg", [base, base], manifest), /exactly one/);
});

test("stage workflow is OIDC-only without a generated token-shaped npmrc", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8");
  const stage = workflow.slice(workflow.indexOf("  stage:"));
  assert.match(stage, /actions\/setup-node@v7/);
  assert.match(stage, /NPM_CONFIG_REGISTRY: https:\/\/registry\.npmjs\.org\//);
  assert.match(stage, /id-token: write/);
  assert.doesNotMatch(stage, /registry-url:/);
  assert.doesNotMatch(stage, /secrets\.(?:NPM_TOKEN|NODE_AUTH_TOKEN)/);
});

test("operator diagnostics remove local npm log paths", () => {
  const sanitized = sanitizeNpmError(
    "npm warn Unknown env config store-dir\nnpm notice auth change\nnpm error E403\nnpm error A complete log can be found in: /Users/operator/.npm/_logs/debug.log",
  );
  assert.equal(sanitized, "npm error E403");
});
