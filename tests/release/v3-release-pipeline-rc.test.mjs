import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { PUBLIC_PACKAGES } from "../../scripts/public-packages.mjs";

const root = new URL("../..", import.meta.url);
const execFileAsync = promisify(execFile);

test("dependency order is deterministic and publishes prerequisites first", async () => {
  const loaded = await import("../../scripts/release-candidate-pipeline.mjs").catch(
    (error) => ({ error }),
  );
  assert.equal(
    loaded.error,
    undefined,
    `release-candidate pipeline module must load: ${loaded.error?.message}`,
  );

  const packages = [
    { name: "binding-b", internalDependencies: ["core"] },
    { name: "core", internalDependencies: [] },
    { name: "binding-a", internalDependencies: ["core"] },
  ];
  assert.deepEqual(loaded.topologicalOrder(packages), ["core", "binding-a", "binding-b"]);
  assert.throws(
    () =>
      loaded.topologicalOrder([
        { name: "a", internalDependencies: ["b"] },
        { name: "b", internalDependencies: ["a"] },
      ]),
    /dependency cycle: a, b/,
  );
});

test("a downloaded candidate bundle relocates safely between workflow jobs", async () => {
  const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(
    typeof pipeline.resolveCandidateBundlePath,
    "function",
    "the stage job needs an explicit bundle-relative path resolver",
  );

  assert.equal(
    pipeline.resolveCandidateBundlePath(
      "/stage-runner/work/repo/.release-candidate",
      "packages/prometheus-ags-entity-graph-core-3.0.0-rc.0.tgz",
    ),
    "/stage-runner/work/repo/.release-candidate/packages/prometheus-ags-entity-graph-core-3.0.0-rc.0.tgz",
  );
  assert.throws(
    () =>
      pipeline.resolveCandidateBundlePath(
        "/stage-runner/work/repo/.release-candidate",
        "../rehearsal-runner/core.tgz",
      ),
    /inside the downloaded candidate bundle/,
  );
  assert.throws(
    () =>
      pipeline.resolveCandidateBundlePath(
        "/stage-runner/work/repo/.release-candidate",
        "/rehearsal-runner/core.tgz",
      ),
    /inside the downloaded candidate bundle/,
  );
});

test("the RC staging lane rejects alpha and requires a numbered rc prerelease", async () => {
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
  assert.throws(
    () => pipeline.assertReleaseCandidateVersion("3.0.0", "3.0.0-rc", "rc"),
    /must use a numbered rc prerelease/,
  );
});

test("the checked-in rc.1 state has consumed its React showcase changeset", async () => {
  const pre = JSON.parse(
    await readFile(new URL("../../.changeset/pre.json", import.meta.url), "utf8"),
  );
  assert.equal(pre.mode, "pre");
  assert.equal(pre.tag, "rc");
  assert.ok(
    pre.changesets.includes("certify-vite-react19"),
    "the merged rc.1 source must not ask Changesets to generate an unnecessary rc.2 PR for the React showcase",
  );
});

test("the pnpm RC workflow forwards named CLI flags without a literal separator", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8");
  const guide = await readFile(
    new URL("../../release/release-candidate-pipeline.md", import.meta.url),
    "utf8",
  );
  for (const source of [workflow, guide]) {
    assert.doesNotMatch(
      source,
      /pnpm run release:rc:(?:plan|rehearse|stage)\s+--\s*(?:\\|\n)/,
      "pnpm 10 forwards the standalone separator to release-candidate.mjs",
    );
  }
});

test("the protected stage reuses a certified run without setup-node v6 token fallback", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8");
  const stage = workflow.slice(workflow.indexOf("  stage:"));
  assert.match(stage, /actions\/setup-node@v7/);
  assert.doesNotMatch(stage, /actions\/setup-node@v6/);
  assert.match(stage, /candidate_run_id/);
  assert.match(stage, /candidate_sha/);
  assert.match(stage, /Verify reused rehearsal authority/);
  assert.match(stage, /\.path == "\.github\/workflows\/publish\.yml"/);
  assert.match(stage, /\.name == "rehearse"/);
  assert.match(stage, /\.conclusion == "success"/);
  assert.match(stage, /\.expired == false/);
  assert.match(stage, /run-id: \$\{\{ \(inputs\.candidate_run_id != '' && inputs\.candidate_sha != ''\) && inputs\.candidate_run_id \|\| github\.run_id \}\}/);
  assert.match(stage, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(stage, /needs\.rehearse\.result == 'skipped'/);
});

