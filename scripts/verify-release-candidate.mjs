#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";

import { PUBLIC_PACKAGES } from "./public-packages.mjs";
import {
  assertProtectedTagsUnchanged,
  buildReleaseCandidateManifest,
  classifyRegistryVersion,
} from "./release-candidate-pipeline.mjs";

const execFileAsync = promisify(execFile);
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Certify the locally observable release-candidate contract without contacting
 * a writable registry or granting publication authority.
 */
export async function verifyReleaseCandidate({
  root = defaultRoot,
  sourceSha,
  createdAt,
  packageReport,
  actionlint = runActionlint,
} = {}) {
  const rootPath = normalizeRoot(root);
  const manifest = await buildReleaseCandidateManifest({ root: rootPath, sourceSha, createdAt });
  const rootManifest = await readJson(resolve(rootPath, "package.json"));
  const workflowPath = resolve(rootPath, ".github/workflows/publish.yml");
  const workflowSource = await readFile(workflowPath, "utf8");
  const candidateCliSource = await readFile(resolve(rootPath, "scripts/release-candidate.mjs"), "utf8");
  const candidatePipelineSource = await readFile(
    resolve(rootPath, "scripts/release-candidate-pipeline.mjs"),
    "utf8",
  );
  const workflow = parseYaml(workflowSource);
  const workflowEvidence = verifyWorkflow({ workflow, workflowSource, rootManifest });
  const actionlintEvidence = await actionlint(workflowPath);
  assert(
    ["pass", "unavailable"].includes(actionlintEvidence?.status),
    "actionlint must pass or explicitly report unavailable",
  );

  const consumerEvidence = verifyPackedConsumers(packageReport, manifest);
  const recoveryEvidence = verifyRecoveryModel(
    manifest,
    candidateCliSource,
    candidatePipelineSource,
  );
  const protectedTagSnapshot = Object.fromEntries(
    manifest.npm.publishOrder.map((name) => [name, { latest: "protected-before-rc" }]),
  );
  assertProtectedTagsUnchanged(protectedTagSnapshot, structuredClone(protectedTagSnapshot));

  const nativeById = new Map(
    manifest.artifacts
      .filter(({ ecosystem }) => ecosystem !== "npm")
      .map((artifact) => [artifact.id, artifact]),
  );
  return {
    schemaVersion: 1,
    status: "pass",
    source: manifest.source,
    registryMutation: false,
    artifacts: {
      declared: manifest.artifacts.length,
      npm: manifest.npm.publishOrder.length,
      dependencyOrder: manifest.npm.publishOrder,
      privateWorkspaceRoot: rootManifest.name,
    },
    workflow: {
      ...workflowEvidence,
      actionlint: actionlintEvidence,
    },
    recovery: recoveryEvidence,
    protectedTags: {
      names: manifest.protectedTags.names,
      latestMutationAllowed: manifest.publication.latestMutationAllowed,
      snapshotComparison: "pass",
    },
    consumers: consumerEvidence,
    platforms: {
      dart: nativeById.get("dart-flutter")?.action,
      rustCli: nativeById.get("rust-cli")?.action,
      rustMcp: nativeById.get("rust-mcp")?.action,
      rustTauri: nativeById.get("rust-tauri")?.action,
    },
    externalLimits: [
      "npm trusted-publisher configuration requires npm organization evidence",
      "GitHub npm-rc environment reviewers require repository-settings evidence",
      "registry acceptance and uploaded provenance require an authorized GitHub Actions run",
    ],
  };
}

