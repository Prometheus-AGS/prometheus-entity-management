#!/usr/bin/env node
//
// verify-stable-publication.mjs — v3-stable-publication
//
// Two modes:
//   pre-publish (default, offline): certifies that stable promotion machinery,
//   policy, workflow guards, and the sealed certification bundle are in place
//   while the release disposition remains blocked.
//   live (--live): post-publish smoke — every declared npm artifact resolves
//   from the public registry at the exact stable version and npm latest points
//   at it. Network access required; run only after the stable stage completes.

import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parse as parseYaml } from "yaml";

import {
  buildReleaseCandidateManifest,
  assertReleaseCandidateVersion,
  assertStableStageAuthority,
  assertStableTagsPromoted,
} from "./release-candidate-pipeline.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function verifyStablePublicationPre({
  root = defaultRoot,
  sourceSha = "0".repeat(40),
  createdAt = new Date().toISOString(),
} = {}) {
  const contract = await readJson(resolve(root, "release/v3-release-contract.json"));
  const policy = await readJson(resolve(root, "release/release-candidate-policy.json"));
  const gateResults = await readJson(
    resolve(
      root,
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/gate-results.json",
    ),
  );
  const bundleManifest = await readJson(
    resolve(
      root,
      ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-certification/bundle/manifest.json",
    ),
  );
  const workflowSource = await readFile(resolve(root, ".github/workflows/publish.yml"), "utf8");
  const workflow = parseYaml(workflowSource);
  const releasingGuide = await readFile(resolve(root, "RELEASING.md"), "utf8");

  const checks = [];
  const targetVersion = contract.release.version;
  const check = (id, fn) => {
    fn();
    checks.push({ id, status: "pass" });
  };

  check("policy-stable-promotion", () => {
    const stable = policy.stablePromotion ?? {};
    assert(stable.change === "v3-stable-publication", "stable promotion must belong to v3-stable-publication");
    assert(stable.requiresExplicitHumanAuthority === true, "stable promotion requires human authority");
    assert(stable.channel === "stable", "stable promotion channel must be stable");
    assert(stable.npmAction === "publish-stable", "stable promotion action must be publish-stable");
    assert(stable.environment === "npm-stable", "stable promotion environment must be npm-stable");
    assert(stable.allowedAction === "npm publish", "stable promotion must use direct npm publish");
    assert(policy.candidate.publicationAuthorized === false, "policy cannot pre-authorize publication");
    assert(policy.candidate.latestMutationAllowed === false, "policy cannot pre-authorize latest mutation");
  });

  check("contract-version-set", () => {
    assert(/^3\.\d+\.\d+$/.test(targetVersion), "release version must be a stable 3.x release");
    assert(contract.versionPolicy.npm.strategy === "fixed", "npm strategy must be fixed");
    assert(contract.versionPolicy.npm.version === targetVersion, "npm version must match release version");
    assert(contract.versionPolicy.npm.stableTag === "latest", "stable tag must be latest");
    assert(contract.versionPolicy.npm.prereleaseTag !== "latest", "prerelease tag must differ");
    assert(contract.versionPolicy.npm.packages.length === 12, "exactly twelve npm packages");
    const deferred = contract.artifacts.filter(
      ({ registryDecision }) => registryDecision !== "required",
    );
    assert(deferred.length === 4, "dart/rust-cli/rust-mcp deferred and rust-tauri embedded recorded");
  });

  check("version-assertion-stable-branch", () => {
    assertReleaseCandidateVersion(targetVersion, targetVersion, "stable");
    for (const bad of [`${targetVersion}-rc.1`, "3.0.0", `${targetVersion}-alpha.0`]) {
      if (bad === targetVersion) continue;
      let threw = false;
      try {
        assertReleaseCandidateVersion(targetVersion, bad, "stable");
      } catch {
        threw = true;
      }
      assert(threw, `stable channel must reject ${bad}`);
    }
  });

  check("workflow-stable-guards", () => {
    const jobs = workflow.jobs ?? {};
    const stableJob = jobs["publish-stable"];
    assert(stableJob, "publish.yml must define a publish-stable job");
    assert(stableJob.environment === "npm-stable", "publish-stable must use the npm-stable environment");
    assert(
      stableJob.permissions?.["id-token"] === "write",
      "publish-stable requires OIDC id-token permission",
    );
    assert(
      stableJob.env?.PROMETHEUS_RELEASE_AUTHORITY === "publish-stable",
      "publish-stable authority flag is required",
    );
    assert(
      JSON.stringify(stableJob).includes("verify-deployment-assets.sh"),
      "publish-stable must verify immutable local assets",
    );
    assert(
      !/pnpm\s+(?:install|run\s+(?:ci|test|build|lint|typecheck))/.test(workflowSource),
      "hosted publication workflow must not build or test",
    );
    const modeInput = workflow.on?.workflow_dispatch?.inputs?.channel;
    assert(
      modeInput?.options?.includes("stable"),
      "workflow_dispatch channel input must offer stable",
    );
  });

  check("authority-boundary-stable", () => {
    const manifest = {
      source: { sha: sourceSha },
      release: { channel: "stable", distTag: "latest", stableTag: "latest" },
      publication: { action: "publish-stable", latestMutationAllowed: true },
    };
    const baseEnv = {
      GITHUB_ACTIONS: "true",
      PROMETHEUS_RELEASE_ENVIRONMENT: "npm-stable",
      PROMETHEUS_RELEASE_AUTHORITY: "publish-stable",
      ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token",
      GITHUB_SHA: sourceSha,
    };
    assertStableStageAuthority(manifest, baseEnv);
    for (const [label, env] of [
      ["rc authority", { ...baseEnv, PROMETHEUS_RELEASE_AUTHORITY: "stage-rc" }],
      ["rc environment", { ...baseEnv, PROMETHEUS_RELEASE_ENVIRONMENT: "npm-rc" }],
      ["long-lived token", { ...baseEnv, NODE_AUTH_TOKEN: "npm_xxx" }],
      ["missing OIDC", { ...baseEnv, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "" }],
    ]) {
      let threw = false;
      try {
        assertStableStageAuthority(manifest, env);
      } catch {
        threw = true;
      }
      assert(threw, `stable authority must reject ${label}`);
    }
    let rcManifestThrew = false;
    try {
      assertStableStageAuthority(
        { ...manifest, release: { ...manifest.release, channel: "rc", distTag: "next" } },
        baseEnv,
      );
    } catch {
      rcManifestThrew = true;
    }
    assert(rcManifestThrew, "stable authority must reject an rc-channel manifest");
  });

  check("tag-promotion-guard", () => {
    assertStableTagsPromoted(
      { core: { latest: "3.0.0-alpha.0" } },
      { core: { latest: "3.0.0" } },
      "3.0.0",
    );
    let threw = false;
    try {
      assertStableTagsPromoted(
        { core: { latest: "3.0.0-alpha.0" } },
        { core: { latest: "3.0.0-rc.1" } },
        "3.0.0",
      );
    } catch {
      threw = true;
    }
    assert(threw, "tag promotion must reject a latest tag left behind");
  });

  check("certification-bundle-sealed", () => {
    assert(bundleManifest.schema === "prometheus.release-certification/v1", "bundle schema mismatch");
    assert(bundleManifest.verdict === "complete", "certification bundle must be sealed complete");
    assert(bundleManifest.failClosed === true, "bundle must be fail-closed");
    assert(/^[0-9a-f]{40}$/.test(bundleManifest.sourceSha), "bundle must bind one source SHA");
  });

  check("release-disposition-blocked-pre-publish", () => {
    assert(
      gateResults.releaseDisposition === "blocked",
      "release disposition must remain blocked until publication completes",
    );
  });

  check("recovery-and-exclusions-documented", () => {
    assert(/publish-corrective-version/.test(JSON.stringify(policy.recovery)), "recovery policy documented");
    assert(/npm-stable/.test(releasingGuide) || /publish-stable/.test(releasingGuide), "RELEASING.md must document the stable promotion path");
  });

  return {
    schemaVersion: "1.0.0",
    mode: "pre",
    result: "pass",
    checkedAt: createdAt,
    sourceSha,
    targetVersion,
    packages: contract.versionPolicy.npm.packages,
    checks,
    excludedRegistries: contract.artifacts
      .filter(({ registryDecision }) => registryDecision !== "required")
      .map(({ id, ecosystem, registryDecision }) => ({ id, ecosystem, registryDecision })),
  };
}