test("the candidate manifest is contract-derived, non-mutating, and covers every ecosystem", async () => {
  const pipeline = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(
    typeof pipeline.buildReleaseCandidateManifest,
    "function",
    "buildReleaseCandidateManifest must be implemented",
  );

  const options = {
    root,
    sourceSha: "0123456789abcdef0123456789abcdef01234567",
    createdAt: "2026-08-02T12:00:00.000Z",
  };
  const manifest = await pipeline.buildReleaseCandidateManifest(options);
  const repeated = await pipeline.buildReleaseCandidateManifest(options);

  assert.deepEqual(repeated, manifest, "identical inputs must produce identical manifests");
  assert.equal(manifest.schemaVersion, "1.0.0");
  assert.equal(manifest.release.channel, "rc");
  assert.equal(manifest.release.distTag, "next");
  assert.equal(manifest.release.stableTag, "latest");
  assert.equal(manifest.publication.authorized, false);
  assert.equal(manifest.publication.latestMutationAllowed, false);
  assert.equal(manifest.artifacts.length, 16);

  const npmArtifacts = manifest.artifacts.filter(({ ecosystem }) => ecosystem === "npm");
  assert.equal(npmArtifacts.length, 12);
  assert.deepEqual(manifest.npm.publishOrder, npmArtifacts.map(({ packageName }) => packageName));
  assert.ok(
    manifest.npm.publishOrder.indexOf("@prometheus-ags/entity-graph-core") <
      manifest.npm.publishOrder.indexOf("@prometheus-ags/entity-graph-sync"),
  );
  assert.ok(
    npmArtifacts.every(
      ({ version, distTag, action }) =>
        version === "3.0.0-rc.1" && distTag === "next" && action === "stage-rc",
    ),
  );
  assert.equal(
    manifest.artifacts.some(({ packageName }) => packageName === "@prometheus-ags/entity-graph-workspace"),
    false,
  );

  const byId = new Map(manifest.artifacts.map((artifact) => [artifact.id, artifact]));
  assert.equal(byId.get("dart-flutter").action, "dry-run-only");
  assert.equal(byId.get("rust-cli").action, "dry-run-only");
  assert.equal(byId.get("rust-mcp").action, "dry-run-only");
  assert.equal(byId.get("rust-tauri").action, "embedded-in-npm");
  assert.equal(manifest.protectedTags.snapshotRequired, true);
});

test("registry recovery distinguishes absent, matching, and conflicting immutable versions", async () => {
  const { classifyRegistryVersion } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof classifyRegistryVersion, "function");
  const candidate = {
    packageName: "@prometheus-ags/example",
    version: "3.0.0-rc.0",
    integrity: "sha512-candidate",
  };

  assert.deepEqual(classifyRegistryVersion(candidate, null), {
    classification: "absent",
    action: "submit",
  });
  assert.deepEqual(
    classifyRegistryVersion(candidate, {
      version: candidate.version,
      integrity: candidate.integrity,
    }),
    { classification: "matching", action: "skip-and-record" },
  );
  assert.throws(
    () =>
      classifyRegistryVersion(candidate, {
        version: candidate.version,
        integrity: "sha512-other",
      }),
    /immutable registry conflict.*@prometheus-ags\/example@3\.0\.0-rc\.0/,
  );
  assert.throws(
    () => classifyRegistryVersion(candidate, { version: candidate.version }),
    /registry integrity is missing/,
  );
});

test("the recovery journal is restartable and enforces dependency completion", async () => {
  const {
    advanceRecoveryJournal,
    createRecoveryJournal,
  } = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(typeof createRecoveryJournal, "function");
  assert.equal(typeof advanceRecoveryJournal, "function");

  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.0", distTag: "next" },
    npm: { publishOrder: ["core", "binding"] },
    artifacts: [
      { id: "core", ecosystem: "npm", packageName: "core", internalDependencies: [] },
      {
        id: "binding",
        ecosystem: "npm",
        packageName: "binding",
        internalDependencies: ["core"],
      },
    ],
  };
  let journal = createRecoveryJournal(manifest);
  assert.deepEqual(journal.order, ["core", "binding"]);
  assert.equal(journal.artifacts.core.state, "declared");

  journal = advanceRecoveryJournal(journal, "binding", "packed", {
    integrity: "sha512-binding",
  });
  journal = advanceRecoveryJournal(journal, "binding", "verified", { gate: "package" });
  journal = advanceRecoveryJournal(journal, "binding", "classified", {
    classification: "absent",
  });
  assert.throws(
    () =>
      advanceRecoveryJournal(journal, "binding", "submitted", {
        outcome: "uploaded",
      }),
    /dependency core is not complete/,
  );

  for (const [state, evidence] of [
    ["packed", { integrity: "sha512-core" }],
    ["verified", { gate: "package" }],
    ["classified", { classification: "matching" }],
    ["submitted", { outcome: "skipped-matching" }],
    ["registry-verified", { registryIntegrity: "sha512-core" }],
    ["complete", { receipt: "registry-core" }],
  ]) {
    journal = advanceRecoveryJournal(journal, "core", state, evidence);
  }
  journal = advanceRecoveryJournal(journal, "binding", "submitted", {
    outcome: "uploaded",
  });
  assert.equal(journal.artifacts.binding.state, "submitted");
  assert.throws(
    () => advanceRecoveryJournal(journal, "binding", "complete", { receipt: "too-soon" }),
    /invalid recovery transition submitted -> complete/,
  );
});

test("latest-tag protection fails closed on changes and incomplete snapshots", async () => {
  const { assertProtectedTagsUnchanged } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof assertProtectedTagsUnchanged, "function");
  const before = {
    core: { latest: "2.2.0", alpha: "3.0.0-alpha.0" },
    binding: { latest: "3.0.0-alpha.0" },
  };
  assert.doesNotThrow(() => assertProtectedTagsUnchanged(before, structuredClone(before)));
  assert.throws(
    () =>
      assertProtectedTagsUnchanged(before, {
        ...before,
        core: { latest: "3.0.0-rc.0", next: "3.0.0-rc.0" },
      }),
    /protected npm tag changed: core latest 2\.2\.0 -> 3\.0\.0-rc\.0/,
  );
  assert.throws(
    () => assertProtectedTagsUnchanged(before, { core: before.core }),
    /protected tag snapshot missing package binding/,
  );
});

