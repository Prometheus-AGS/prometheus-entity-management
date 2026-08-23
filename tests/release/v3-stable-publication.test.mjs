import assert from "node:assert/strict";
import { test } from "node:test";

const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
const {
  assertReleaseCandidateVersion,
  assertRcStageAuthority,
  assertStableStageAuthority,
  assertStageAuthorityForChannel,
  assertStableTagsPromoted,
  stageReleaseCandidate,
} = pipeline;

const STABLE_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function stableManifest(releaseOverrides = {}) {
  return {
    source: { sha: STABLE_SHA },
    release: {
      channel: "stable",
      candidateVersion: "3.0.0",
      distTag: "latest",
      stableTag: "latest",
      ...releaseOverrides,
    },
    publication: { authorized: false, action: "publish-stable", latestMutationAllowed: true },
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
  };
}

function stableEnv(overrides = {}) {
  return {
    GITHUB_ACTIONS: "true",
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-stable",
    PROMETHEUS_RELEASE_AUTHORITY: "publish-stable",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.example.invalid",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "oidc-token",
    GITHUB_SHA: STABLE_SHA,
    ...overrides,
  };
}

test("release policy declares the stable-promotion boundary explicitly", async () => {
  const { readFile } = await import("node:fs/promises");
  const policy = JSON.parse(await readFile("release/release-candidate-policy.json", "utf8"));
  const stable = policy.stablePromotion;
  assert.equal(stable.change, "v3-stable-publication");
  assert.equal(stable.requiresExplicitHumanAuthority, true);
  assert.equal(stable.channel, "stable");
  assert.equal(stable.npmAction, "publish-stable");
  assert.equal(stable.allowedAction, "npm publish");
  assert.equal(stable.environment, "npm-stable");
  assert.equal(policy.candidate.publicationAuthorized, false);
  assert.equal(policy.candidate.latestMutationAllowed, false);
});

test("stable channel version assertion accepts only the exact target version", () => {
  assert.equal(assertReleaseCandidateVersion("3.0.0", "3.0.0", "stable"), "3.0.0");
  for (const bad of ["3.0.0-rc.1", "3.0.1", "3.0.0-alpha.0", "2.9.9"]) {
    assert.throws(() => assertReleaseCandidateVersion("3.0.0", bad, "stable"), /stable candidate version/);
  }
  // Non-stable channels keep the numbered-prerelease rule.
  assert.equal(assertReleaseCandidateVersion("3.0.0", "3.0.0-rc.1", "rc"), "3.0.0-rc.1");
  assert.throws(() => assertReleaseCandidateVersion("3.0.0", "3.0.0", "rc"), /numbered rc prerelease/);
});

test("stable stage authority passes at the real boundary", () => {
  const result = assertStableStageAuthority(stableManifest(), stableEnv());
  assert.deepEqual(result, {
    authorizedAction: "npm publish",
    environment: "npm-stable",
    distTag: "latest",
    sourceSha: STABLE_SHA,
  });
});

test("stable stage authority rejects a non-stable manifest", () => {
  const manifest = stableManifest({
    channel: "rc", candidateVersion: "3.0.0-rc.1", distTag: "next",
  });
  assert.throws(() => assertStableStageAuthority(manifest, stableEnv()), /stable-channel manifest/);
});