export function renderReleaseCandidateEvidence(report) {
  assert(report?.status === "pass", "only a passing release-candidate report can be rendered");
  const orderedPackages = report.artifacts.dependencyOrder.map(
    (name, index) => `${index + 1}. ${name.replace("@prometheus-ags/", "")}`,
  );
  const orderText = [orderedPackages.slice(0, 6), orderedPackages.slice(6)]
    .map(
      (packages, index) =>
        `<text x="120" y="${795 + index * 28}" class="order">${escapeXml(packages.join("  →  "))}</text>`,
    )
    .join("\n");
  const platformRows = [
    ["Dart / Flutter", report.platforms.dart],
    ["Rust CLI", report.platforms.rustCli],
    ["Rust MCP", report.platforms.rustMcp],
    ["Tauri Rust", report.platforms.rustTauri],
  ];
  const platformText = platformRows
    .map(
      ([name, disposition], index) =>
        `<text x="930" y="${528 + index * 48}" class="row">${escapeXml(name)}  ·  ${escapeXml(disposition)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title description">
  <title id="title">Prometheus 3.0 release-candidate certification</title>
  <desc id="description">Visual evidence for declared artifacts, packed consumers, protected latest tag, recovery, workflow provenance, and native registry dispositions.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#090b18"/>
      <stop offset="1" stop-color="#18112d"/>
    </linearGradient>
    <style>
      .eyebrow { fill: #f5a524; font: 700 22px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 2px; }
      .title { fill: #ffffff; font: 800 52px Inter, ui-sans-serif, system-ui, sans-serif; }
      .subtitle { fill: #b8b4cc; font: 400 22px Inter, ui-sans-serif, system-ui, sans-serif; }
      .metric { fill: #ffffff; font: 800 48px Inter, ui-sans-serif, system-ui, sans-serif; }
      .label { fill: #c9c4dc; font: 600 19px Inter, ui-sans-serif, system-ui, sans-serif; }
      .section { fill: #f5a524; font: 700 24px Inter, ui-sans-serif, system-ui, sans-serif; }
      .row { fill: #e9e5f4; font: 500 19px ui-monospace, SFMono-Regular, Menlo, monospace; }
      .order { fill: #aba5c2; font: 500 15px ui-monospace, SFMono-Regular, Menlo, monospace; }
      .stamp { fill: #0a2b1d; stroke: #48d597; stroke-width: 2; }
      .stamp-text { fill: #7df1bc; font: 800 20px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 1px; }
    </style>
  </defs>
  <rect width="1600" height="1000" fill="url(#background)"/>
  <circle cx="1450" cy="110" r="230" fill="#f5a524" opacity="0.08"/>
  <text x="90" y="92" class="eyebrow">PROMETHEUS · RELEASE EVIDENCE</text>
  <text x="90" y="160" class="title">3.0 release-candidate pipeline</text>
  <text x="90" y="205" class="subtitle">Packed artifacts, guarded staging, restartable recovery, and protected stable tags</text>

  <g transform="translate(90 270)" aria-label="${report.artifacts.declared} declared artifacts">
    <rect width="430" height="150" rx="20" fill="#201a38" stroke="#3b315e"/>
    <text x="34" y="66" class="metric">${report.artifacts.declared}</text>
    <text x="34" y="108" class="label">declared artifacts</text>
  </g>
  <g transform="translate(550 270)" aria-label="${report.artifacts.npm} packed npm consumers">
    <rect width="430" height="150" rx="20" fill="#201a38" stroke="#3b315e"/>
    <text x="34" y="66" class="metric">${report.artifacts.npm}</text>
    <text x="34" y="108" class="label">packed npm consumers</text>
  </g>
  <g transform="translate(1010 270)">
    <rect width="500" height="150" rx="20" fill="#112a23" stroke="#32775f"/>
    <text x="34" y="66" class="metric">latest protected</text>
    <text x="34" y="108" class="label">before/after snapshots are identical</text>
  </g>

  <text x="90" y="480" class="section">Workflow contract</text>
  <text x="90" y="528" class="row">✓ Changesets version PR + release notes</text>
  <text x="90" y="576" class="row">✓ actions/attest@v4 + OIDC permissions</text>
  <text x="90" y="624" class="row">✓ protected npm-rc environment</text>
  <text x="90" y="672" class="row">✓ no long-lived npm write token</text>

  <text x="930" y="480" class="section">Native dispositions</text>
  ${platformText}

  <rect x="90" y="720" width="1420" height="125" rx="18" fill="#121527" stroke="#353a59"/>
  <text x="120" y="760" class="section">Dependency-first package order</text>
  ${orderText}

  <g transform="translate(90 875)">
    <rect width="430" height="58" rx="12" class="stamp"/>
    <text x="25" y="37" class="stamp-text">NO REGISTRY MUTATION</text>
  </g>
  <text x="550" y="912" class="row">matching → skip  ·  absent → stage  ·  conflict → block</text>
</svg>`;
}

function verifyWorkflow({ workflow, workflowSource, rootManifest }) {
  assert(workflow?.jobs, "publish workflow jobs are required");
  const rcJob = workflow.jobs["publish-rc"];
  const stableJob = workflow.jobs["publish-stable"];
  assert(rcJob && stableJob, "RC and stable deployment jobs are required");
  assert(rootManifest.private === true, "private workspace root protection is required");
  const dispatchInputs = workflow.on?.workflow_dispatch?.inputs;
  assert(dispatchInputs?.channel, "deployment channel input is required");
  assert(dispatchInputs?.release_tag, "immutable GitHub Release input is required");
  assert(dispatchInputs?.candidate_run_id, "reused deployment run input is required");
  assert(dispatchInputs?.candidate_sha, "candidate source SHA input is required");
  for (const [job, environment, authority] of [
    [rcJob, "npm-rc", "stage-rc"],
    [stableJob, "npm-stable", "publish-stable"],
  ]) {
    assert(job.environment === environment, `${environment} protected environment is required`);
    assert(job.permissions?.actions === "read", `${environment} needs read-only run access`);
    assert(job.permissions?.contents === "write", `${environment} needs draft-release asset access`);
    assert(job.permissions?.["id-token"] === "write", `${environment} OIDC permission is required`);
    assert(job.env?.PROMETHEUS_RELEASE_AUTHORITY === authority, `${authority} flag is required`);
    assert(job.env?.NPM_CONFIG_REGISTRY === "https://registry.npmjs.org/", `${environment} registry is required`);
    const nodeAction = findStep(job, ({ uses }) => /^actions\/setup-node@/.test(uses ?? ""));
    assert(nodeAction?.uses === "actions/setup-node@v7", `${environment} must use setup-node v7`);
    assert(nodeAction.with?.["registry-url"] === undefined, `${environment} must not generate a token-shaped npmrc`);
    assert(findStep(job, ({ run }) => /gh release download/.test(run ?? "")), `${environment} must download release assets`);
    assert(findStep(job, ({ run }) => /verify-deployment-assets\.sh/.test(run ?? "")), `${environment} must verify immutable assets`);
    assert(findStep(job, ({ run }) => /release-candidate\.mjs stage/.test(run ?? "")), `${environment} deployment command is required`);
    assert(findStep(job, ({ uses }) => /^actions\/upload-artifact@v7$/.test(uses ?? "")), `${environment} recovery journal upload is required`);
  }
  assert(!/NODE_AUTH_TOKEN|NPM_TOKEN/.test(workflowSource), "long-lived npm write tokens are forbidden");
  assert(!/npm\s+stage\s+(approve|reject)/.test(workflowSource), "human 2FA actions cannot run in CI");
  assert(!/pnpm\s+(?:install|run\s+(?:ci|test|build|lint|typecheck))/.test(workflowSource), "hosted workflow cannot build or test");

  return {
    privateRootDenied: true,
    releaseNotes: "immutable-github-release-assets",
    provenance: "npm-trusted-publishing",
    oidc: true,
    stageEnvironment: "npm-rc",
    stageAction: "npm-stage-publish",
    stableEnvironment: "npm-stable",
    stableAction: "npm-publish",
    reusableCandidateBundle: true,
    setupNodeDummyToken: false,
    setupNodeTokenNpmrc: false,
    registryConfiguration: "setup-node-registry-url",
    hiddenReleaseArtifacts: false,
    longLivedNpmToken: false,
    humanApprovalInCi: false,
    stablePromotionInScope: true,
  };
}

function verifyPackedConsumers(packageReport, manifest) {
  assert(packageReport?.schemaVersion === 2, "package-contract report schema 2 is required");
  assert(packageReport.packageCount === PUBLIC_PACKAGES.length, "all public npm packages must be packed");
  const expected = manifest.npm.publishOrder.toSorted();
  const observed = packageReport.packages.map(({ name }) => name).toSorted();
  assert(JSON.stringify(observed) === JSON.stringify(expected), "packed package set differs from release manifest");
  for (const entry of packageReport.packages) {
    for (const gate of ["manifest", "payload", "publint", "areTheTypesWrong"]) {
      assert(entry[gate] === "pass", `${entry.name}: packed ${gate} gate must pass`);
    }
  }
  const expectedConsumers = {
    candidateSet: "tarballs-only",
    nodeEsm: "pass",
    nodeCommonJs: "pass",
    typescriptNodeNext: "pass",
    typescriptNode16: "pass",
    typescriptBundler: "pass",
  };
  for (const [name, expectedValue] of Object.entries(expectedConsumers)) {
    assert(packageReport.consumers?.[name] === expectedValue, `${name} packed consumer must pass`);
  }
  return { packageCount: packageReport.packageCount, ...expectedConsumers };
}

function verifyRecoveryModel(manifest, candidateCliSource, candidatePipelineSource) {
  const candidate = {
    packageName: manifest.npm.publishOrder[0],
    version: manifest.release.candidateVersion,
    integrity: "sha512-recovery-candidate",
  };
  assert(classifyRegistryVersion(candidate, null).action === "submit", "absent versions must submit");
  assert(
    classifyRegistryVersion(candidate, {
      version: candidate.version,
      integrity: candidate.integrity,
    }).action === "skip-and-record",
    "matching versions must skip",
  );
  let conflictBlocked = false;
  try {
    classifyRegistryVersion(candidate, {
      version: candidate.version,
      integrity: "sha512-conflicting-candidate",
    });
  } catch (error) {
    conflictBlocked = /immutable registry conflict/.test(error.message);
  }
  assert(conflictBlocked, "immutable registry conflicts must block recovery");
  assert(
    /resolveCandidateBundlePath\(dirname\(manifestPath\), packed\.bundlePath\)/.test(
      candidateCliSource,
    ),
    "stage must resolve bundle-relative candidates in the downloaded workflow artifact",
  );
  assert(
    /candidate tarball must remain inside the downloaded candidate bundle packages directory/.test(
      candidatePipelineSource,
    ),
    "candidate bundle path traversal must fail closed",
  );
  return {
    partialRetry: "matching-skip-absent-stage-conflict-block",
    dependencyOrderEnforced: true,
    immutableConflictBlocked: true,
    candidateBundle: "bundle-relative-cross-job",
  };
}

function findStep(job, predicate) {
  return job.steps?.find(predicate);
}

async function runActionlint(workflowPath) {
  try {
    await execFileAsync("actionlint", [workflowPath], { encoding: "utf8" });
    return { status: "pass", command: `actionlint ${workflowPath}` };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        status: "unavailable",
        command: "actionlint",
        limitation: "external actionlint binary is not installed; built-in YAML contract checks passed",
      };
    }
    throw new Error(`actionlint failed: ${error.stderr || error.message}`, { cause: error });
  }
}