test("the rehearsal executes every artifact in declared order without registry mutation", async () => {
  const { rehearseReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof rehearseReleaseCandidate, "function");
  const events = [];
  const latest = {
    core: { latest: "2.2.0" },
    binding: { latest: "3.0.0-alpha.0" },
  };
  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.0", distTag: "next" },
    publication: { authorized: false, latestMutationAllowed: false },
    npm: { publishOrder: ["core", "binding"] },
    artifacts: [
      {
        id: "core",
        ecosystem: "npm",
        packageName: "core",
        internalDependencies: [],
        action: "stage-rc",
      },
      {
        id: "binding",
        ecosystem: "npm",
        packageName: "binding",
        internalDependencies: ["core"],
        action: "stage-rc",
      },
      {
        id: "dart",
        ecosystem: "dart",
        packageName: "dart",
        action: "dry-run-only",
      },
      {
        id: "embedded",
        ecosystem: "rust",
        packageName: "embedded",
        action: "embedded-in-npm",
      },
    ],
  };

  const result = await rehearseReleaseCandidate(manifest, {
    snapshotTags: async () => structuredClone(latest),
    packNpm: async (artifact) => {
      events.push(`pack:${artifact.packageName}`);
      return {
        path: `/tmp/${artifact.packageName}.tgz`,
        bundlePath: `packages/${artifact.packageName}.tgz`,
        integrity: `sha512-${artifact.packageName}`,
      };
    },
    dryRunNpm: async (artifact) => {
      events.push(`npm-dry-run:${artifact.packageName}`);
      return { receipt: `npm-${artifact.packageName}` };
    },
    dryRunNative: async (artifact) => {
      events.push(`native-dry-run:${artifact.packageName}`);
      return { receipt: `native-${artifact.packageName}` };
    },
  });

  assert.deepEqual(events, [
    "pack:core",
    "npm-dry-run:core",
    "pack:binding",
    "npm-dry-run:binding",
    "native-dry-run:dart",
  ]);
  assert.equal(result.registryMutation, false);
  assert.equal(result.protectedTags.unchanged, true);
  assert.equal(result.journal.artifacts.core.state, "complete");
  assert.equal(result.journal.artifacts.binding.state, "complete");
  assert.equal(
    result.journal.artifacts.core.history.find(({ state }) => state === "packed").evidence
      .bundlePath,
    "packages/core.tgz",
  );
  assert.equal(
    "path" in
      result.journal.artifacts.core.history.find(({ state }) => state === "packed").evidence,
    false,
    "the portable rehearsal journal must not retain a runner-absolute tarball path",
  );
  assert.deepEqual(result.skipped, [
    { id: "embedded", reason: "embedded-in-npm" },
  ]);
});

test("staging rejects incomplete or forged rehearsal evidence", async () => {
  const {
    rehearseReleaseCandidate,
    validateRehearsalForStaging,
  } = await import("../../scripts/release-candidate-pipeline.mjs");
  assert.equal(typeof validateRehearsalForStaging, "function");
  const latest = { core: { latest: "2.2.0" } };
  const manifest = {
    schemaVersion: "1.0.0",
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { candidateVersion: "3.0.0-rc.1", distTag: "next" },
    publication: { authorized: false, latestMutationAllowed: false },
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
  const rehearsal = await rehearseReleaseCandidate(manifest, {
    snapshotTags: async () => structuredClone(latest),
    packNpm: async () => ({
      path: "/tmp/core.tgz",
      bundlePath: "packages/core.tgz",
      integrity: "sha512-core",
    }),
    dryRunNpm: async () => ({ receipt: "dry-core" }),
    dryRunNative: async () => ({ receipt: "dry-dart" }),
  });

  assert.doesNotThrow(() => validateRehearsalForStaging(manifest, rehearsal));
  for (const mutate of [
    (candidate) => { candidate.journal.candidateVersion = "3.0.0-rc.2"; },
    (candidate) => { candidate.journal.artifacts.core.state = "verified"; },
    (candidate) => { candidate.journal.artifacts.core.history[2].evidence.gate = "forged"; },
    (candidate) => { candidate.journal.artifacts.core.history[1].evidence.integrity = "sha512-forged"; },
    (candidate) => { candidate.receipts.pop(); },
    (candidate) => { candidate.skipped = []; },
  ]) {
    const forged = structuredClone(rehearsal);
    mutate(forged);
    assert.throws(() => validateRehearsalForStaging(manifest, forged));
  }
});

test("staged npm evidence requires the registry-issued stage id and matching package integrity", async () => {
  const { validateStagedNpmResult } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof validateStagedNpmResult, "function");
  const candidate = {
    packageName: "core",
    version: "3.0.0-rc.1",
    integrity: "sha512-core",
  };
  const staged = {
    ...candidate,
    stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
    receipt: "stage-core",
  };
  assert.deepEqual(validateStagedNpmResult(candidate, staged), staged);
  for (const invalid of [
    { ...staged, stageId: undefined },
    { ...staged, integrity: undefined },
    { ...staged, integrity: "sha512-forged" },
    { ...staged, packageName: "other" },
    { ...staged, version: "3.0.0-rc.2" },
  ]) {
    assert.throws(() => validateStagedNpmResult(candidate, invalid));
  }
});