test("stable stage authority rejects the RC environment", () => {
  assert.throws(
    () => assertStableStageAuthority(stableManifest(), stableEnv({ PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc" })),
    /npm-stable environment/,
  );
});

test("stable stage authority rejects RC authority flags", () => {
  assert.throws(
    () => assertStableStageAuthority(stableManifest(), stableEnv({ PROMETHEUS_RELEASE_AUTHORITY: "stage-rc" })),
    /publish-stable authority/,
  );
});

test("stable stage authority rejects long-lived npm tokens", () => {
  assert.throws(
    () => assertStableStageAuthority(stableManifest(), stableEnv({ NODE_AUTH_TOKEN: "npm_xxx" })),
    /long-lived npm write tokens are forbidden/,
  );
  assert.throws(
    () => assertStableStageAuthority(stableManifest(), stableEnv({ NPM_TOKEN: "npm_xxx" })),
    /long-lived npm write tokens are forbidden/,
  );
});

test("stable stage authority rejects a manifest that does not target latest exactly", () => {
  const manifest = stableManifest({ distTag: "next" });
  assert.throws(() => assertStableStageAuthority(manifest, stableEnv()), /must target npm latest exactly/);
});

test("stable stage authority rejects a workflow SHA that differs from the manifest", () => {
  assert.throws(
    () => assertStableStageAuthority(stableManifest(), stableEnv({ GITHUB_SHA: "b".repeat(40) })),
    /workflow SHA does not match the stable manifest/,
  );
});

test("RC authority refuses a stable-channel manifest outright", () => {
  const env = stableEnv({
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc",
    PROMETHEUS_RELEASE_AUTHORITY: "stage-rc",
  });
  assert.throws(() => assertRcStageAuthority(stableManifest(), env), /RC staging cannot use a stable-channel manifest/);
});

test("stage authority dispatches by channel", () => {
  const stable = assertStageAuthorityForChannel(stableManifest(), stableEnv());
  assert.equal(stable.environment, "npm-stable");
  const rcManifest = stableManifest({ channel: "rc", candidateVersion: "3.0.0-rc.1", distTag: "next" });
  rcManifest.publication.latestMutationAllowed = false;
  const rc = assertStageAuthorityForChannel(
    rcManifest,
    stableEnv({ PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc", PROMETHEUS_RELEASE_AUTHORITY: "stage-rc" }),
  );
  assert.equal(rc.environment, "npm-rc");
});

test("stable tag promotion requires every package latest to equal the target", () => {
  const before = { core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } };
  const after = { core: { latest: "3.0.0" }, binding: { latest: "3.0.0" } };
  assertStableTagsPromoted(before, after, "3.0.0");

  assert.throws(
    () => assertStableTagsPromoted(before, { core: { latest: "3.0.0" }, binding: { latest: "2.2.0" } }, "3.0.0"),
    /stable promotion incomplete: binding/,
  );
  assert.throws(
    () => assertStableTagsPromoted(before, { core: { latest: "3.0.0" } }, "3.0.0"),
    /cannot add or remove packages/,
  );
  assert.throws(
    () => assertStableTagsPromoted(before, after, "3.0.0-rc.1"),
    /exact stable version/,
  );
});

test("stable staging publishes every package and verifies latest promotion", async () => {
  const manifest = stableManifest();
  const candidates = {
    core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
    binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
  };
  const staged = [];
  const before = { core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } };
  const after = { core: { latest: "3.0.0" }, binding: { latest: "3.0.0" } };
  let snapshotCalls = 0;

  const result = await stageReleaseCandidate(manifest, candidates, {
    assertStageAuthority: async (m) => assertStableStageAuthority(m, stableEnv()),
    snapshotTags: async () => structuredClone(snapshotCalls++ === 0 ? before : after),
    lookupNpmVersion: async () => null,
    stageNpm: async (artifact, candidate) => {
      staged.push(artifact.packageName);
      return {
        receipt: `publish-${artifact.packageName}`,
        packageName: artifact.packageName,
        version: artifact.version,
        integrity: candidate.integrity,
      };
    },
  });

  assert.deepEqual(staged, ["core", "binding"]);
  assert.equal(result.status, "complete");
  assert.equal(result.latestUnchanged, false);
  assert.equal(result.journal.artifacts.core.state, "complete");
  assert.equal(result.journal.artifacts.binding.state, "complete");
});

test("stable staging skips packages already at the target with matching integrity", async () => {
  const manifest = stableManifest();
  const candidates = {
    core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
    binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
  };
  const staged = [];
  const before = { core: { latest: "3.0.0" }, binding: { latest: "2.2.0" } };
  const after = { core: { latest: "3.0.0" }, binding: { latest: "3.0.0" } };
  let snapshotCalls = 0;

  const result = await stageReleaseCandidate(manifest, candidates, {
    assertStageAuthority: async () => ({}),
    snapshotTags: async () => structuredClone(snapshotCalls++ === 0 ? before : after),
    lookupNpmVersion: async (artifact) =>
      artifact.packageName === "core"
        ? { version: artifact.version, integrity: "sha512-core" }
        : null,
    stageNpm: async (artifact, candidate) => {
      staged.push(artifact.packageName);
      return {
        receipt: `publish-${artifact.packageName}`,
        packageName: artifact.packageName,
        version: artifact.version,
        integrity: candidate.integrity,
      };
    },
  });

  assert.deepEqual(staged, ["binding"]);
  assert.equal(result.status, "complete");
  assert.equal(
    result.journal.artifacts.core.history.find(({ state }) => state === "submitted").evidence.outcome,
    "skipped-matching",
  );
});

test("stable staging blocks on an immutable registry conflict", async () => {
  const manifest = stableManifest();
  const candidates = {
    core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
    binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
  };
  await assert.rejects(
    stageReleaseCandidate(manifest, candidates, {
      assertStageAuthority: async () => ({}),
      snapshotTags: async () => ({ core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } }),
      lookupNpmVersion: async (artifact) =>
        artifact.packageName === "core"
          ? { version: artifact.version, integrity: "sha512-DIFFERENT" }
          : null,
      stageNpm: async () => {
        throw new Error("stageNpm must not run after a conflict");
      },
    }),
    /immutable registry conflict for core@3\.0\.0/,
  );
});

test("stable staging fails when latest was not actually promoted", async () => {
  const manifest = stableManifest();
  const candidates = {
    core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
    binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
  };
  const tags = { core: { latest: "2.2.0" }, binding: { latest: "2.2.0" } };
  await assert.rejects(
    stageReleaseCandidate(manifest, candidates, {
      assertStageAuthority: async () => ({}),
      snapshotTags: async () => structuredClone(tags),
      lookupNpmVersion: async () => null,
      stageNpm: async (artifact, candidate) => ({
        receipt: `publish-${artifact.packageName}`,
        packageName: artifact.packageName,
        version: artifact.version,
        integrity: candidate.integrity,
      }),
    }),
    /stable promotion incomplete/,
  );
});

test("stable publication pre verification passes against the certified workspace", async () => {
  const { verifyStablePublicationPre } = await import("../../scripts/verify-stable-publication.mjs");
  const report = await verifyStablePublicationPre({ createdAt: "2026-08-23T00:00:00.000Z" });
  assert.equal(report.mode, "pre");
  assert.equal(report.result, "pass");
  assert.equal(report.checks.length, 9);
  for (const check of report.checks) assert.equal(check.status, "pass", check.id);
});

test("stable publication live verification confirms registry state via runView", async () => {
  const { verifyStablePublicationLive } = await import("../../scripts/verify-stable-publication.mjs");
  const calls = [];
  const runView = async (packageName, args) => {
    calls.push([packageName, ...args]);
    if (args.includes("dist-tags")) return { latest: "3.0.0", next: "3.0.0-rc.1" };
    return "3.0.0";
  };
  const report = await verifyStablePublicationLive({ runView, createdAt: "2026-08-23T00:00:00.000Z" });
  assert.equal(report.result, "pass");
  assert.equal(report.targetVersion, "3.0.0");
  assert.equal(report.stableArtifactsResolved, 12);
  assert.equal(report.packages.length, 12);
  assert.equal(calls.length, 24);
});

test("stable publication live verification rejects an unpromoted latest tag", async () => {
  const { verifyStablePublicationLive } = await import("../../scripts/verify-stable-publication.mjs");
  const runView = async (packageName, args) => {
    if (args.includes("dist-tags")) {
      return packageName === "@prometheus-ags/prometheus-entity-management"
        ? { latest: "2.2.0" }
        : { latest: "3.0.0" };
    }
    return "3.0.0";
  };
  await assert.rejects(
    verifyStablePublicationLive({ runView }),
    /npm latest is 2\.2\.0, expected 3\.0\.0/,
  );
});

test("stable publication live verification rejects a missing registry version", async () => {
  const { verifyStablePublicationLive } = await import("../../scripts/verify-stable-publication.mjs");
  const runView = async (_packageName, args) => {
    if (args.includes("dist-tags")) return { latest: "3.0.0" };
    return null;
  };
  await assert.rejects(
    verifyStablePublicationLive({ runView }),
    /does not resolve from the public registry/,
  );
});
