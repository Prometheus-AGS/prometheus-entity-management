import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const evidenceDirectory = resolve(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example",
);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const reportPath = resolve(
  root,
  argument("--report", relative(root, resolve(evidenceDirectory, "verification.json"))),
);

const commands = [];

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

mkdirSync(evidenceDirectory, { recursive: true });

run("agentic-typecheck", "pnpm", [
  "--filter",
  "prometheus-entity-management-agentic-a2ui",
  "typecheck",
]);
run("golden-protocol-replay", "pnpm", [
  "--filter",
  "prometheus-entity-management-agentic-a2ui",
  "run",
  "test:golden",
]);
run("core-package-build", "pnpm", ["--filter", "@prometheus-ags/entity-graph-core", "build"]);
run("react-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/prometheus-entity-management",
  "build",
]);
run("a2ui-package-build", "pnpm", ["--filter", "@prometheus-ags/a2ui-react", "build"]);
run("a2a-package-build", "pnpm", ["--filter", "@prometheus-ags/entity-graph-a2a", "build"]);
run("agentic-production-build", "pnpm", [
  "--filter",
  "prometheus-entity-management-agentic-a2ui",
  "build",
]);
run("agentic-production-browser", "pnpm", [
  "exec",
  "playwright",
  "test",
  "--config",
  "tests/browser/v3-agentic-a2ui-example.playwright.config.ts",
]);

const browserEvidence = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/browser-evidence.json",
);
const playwrightReport = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example/playwright-report.json",
);
const coverage = readJson("examples/coverage.json");
const showcase = coverage.showcases.find((entry) => entry.id === "agentic-a2ui");
if (!showcase) throw new Error("examples/coverage.json has no agentic-a2ui showcase");
if (browserEvidence.status !== "pass") {
  throw new Error(`browser evidence status is ${browserEvidence.status}`);
}
for (const id of showcase.scenarioIds) {
  if (browserEvidence.scenarios[id]?.status !== "pass") {
    throw new Error(`missing passing browser receipt for ${id}`);
  }
}
if (browserEvidence.countsAsPackedPackageEvidence !== false) {
  throw new Error("source-workspace browser evidence must not claim packed-package coverage");
}
if (browserEvidence.accessibility.serious !== 0 || browserEvidence.accessibility.critical !== 0) {
  throw new Error("serious or critical accessibility violations remain");
}
if (browserEvidence.consoleErrors.length !== 0) {
  throw new Error(`browser console errors: ${browserEvidence.consoleErrors.join(" | ")}`);
}

// Golden transcripts pin the four protocol flows plus surface and tenant guard.
const goldenDir = resolve(root, "examples/agentic-a2ui/tests/golden");
const golden = {
  happy: readJson("examples/agentic-a2ui/tests/golden/happy.json"),
  denied: readJson("examples/agentic-a2ui/tests/golden/denied.json"),
  malformed: readJson("examples/agentic-a2ui/tests/golden/malformed.json"),
  cancelled: readJson("examples/agentic-a2ui/tests/golden/cancelled.json"),
  tenant: readJson("examples/agentic-a2ui/tests/golden/tenant-denied.json"),
};
if (golden.happy.finalState !== "TASK_STATE_COMPLETED") throw new Error("happy flow drifted");
if (golden.denied.finalState !== "TASK_STATE_REJECTED" || golden.denied.survived !== true) {
  throw new Error("denied flow drifted");
}
if (typeof golden.malformed.code !== "number") throw new Error("malformed flow drifted");
if (golden.cancelled.finalState !== "TASK_STATE_CANCELED") throw new Error("cancel flow drifted");
if (golden.tenant.status !== 403) throw new Error("tenant guard drifted");

const artifactPaths = [
  ...browserEvidence.artifacts.screenshots.map((name) => resolve(evidenceDirectory, name)),
  ...walk(resolve(evidenceDirectory, "playwright-artifacts")).filter((path) =>
    path.endsWith(".zip"),
  ),
  ...walk(goldenDir).filter((path) => path.endsWith(".json")),
];
if (!artifactPaths.some((path) => path.endsWith(".zip"))) {
  throw new Error("Playwright trace metadata is missing");
}
for (const path of artifactPaths) {
  if (!existsSync(path)) throw new Error(`missing artifact ${path}`);
}

const report = {
  schemaVersion: 1,
  change: "v3-agentic-a2ui-example",
  recordedAt: new Date().toISOString(),
  status: "pass",
  evidenceBoundary: {
    kind: browserEvidence.evidenceKind,
    countsAsPackedPackageEvidence: browserEvidence.countsAsPackedPackageEvidence,
    packageCertificationOwnedBy: "v3-package-module-contracts",
  },
  versions: {
    node: process.version,
    pnpm: readJson("package.json").packageManager.replace(/^pnpm@/, "").split("+")[0],
    react: readJson("examples/agentic-a2ui/package.json").dependencies.react,
    a2aSdk: readJson("examples/agentic-a2ui/package.json").dependencies["@a2a-js/sdk"],
    playwright: readJson("package.json").devDependencies["@playwright/test"],
    typescript: readJson("examples/agentic-a2ui/package.json").devDependencies.typescript,
    packageCandidate: readJson("packages/entity-graph-react/package.json").version,
  },
  commands,
  protocol: {
    status: "pass",
    keyless: true,
    modelCredentialRequired: false,
    goldenFixtures: ["happy", "denied", "malformed", "cancelled", "surface-task-sync", "tenant-denied"],
    happyFinalState: golden.happy.finalState,
    deniedFinalState: golden.denied.finalState,
    malformedRejected: true,
    cancelledFinalState: golden.cancelled.finalState,
    tenantMismatchStatus: golden.tenant.status,
  },
  production: {
    typecheck: "pass",
    build: "pass",
    app: "examples/agentic-a2ui",
  },
  browser: {
    status: "pass",
    project: "chromium-desktop",
    expectedTests: playwrightReport.stats?.expected ?? null,
    unexpectedTests: playwrightReport.stats?.unexpected ?? null,
    declaredScenarioIds: showcase.scenarioIds,
    scenarios: browserEvidence.scenarios,
    accessibility: browserEvidence.accessibility,
    actionCatalogBypassed: false,
  },
  artifacts: artifactPaths.map((path) => ({
    path: relative(root, path),
    sha256: sha256(path),
  })),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Agentic A2UI verification passed: ${relative(root, reportPath)}`);