test("RC staging authority requires GitHub OIDC and can never target latest", async () => {
  const { assertRcStageAuthority } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof assertRcStageAuthority, "function");
  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { distTag: "next", stableTag: "latest" },
    publication: { authorized: false, latestMutationAllowed: false },
  };
  const env = {
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: manifest.source.sha,
    PROMETHEUS_RELEASE_AUTHORITY: "stage-rc",
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.example",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "ephemeral",
  };
  assert.deepEqual(assertRcStageAuthority(manifest, env), {
    authorizedAction: "npm stage publish",
    environment: "npm-rc",
    distTag: "next",
    sourceSha: manifest.source.sha,
  });
  assert.throws(() => assertRcStageAuthority(manifest, {}), /GitHub Actions is required/);
  assert.throws(
    () => assertRcStageAuthority(manifest, { ...env, NODE_AUTH_TOKEN: "long-lived" }),
    /long-lived npm write tokens are forbidden/,
  );
  assert.throws(
    () =>
      assertRcStageAuthority(
        { ...manifest, release: { distTag: "latest", stableTag: "latest" } },
        env,
      ),
    /RC staging cannot target npm latest/,
  );
  assert.throws(
    () => assertRcStageAuthority(manifest, { ...env, GITHUB_SHA: "f".repeat(40) }),
    /authorized candidate SHA does not match the candidate manifest/,
  );
  assert.deepEqual(
    assertRcStageAuthority(manifest, {
      ...env,
      GITHUB_SHA: "f".repeat(40),
      PROMETHEUS_RELEASE_CANDIDATE_SHA: manifest.source.sha,
    }),
    {
      authorizedAction: "npm stage publish",
      environment: "npm-rc",
      distTag: "next",
      sourceSha: manifest.source.sha,
    },
  );
  assert.throws(
    () =>
      assertRcStageAuthority(manifest, {
        ...env,
        PROMETHEUS_RELEASE_CANDIDATE_SHA: "not-a-commit",
      }),
    /authorized candidate SHA must be a full Git commit/,
  );
});

test("stage authority is checked before registry reads, including matching retries", async () => {
  const { stageReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const events = [];
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
          events.push("authority");
          throw new Error("stage authority denied");
        },
        snapshotTags: async () => {
          events.push("snapshot");
          return { core: { latest: "2.2.0" } };
        },
        lookupNpmVersion: async () => {
          events.push("lookup");
          return { version: "3.0.0-rc.1", integrity: "sha512-core" };
        },
        stageNpm: async () => {
          events.push("stage");
          throw new Error("stage must not run");
        },
      },
    ),
    /stage authority denied/,
  );
  assert.deepEqual(events, ["authority"]);
});