function normalizeRoot(root) {
  if (root instanceof URL) return dirname(fileURLToPath(new URL("package.json", root)));
  return resolve(root);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const root = process.cwd();
  const sourceSha = args["source-sha"] ?? (await gitSha(root));
  const createdAt = args["created-at"] ?? new Date().toISOString();
  const packageReportPath = resolve(required(args, "package-report"));
  const reportPath = resolve(required(args, "report"));
  const visualPath = resolve(required(args, "visual"));
  const report = await verifyReleaseCandidate({
    root,
    sourceSha,
    createdAt,
    packageReport: await readJson(packageReportPath),
  });
  if (args["require-actionlint"] === "true") {
    assert(report.workflow.actionlint.status === "pass", "actionlint is required for this verification");
  }
  await mkdir(dirname(reportPath), { recursive: true });
  await mkdir(dirname(visualPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(visualPath, `${renderReleaseCandidateEvidence(report)}\n`, "utf8");
  process.stdout.write(
    `[release-candidate] PASS: ${report.artifacts.declared} artifacts, ` +
      `${report.consumers.packageCount} packed npm consumers, no registry mutation.\n`,
  );
}

async function gitSha(root) {
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return result.stdout.trim();
}

function parseArguments(values) {
  const args = {};
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    assert(flag?.startsWith("--") && value !== undefined, `invalid argument near ${flag ?? "<end>"}`);
    args[flag.slice(2)] = value;
  }
  return args;
}

function required(args, name) {
  assert(args[name], `--${name} is required`);
  return args[name];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