export async function verifyStablePublicationLive({
  root = defaultRoot,
  runView,
  createdAt = new Date().toISOString(),
} = {}) {
  const contract = await readJson(resolve(root, "release/v3-release-contract.json"));
  const target = contract.release.version;
  const packages = contract.versionPolicy.npm.packages;
  assert(typeof runView === "function", "live mode requires a runView(packageName, args) executor");

  const results = [];
  for (const packageName of packages) {
    const versionInfo = await runView(packageName, ["view", `${packageName}@${target}`, "version", "--json"]);
    assert(
      versionInfo === target,
      `${packageName}@${target} does not resolve from the public registry`,
    );
    const distTags = await runView(packageName, ["view", packageName, "dist-tags", "--json"]);
    assert(
      distTags?.latest === target,
      `${packageName}: npm latest is ${distTags?.latest ?? "missing"}, expected ${target}`,
    );
    results.push({ packageName, version: versionInfo, latest: distTags.latest });
  }

  return {
    schemaVersion: "1.0.0",
    mode: "live",
    result: "pass",
    checkedAt: createdAt,
    targetVersion: target,
    packages: results,
    stableArtifactsResolved: results.length,
  };
}

function parseArguments(list) {
  const result = {};
  for (let index = 0; index < list.length; index += 2) {
    const flag = list[index];
    const value = list[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument sequence near ${flag ?? "<end>"}`);
    }
    result[flag.slice(2)] = value;
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const { writeFile, mkdir } = await import("node:fs/promises");
  const reportPath = args.report ? resolve(args.report) : null;

  let report;
  if (args.live === "true") {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const runView = async (packageName, commandArgs) => {
      // Registry reads must not inherit this pnpm workspace's `devEngines`
      // policy; npm enforces it before executing even a read-only `npm view`.
      const { stdout } = await execFileAsync("npm", commandArgs, {
        encoding: "utf8",
        cwd: tmpdir(),
      });
      return JSON.parse(stdout);
    };
    report = await verifyStablePublicationLive({ runView });
  } else {
    report = await verifyStablePublicationPre({
      sourceSha: args["source-sha"],
      createdAt: args["created-at"],
    });
  }
  if (reportPath) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(
    `stable-publication ${report.mode} verification: ${report.result} (${report.checks?.length ?? report.stableArtifactsResolved} checks)\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