test("the plan CLI writes a deterministic candidate manifest and never publishes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-rc-plan-"));
  const output = join(directory, "manifest.json");
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        "scripts/release-candidate.mjs",
        "plan",
        "--source-sha",
        "0123456789abcdef0123456789abcdef01234567",
        "--created-at",
        "2026-08-02T12:00:00.000Z",
        "--output",
        output,
      ],
      { cwd: root },
    );
    assert.equal(stderr, "");
    assert.match(stdout, /candidate manifest written/);
    const manifest = JSON.parse(await readFile(output, "utf8"));
    assert.equal(manifest.publication.authorized, false);
    assert.equal(manifest.publication.latestMutationAllowed, false);
    assert.equal(manifest.npm.publishOrder.length, 12);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the stage CLI rejects incomplete rehearsal evidence before any registry command", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-rc-stage-proof-"));
  const manifestPath = join(directory, "manifest.json");
  const rehearsalPath = join(directory, "rehearsal.json");
  const outputPath = join(directory, "stage.json");
  try {
    const { buildReleaseCandidateManifest } = await import(
      "../../scripts/release-candidate-pipeline.mjs"
    );
    const manifest = await buildReleaseCandidateManifest({
      root,
      sourceSha: "0123456789abcdef0123456789abcdef01234567",
      createdAt: "2026-08-02T12:00:00.000Z",
    });
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await writeFile(
      rehearsalPath,
      `${JSON.stringify({
        schemaVersion: "1.0.0",
        registryMutation: false,
        protectedTags: { before: {}, after: {}, unchanged: true },
      })}\n`,
      "utf8",
    );
    await assert.rejects(
      execFileAsync(
        process.execPath,
        [
          "scripts/release-candidate.mjs",
          "stage",
          "--manifest",
          manifestPath,
          "--rehearsal",
          rehearsalPath,
          "--output",
          outputPath,
        ],
        { cwd: root },
      ),
      (error) => {
        assert.match(error.stderr, /protected tag snapshot|rehearsal journal schema/);
        assert.doesNotMatch(error.stderr, /GitHub Actions is required|registry lookup/);
        return true;
      },
    );
    assert.equal(existsSync(outputPath), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("command adapters use real dry-run commands and keep staging explicit", async () => {
  const { createReleaseCommandAdapters } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof createReleaseCommandAdapters, "function");
  const calls = [];
  const runCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    if (command === "npm" && args[0] === "view") {
      if (args[1].endsWith("@3.0.0-rc.0")) {
        return {
          stdout: '{"version":"3.0.0-rc.0","dist.integrity":"sha512-example"}',
          stderr: "",
          code: 0,
        };
      }
      return { stdout: '{"latest":"2.2.0","alpha":"3.0.0-alpha.0"}', stderr: "" };
    }
    if (command === "pnpm" && args.includes("pack")) {
      return {
        stdout: JSON.stringify({
          filename: "prometheus-ags-example-3.0.0-rc.0.tgz",
          integrity: "sha512-example",
        }),
        stderr: "",
      };
    }
    if (command === "npm" && args[0] === "stage") {
      return {
        stdout: JSON.stringify({
          "@prometheus-ags/example": {
            name: "@prometheus-ags/example",
            version: "3.0.0-rc.0",
            integrity: "sha512-example",
            stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
          },
        }),
        stderr: "",
      };
    }
    if (command === "cargo" && args[0] === "publish") {
      return { stdout: "", stderr: "cargo publish dry-run passed", code: 0 };
    }
    return { stdout: '{"ok":true}', stderr: "" };
  };
  const adapters = createReleaseCommandAdapters({
    root: "/workspace",
    candidateDirectory: "/workspace/.release-candidate",
    runCommand,
  });
  const manifest = {
    artifacts: [
      { ecosystem: "npm", packageName: "@prometheus-ags/example" },
    ],
  };
  assert.deepEqual(await adapters.snapshotTags(manifest), {
    "@prometheus-ags/example": { latest: "2.2.0", alpha: "3.0.0-alpha.0" },
  });
  const artifact = {
    id: "npm-example",
    ecosystem: "npm",
    packageName: "@prometheus-ags/example",
    path: "packages/example",
    distTag: "next",
  };
  const candidate = await adapters.packNpm(artifact);
  assert.equal(candidate.integrity, "sha512-example");
  assert.equal(candidate.path, "/workspace/.release-candidate/prometheus-ags-example-3.0.0-rc.0.tgz");
  await adapters.dryRunNpm(artifact, candidate);
  assert.deepEqual(
    await adapters.lookupNpmVersion({ ...artifact, version: "3.0.0-rc.0" }),
    { version: "3.0.0-rc.0", integrity: "sha512-example" },
  );
  await adapters.dryRunNative({
    id: "dart",
    ecosystem: "dart",
    path: "packages/dart",
  });
  const rustDryRun = await adapters.dryRunNative({
    id: "rust",
    ecosystem: "rust",
    path: "packages/rust",
  });
  assert.equal(rustDryRun.receipt, "cargo publish dry-run passed");

  assert.ok(
    calls.some(
      ({ command, args }) =>
        command === "npm" &&
        args[0] === "publish" &&
        args.includes("--dry-run") &&
        args.includes("next"),
    ),
  );
  assert.ok(
    calls.some(
      ({ command, args }) =>
        command === "flutter" && args.join(" ") === "pub publish --dry-run",
    ),
  );
  assert.ok(
    calls.some(
      ({ command, args }) =>
        command === "cargo" && args[0] === "publish" && args.includes("--dry-run"),
    ),
  );
  assert.equal(
    calls.some(
      ({ command, args }) =>
        command === "npm" && args[0] === "publish" && !args.includes("--dry-run"),
    ),
    false,
  );
  assert.equal(typeof adapters.stageNpm, "function");

  const stageManifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: { distTag: "next", stableTag: "latest" },
    publication: { latestMutationAllowed: false },
  };
  const stageEnvironment = {
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: stageManifest.source.sha,
    PROMETHEUS_RELEASE_AUTHORITY: "stage-rc",
    PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.example",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "ephemeral",
  };
  const stageAdapters = createReleaseCommandAdapters({
    root: "/workspace",
    candidateDirectory: "/workspace/.release-candidate",
    runCommand,
    allowMutation: true,
    env: stageEnvironment,
  });
  assert.deepEqual(
    await stageAdapters.stageNpm(artifact, candidate, stageManifest),
    {
      packageName: "@prometheus-ags/example",
      version: "3.0.0-rc.0",
      integrity: "sha512-example",
      stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
      receipt: JSON.stringify({
        "@prometheus-ags/example": {
          name: "@prometheus-ags/example",
          version: "3.0.0-rc.0",
          integrity: "sha512-example",
          stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
        },
      }),
    },
  );
  assert.ok(
    calls.some(
      ({ command, args, options }) =>
        command === "npm" &&
        args.slice(0, 2).join(" ") === "stage publish" &&
        options.mutation === true &&
        options.allowMutation === true,
    ),
  );
});

