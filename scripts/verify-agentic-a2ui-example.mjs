import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const evidenceDirectory = resolve(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example",
);
const reportPath = resolve(evidenceDirectory, "task-5-verification.json");
const commands = [];

const cleanTargets = [
  "examples/agentic-a2ui-app/dist",
  "packages/entity-graph-core/dist",
  "packages/entity-graph-react/dist",
  "packages/a2ui-react/dist",
  "packages/entity-graph-a2a/dist",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/playwright-artifacts",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/playwright-report.json",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-evidence.json",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-happy-policy-approval.png",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-malformed-artifact.png",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-cancelled-task.png",
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/task-5-verification.json",
];

for (const target of cleanTargets) {
  const path = resolve(root, target);
  if (!path.startsWith(`${root}/`)) {
    throw new Error(`refusing to clean path outside the repository: ${path}`);
  }
  rmSync(path, { recursive: true, force: true });
}
mkdirSync(evidenceDirectory, { recursive: true });

run("frozen-install", "pnpm", ["install", "--frozen-lockfile"]);
run("agentic-typecheck", "pnpm", ["run", "typecheck:agentic-a2ui"]);
run("agentic-lint", "pnpm", [
  "exec",
  "eslint",
  "examples/agentic-a2ui-app/src",
  "examples/agentic-a2ui-app/vite.config.ts",
  "examples/agentic-a2ui-app/vitest.config.ts",
  "tests/browser/v3-agentic-a2ui-example.playwright.config.ts",
  "tests/browser/v3-agentic-a2ui-example.spec.ts",
  "scripts/verify-agentic-a2ui-example.mjs",
  "--max-warnings",
  "0",
]);
run("agentic-unit", "pnpm", ["run", "test:agentic-a2ui:unit"]);
run("core-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-core",
  "build",
]);
run("a2ui-atomic-message-batch", "pnpm", [
  "--filter",
  "@prometheus-ags/a2ui-react",
  "exec",
  "vitest",
  "run",
  "src/official-a2ui.test.tsx",
  "-t",
  "rejects an invalid batch without partially updating an existing surface",
]);
run("a2a-external-endpoint-policy", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-a2a",
  "exec",
  "vitest",
  "run",
  "src/a2a-server.test.ts",
  "-t",
  "plaintext external endpoints|non-HTTP schemes|credential-bearing external endpoints|allows HTTP only",
]);
run("react-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/prometheus-entity-management",
  "build",
]);
run("a2ui-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/a2ui-react",
  "build",
]);
run("a2a-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-a2a",
  "build",
]);
run("a2ui-export-ledger", "pnpm", [
  "--filter",
  "@prometheus-ags/a2ui-react",
  "run",
  "verify:skills",
]);
run("a2a-export-ledger", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-a2a",
  "run",
  "verify:skills",
]);
run("agentic-production-build", "pnpm", ["run", "build:agentic-a2ui"]);
run("agentic-production-browser", "pnpm", [
  "exec",
  "playwright",
  "test",
  "--config",
  "tests/browser/v3-agentic-a2ui-example.playwright.config.ts",
]);
writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      change: "v3-agentic-a2ui-example",
      task: 5,
      recordedAt: new Date().toISOString(),
      status: "running",
      note: "The clean verifier writes this non-passing receipt before the self-referential coverage check and overwrites it only after every gate succeeds.",
      commands,
    },
    null,
    2,
  )}\n`,
);
run("example-coverage", "pnpm", ["run", "verify:example-coverage"]);
run("example-coverage-tests", "pnpm", ["run", "test:example-coverage"]);
run("production-security-audit", "pnpm", ["run", "security:audit"]);
run("openspec-strict", "openspec", [
  "validate",
  "v3-agentic-a2ui-example",
  "--strict",
]);
run("diff-hygiene", "git", ["diff", "--check"]);

const browserEvidence = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-evidence.json",
);
const playwrightReport = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/playwright-report.json",
);
const expectedFlows = [
  "happy-policy-approval",
  "malformed-artifact",
  "cancelled-task",
];

if (browserEvidence.status !== "pass") {
  throw new Error(`browser evidence status is ${browserEvidence.status}`);
}
if (browserEvidence.countsAsPackedPackageEvidence !== false) {
  throw new Error("source-workspace example cannot claim packed-package evidence");
}
if (JSON.stringify(Object.keys(browserEvidence.flows).sort()) !== JSON.stringify(expectedFlows.toSorted())) {
  throw new Error("browser evidence does not contain the exact required flow set");
}
if (
  browserEvidence.accessibility?.status !== "pass" ||
  browserEvidence.accessibility?.serious !== 0 ||
  browserEvidence.accessibility?.critical !== 0
) {
  throw new Error("serious or critical accessibility findings remain");
}
const accessibilityFlows = browserEvidence.accessibility?.flows ?? {};
if (
  JSON.stringify(Object.keys(accessibilityFlows).sort()) !==
    JSON.stringify(expectedFlows.toSorted()) ||
  Object.values(accessibilityFlows).some(
    (flow) => flow.serious !== 0 || flow.critical !== 0,
  )
) {
  throw new Error("every required browser flow must have a clean accessibility receipt");
}
if ((playwrightReport.stats?.expected ?? 0) !== 3) {
  throw new Error("Playwright did not report exactly three expected tests");
}
if ((playwrightReport.stats?.unexpected ?? 0) !== 0) {
  throw new Error("Playwright reported unexpected failures");
}

const screenshotPaths = browserEvidence.artifacts.screenshots.map((name) =>
  resolve(evidenceDirectory, name),
);
if (screenshotPaths.length !== 3) {
  throw new Error("browser evidence must retain exactly three screenshots");
}
const tracePaths = walk(resolve(evidenceDirectory, "playwright-artifacts")).filter(
  (path) => path.endsWith("trace.zip"),
);
if (tracePaths.length !== 3) {
  throw new Error("browser evidence must retain exactly three Playwright traces");
}

const artifactPaths = [
  ...screenshotPaths,
  ...tracePaths,
  resolve(evidenceDirectory, "browser-evidence.json"),
  resolve(evidenceDirectory, "playwright-report.json"),
  resolve(
    root,
    "examples/agentic-a2ui-app/src/features/agentic/fixtures/task-review.v0.9.1.json",
  ),
  resolve(
    root,
    "examples/agentic-a2ui-app/src/features/agentic/fixtures/malformed-unknown-component.v0.9.1.json",
  ),
];
for (const path of artifactPaths) {
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new Error(`missing or empty evidence artifact ${relative(root, path)}`);
  }
}

const rootManifest = readJson("package.json");
const appManifest = readJson("examples/agentic-a2ui-app/package.json");
const report = {
  schemaVersion: 1,
  change: "v3-agentic-a2ui-example",
  task: 5,
  recordedAt: new Date().toISOString(),
  status: "pass",
  evidenceBoundary: {
    kind: browserEvidence.evidenceKind,
    countsAsPackedPackageEvidence: false,
    packageCertificationOwnedBy: [
      "v3-a2ui-protocol-bridge",
      "v3-a2a-conformance-agent",
      "v3-package-module-contracts",
    ],
    externalAgentCertified: false,
    modelKeyRequired: false,
  },
  versions: {
    node: process.version,
    pnpm: rootManifest.packageManager.replace(/^pnpm@/, "").split("+")[0],
    react: appManifest.dependencies.react,
    vite: appManifest.devDependencies.vite,
    typescript: appManifest.devDependencies.typescript,
    playwright: rootManifest.devDependencies["@playwright/test"],
    a2aSdk: appManifest.dependencies["@a2a-js/sdk"],
    a2uiCandidate: readJson("packages/a2ui-react/package.json").version,
    a2aCandidate: readJson("packages/entity-graph-a2a/package.json").version,
  },
  cleanState: {
    removedTargets: cleanTargets,
    frozenInstall: "pass",
  },
  commands,
  production: {
    typecheck: "pass",
    lint: "pass",
    unit: "pass",
    atomicA2uiBatch: "pass",
    externalEndpointPolicy: "pass",
    packageBuilds: "pass",
    packageExportLedgers: "pass",
    viteBuild: "pass",
    securityAudit: "pass",
    openspec: "pass",
  },
  browser: {
    status: "pass",
    project: "chromium-desktop",
    expectedTests: playwrightReport.stats.expected,
    unexpectedTests: playwrightReport.stats.unexpected,
    flows: browserEvidence.flows,
    accessibility: browserEvidence.accessibility,
  },
  artifacts: artifactPaths.map((path) => ({
    path: relative(root, path),
    sha256: sha256(path),
  })),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  `Agentic A2UI clean verification passed: ${relative(root, reportPath)}\n`,
);

function run(label, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  commands.push({
    label,
    command: [command, ...args].join(" "),
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode: result.status,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((entry) => {
    const candidate = resolve(path, entry);
    return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