test("pnpm pack output without integrity is hashed from the produced tarball", async () => {
  const { createReleaseCommandAdapters } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const directory = await mkdtemp(join(tmpdir(), "release-pack-integrity-"));
  const candidateDirectory = join(directory, "candidate");
  const tarballName = "prometheus-ags-example-3.0.0-rc.1.tgz";
  const tarball = Buffer.from("immutable release candidate tarball", "utf8");

  try {
    await mkdir(candidateDirectory, { recursive: true });
    await writeFile(join(candidateDirectory, tarballName), tarball);
    const adapters = createReleaseCommandAdapters({
      root: directory,
      candidateDirectory,
      runCommand: async () => ({
        stdout: JSON.stringify({
          name: "@prometheus-ags/example",
          version: "3.0.0-rc.1",
          filename: join(directory, "packages/example", tarballName),
          files: [{ path: "package.json" }],
        }),
        stderr: "",
        code: 0,
      }),
    });

    const candidate = await adapters.packNpm({
      packageName: "@prometheus-ags/example",
      path: "packages/example",
    });
    assert.equal(
      candidate.integrity,
      `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("npm exact-version absence is recognized from JSON stdout and plain-text stderr", async () => {
  const { createReleaseCommandAdapters } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const artifact = {
    packageName: "@prometheus-ags/example",
    version: "3.0.0-rc.1",
  };
  const responses = [
    {
      code: 1,
      stdout: JSON.stringify({
        error: {
          code: "E404",
          summary: "No match found for version 3.0.0-rc.1",
        },
      }),
      stderr: "",
    },
    {
      code: 1,
      stdout: "",
      stderr: "npm error code E404\nnpm error 404 No match found for version 3.0.0-rc.1",
    },
  ];
  const adapters = createReleaseCommandAdapters({
    root: "/workspace",
    candidateDirectory: "/workspace/.release-candidate",
    runCommand: async () => responses.shift(),
  });

  assert.equal(await adapters.lookupNpmVersion(artifact), null);
  assert.equal(await adapters.lookupNpmVersion(artifact), null);
});

test("the process runner is shell-free, captures receipts, and blocks mislabeled mutation", async () => {
  const { runReleaseCommand } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof runReleaseCommand, "function");
  const result = await runReleaseCommand(
    process.execPath,
    ["-e", "process.stdout.write('receipt')"],
    { cwd: root, mutation: false },
  );
  assert.equal(result.stdout, "receipt");
  assert.equal(result.stderr, "");
  await assert.rejects(
    runReleaseCommand(
      process.execPath,
      ["-e", "process.stderr.write('broken'); process.exit(7)"],
      { cwd: root, mutation: false },
    ),
    /release command failed \(7\).*broken/s,
  );
  const accepted = await runReleaseCommand(
    process.execPath,
    ["-e", "process.stderr.write('not-found'); process.exit(1)"],
    { cwd: root, mutation: false, acceptedExitCodes: [1] },
  );
  assert.equal(accepted.code, 1);
  assert.equal(accepted.stderr, "not-found");
  await assert.rejects(
    runReleaseCommand("npm", ["publish", "candidate.tgz"], {
      cwd: root,
      mutation: false,
    }),
    /potentially mutating npm command was not declared as mutation/,
  );
  await assert.rejects(
    runReleaseCommand("npm", ["stage", "publish", "candidate.tgz"], {
      cwd: root,
      mutation: true,
    }),
    /mutating release command requires allowMutation/,
  );
});

test("RC staging resumes safely by skipping matching versions and staging only absent ones", async () => {
  const { stageReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  assert.equal(typeof stageReleaseCandidate, "function");
  const staged = [];
  const latest = {
    core: { latest: "2.2.0" },
    binding: { latest: "3.0.0-alpha.0" },
  };
  const manifest = {
    source: { sha: "0123456789abcdef0123456789abcdef01234567" },
    release: {
      candidateVersion: "3.0.0-rc.0",
      distTag: "next",
      stableTag: "latest",
    },
    publication: { authorized: false, latestMutationAllowed: false },
    npm: { publishOrder: ["core", "binding"] },
    artifacts: [
      {
        id: "core",
        ecosystem: "npm",
        packageName: "core",
        version: "3.0.0-rc.0",
        distTag: "next",
        internalDependencies: [],
      },
      {
        id: "binding",
        ecosystem: "npm",
        packageName: "binding",
        version: "3.0.0-rc.0",
        distTag: "next",
        internalDependencies: ["core"],
      },
    ],
  };
  const candidates = {
    core: { path: "/tmp/core.tgz", integrity: "sha512-core" },
    binding: { path: "/tmp/binding.tgz", integrity: "sha512-binding" },
  };
  const result = await stageReleaseCandidate(manifest, candidates, {
    assertStageAuthority: async () => ({ authorizedAction: "npm stage publish" }),
    snapshotTags: async () => structuredClone(latest),
    lookupNpmVersion: async (artifact) =>
      artifact.packageName === "core"
        ? { version: artifact.version, integrity: "sha512-core" }
        : null,
    stageNpm: async (artifact, candidate) => {
      staged.push(artifact.packageName);
      return {
        receipt: `stage-${artifact.packageName}`,
        packageName: artifact.packageName,
        version: artifact.version,
        integrity: candidate.integrity,
        stageId: "2e227719-6f83-4ccb-8a61-041a96518779",
      };
    },
  });

  assert.deepEqual(staged, ["binding"]);
  assert.equal(result.registryMutation, true);
  assert.equal(result.latestUnchanged, true);
  assert.equal(result.journal.artifacts.core.state, "complete");
  assert.equal(result.journal.artifacts.binding.state, "complete");
  assert.equal(
    result.journal.artifacts.core.history.find(({ state }) => state === "submitted").evidence.outcome,
    "skipped-matching",
  );
});

test("partial staging failures persist a conservative restart journal", async () => {
  const { stageReleaseCandidate } = await import(
    "../../scripts/release-candidate-pipeline.mjs"
  );
  const progress = [];
  const latest = {
    core: { latest: "2.2.0" },
    binding: { latest: "2.2.0" },
  };
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
        snapshotTags: async () => structuredClone(latest),
        lookupNpmVersion: async () => null,
        stageNpm: async (artifact, candidate) => {
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
      { onProgress: async (report) => progress.push(structuredClone(report)) },
    ),
    /simulated partial stage failure/,
  );
  const failure = progress.at(-1);
  assert.equal(failure.status, "failed");
  assert.equal(failure.registryMutation, true);
  assert.deepEqual(failure.staged, ["core"]);
  assert.deepEqual(failure.attempts.at(-1), { packageName: "binding", state: "attempting" });
  assert.equal(failure.journal.artifacts.core.state, "complete");
  assert.equal(failure.journal.artifacts.binding.state, "classified");

  const cli = await readFile(new URL("../../scripts/release-candidate.mjs", import.meta.url), "utf8");
  assert.match(cli, /onProgress:\s*async \(progressReport\).*writeJson\(output, progressReport\)/s);
  const workflow = await readFile(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8");
  assert.match(workflow, /name: Preserve the staging recovery journal\s+if:\s+\$\{\{ always\(\) \}\}/);
});

test("the release pipeline has an executable operator-facing BDD contract", async () => {
  const featurePath = new URL("../features/release/v3-release-pipeline-rc.feature", import.meta.url);
  const stepsPath = new URL("../steps/v3-release-pipeline-rc.steps.ts", import.meta.url);
  assert.equal(existsSync(featurePath), true, "release-pipeline Cucumber feature is missing");
  assert.equal(existsSync(stepsPath), true, "release-pipeline Cucumber steps are missing");

  const feature = await readFile(featurePath, "utf8");
  for (const behavior of [
    "declared artifacts are selected in dependency order",
    "the private workspace root cannot be published",
    "the workflow preserves release notes and provenance",
    "a rehearsal cannot move latest",
    "a partial staging failure is safely retryable",
    "native registries retain explicit dispositions",
    "packed consumers use only the candidate tarballs",
    "coverage and guidance expose only the implemented boundary",
    "archive readiness remains independent from stable publication",
  ]) {
    assert.match(feature, new RegExp(behavior, "i"), `missing BDD behavior: ${behavior}`);
  }
});

test("coverage, release docs, and skills expose the implemented RC boundary without claiming publication", async () => {
  const coverage = JSON.parse(
    await readFile(new URL("../../examples/coverage.json", import.meta.url), "utf8"),
  );
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.pipeline.recoverable-rc",
  );
  assert.deepEqual(
    {
      status: gate?.status,
      change: gate?.change,
      feature: gate?.feature,
      command: gate?.command,
    },
    {
      status: "implemented",
      change: "v3-release-pipeline-rc",
      feature: "tests/features/release/v3-release-pipeline-rc.feature",
      command: "pnpm run verify:release-pipeline",
    },
  );
  for (const requiredPath of [
    "release/v3-release-contract.json",
    "release/release-candidate-policy.json",
    ".github/workflows/publish.yml",
    "examples/coverage.json",
  ]) {
    assert.ok(gate.policies.includes(requiredPath), `missing RC policy ${requiredPath}`);
  }
  for (const requiredPath of [
    "release/release-candidate-pipeline.md",
    "prometheus-entity-skills/_shared/references/release-candidate-pipeline.md",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/task-3-verification.json",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/task-3-certification.svg",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/final-verification.json",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/verification.md",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/release-impact.md",
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/task-6-release-disposition.svg",
  ]) {
    assert.ok(gate.evidence.includes(requiredPath), `missing RC evidence ${requiredPath}`);
  }

  const releaseGuide = await readFile(
    new URL("../../release/release-candidate-pipeline.md", import.meta.url),
    "utf8",
  );
  assert.match(releaseGuide, /registry-issued stage\s+UUID/);
  assert.match(releaseGuide, /all seven journal states/);
  for (const claim of [
    /contract-derived candidate\s+manifest/i,
    /pnpm run verify:release-pipeline/,
    /pnpm run release:rc:rehearse/,
    /GitHub Actions OIDC/i,
    /npm-rc/,
    /matching.*skip.*absent.*stage.*conflict.*block/is,
    /Dart.*dry-run-only/is,
    /Rust.*dry-run-only/is,
    /does not authorize.*latest/is,
  ]) {
    assert.match(releaseGuide, claim);
  }

  const skillReference = await readFile(
    new URL(
      "../../prometheus-entity-skills/_shared/references/release-candidate-pipeline.md",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(skillReference, /release\.pipeline\.recoverable-rc/);
  assert.match(skillReference, /registry mutation/i);
  assert.match(skillReference, /v3-stable-publication/);

  const releaseContractReference = await readFile(
    new URL(
      "../../prometheus-entity-skills/_shared/references/v3-release-contract.md",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(releaseContractReference, /release-candidate-pipeline\.md/);
  assert.match(releaseContractReference, /verify:release-pipeline/);

  const skillIndexes = await Promise.all(
    ["SKILL.md", "SKILLS.md"].map((name) =>
      readFile(new URL(`../../prometheus-entity-skills/${name}`, import.meta.url), "utf8"),
    ),
  );
  for (const skillIndex of skillIndexes) {
    assert.match(skillIndex, /release-candidate-pipeline\.md/);
  }

  for (const path of [
    "../../release/tauri-mobile-plugin.md",
    "../../prometheus-entity-skills/_shared/references/tauri-mobile-plugin.md",
  ]) {
    const guide = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(guide, /generated-public\.ts/);
    assert.match(guide, /NodeNext/);
    assert.match(guide, /skipLibCheck/);
  }

  const tauriLedger = JSON.parse(
    await readFile(
      new URL(
        "../../prometheus-entity-skills/_shared/references/tauri-library-exports.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(tauriLedger.runtimeExports.length, 26);
  assert.equal(tauriLedger.declarationExports.length, 57);
  assert.ok(tauriLedger.runtimeExports.includes("generatedCommands"));
  assert.ok(tauriLedger.declarationExports.includes("generatedCommands"));
});

test("final evidence keeps archive readiness independent from publication authority", async () => {
  const evidenceRoot = new URL(
    "../../.kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-pipeline-rc/",
    import.meta.url,
  );
  const finalEvidence = JSON.parse(
    await readFile(new URL("final-verification.json", evidenceRoot), "utf8"),
  );
  assert.equal(finalEvidence.verdict, "pass-change-certified-archive-ready-publication-blocked");
  assert.deepEqual(finalEvidence.dimensions, {
    implementation: "complete",
    evidence: "complete",
    changeCertification: "pass",
    openSpecArchive: "ready",
    fullReleaseCertification: "pending",
    publication: "blocked",
  });
  assert.equal(finalEvidence.changeCertified, true);
  assert.equal(finalEvidence.fullReleaseCertified, false);
  assert.equal(finalEvidence.publicationAuthorized, false);
  assert.equal(finalEvidence.registryMutation, false);
  assert.equal(finalEvidence.coverage.status, "in-progress");
  assert.equal(finalEvidence.coverage.releaseCertified, false);
  assert.ok(finalEvidence.unresolvedLimits.length >= 4);
  assert.ok(
    Object.values(finalEvidence.externalAuthority).every((status) => status === "unproven"),
  );

  const verification = await readFile(new URL("verification.md", evidenceRoot), "utf8");
  const impact = await readFile(new URL("release-impact.md", evidenceRoot), "utf8");
  const visual = await readFile(new URL("task-6-release-disposition.svg", evidenceRoot), "utf8");
  assert.match(verification, /PASS — CHANGE CERTIFIED AND READY TO ARCHIVE; PUBLICATION NOT AUTHORIZED/);
  assert.match(impact, /What remains incomplete for full 3\.0/);
  assert.match(visual, /NO PUBLIC STATE MUTATION/);
});

test("the release verifier certifies workflow, packed consumers, recovery, and visual evidence", async () => {
  const loaded = await import("../../scripts/verify-release-candidate.mjs").catch(
    (error) => ({ error }),
  );
  assert.equal(
    loaded.error,
    undefined,
    `release verifier module must load: ${loaded.error?.message}`,
  );
  assert.equal(typeof loaded.verifyReleaseCandidate, "function");
  assert.equal(typeof loaded.renderReleaseCandidateEvidence, "function");

  const packageReport = {
    schemaVersion: 2,
    packageCount: 12,
    packages: PUBLIC_PACKAGES.map(({ name }) => ({
      name,
      manifest: "pass",
      payload: "pass",
      publint: "pass",
      areTheTypesWrong: "pass",
    })),
    consumers: {
      candidateSet: "tarballs-only",
      nodeEsm: "pass",
      nodeCommonJs: "pass",
      typescriptNodeNext: "pass",
      typescriptNode16: "pass",
      typescriptBundler: "pass",
    },
  };
  const report = await loaded.verifyReleaseCandidate({
    root,
    sourceSha: "0123456789abcdef0123456789abcdef01234567",
    createdAt: "2026-08-02T12:00:00.000Z",
    packageReport,
    actionlint: async () => ({ status: "pass", command: "actionlint publish.yml" }),
  });

  assert.equal(report.status, "pass");
  assert.equal(report.registryMutation, false);
  assert.equal(report.artifacts.declared, 16);
  assert.equal(report.artifacts.npm, 12);
  assert.equal(report.workflow.privateRootDenied, true);
  assert.equal(report.workflow.releaseNotes, "changesets-version-pr");
  assert.equal(report.workflow.uvRuntime, "0.12.1");
  assert.equal(report.workflow.provenance, "actions-attest-v4");
  assert.equal(report.workflow.stageEnvironment, "npm-rc");
  assert.equal(report.workflow.reusableCandidateBundle, true);
  assert.equal(report.workflow.setupNodeDummyToken, false);
  assert.equal(report.workflow.hiddenReleaseArtifacts, true);
  assert.equal(report.workflow.longLivedNpmToken, false);
  assert.equal(report.recovery.partialRetry, "matching-skip-absent-stage-conflict-block");
  assert.equal(report.recovery.candidateBundle, "bundle-relative-cross-job");
  assert.equal(report.protectedTags.latestMutationAllowed, false);
  assert.equal(report.consumers.candidateSet, "tarballs-only");
  assert.deepEqual(report.platforms, {
    dart: "dry-run-only",
    rustCli: "dry-run-only",
    rustMcp: "dry-run-only",
    rustTauri: "embedded-in-npm",
  });

  const svg = loaded.renderReleaseCandidateEvidence(report);
  assert.match(svg, /<svg/);
  assert.match(svg, /16 declared artifacts/);
  assert.match(svg, /12 packed npm consumers/);
  assert.match(svg, /latest protected/);
  assert.match(svg, /NO REGISTRY MUTATION/);
  assert.doesNotMatch(svg, /<foreignObject/);
  assert.match(svg, /entity-graph-core/);
  const nativeHeadingY = Number(
    svg.match(/<text x="930" y="(\d+)" class="section">Native dispositions<\/text>/)?.[1],
  );
  const firstNativeRowY = Number(
    svg.match(/<text x="930" y="(\d+)" class="row">Dart \/ Flutter/)?.[1],
  );
  assert.ok(firstNativeRowY >= nativeHeadingY + 48, "native rows must clear their heading");

  const rootManifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url)));
  assert.match(rootManifest.scripts["bdd:release-pipeline"], /v3-release-pipeline-rc/);
  assert.match(rootManifest.scripts["verify:release-pipeline"], /verify-release-candidate/);
  assert.match(rootManifest.scripts.test, /test:release-pipeline/);
});
