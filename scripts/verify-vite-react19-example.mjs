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
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example",
);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const reportPath = resolve(
  root,
  argument("--report", relative(root, resolve(evidenceDirectory, "task-3-verification.json"))),
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

function packageVersion(path) {
  return readJson(path).version;
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

run("react-typecheck", "pnpm", [
  "--filter",
  "@prometheus-ags/prometheus-entity-management",
  "typecheck",
]);
run("vite-typecheck", "pnpm", [
  "--filter",
  "prometheus-entity-management-vite",
  "typecheck",
]);
run("entity-query-unit", "pnpm", [
  "--filter",
  "@prometheus-ags/prometheus-entity-management",
  "exec",
  "vitest",
  "run",
  "src/hooks/use-entity-query.test.ts",
  "src/hooks-suspense.test.tsx",
  "--reporter",
  "verbose",
]);
run("core-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-core",
  "build",
]);
run("react-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/prometheus-entity-management",
  "build",
]);
run("sync-package-build", "pnpm", [
  "--filter",
  "@prometheus-ags/entity-graph-sync",
  "build",
]);
run("vite-production-build", "pnpm", [
  "--filter",
  "prometheus-entity-management-vite",
  "build",
]);
run("vite-production-browser", "pnpm", [
  "exec",
  "playwright",
  "test",
  "--config",
  "tests/browser/v3-vite-react19-example.playwright.config.ts",
]);

const browserEvidence = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example/browser-evidence.json",
);
const playwrightReport = readJson(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example/playwright-report.json",
);
const coverage = readJson("examples/coverage.json");
const showcase = coverage.showcases.find((entry) => entry.id === "react-19-vite-8");
if (!showcase) throw new Error("examples/coverage.json has no react-19-vite-8 showcase");
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
if (
  browserEvidence.accessibility.serious !== 0 ||
  browserEvidence.accessibility.critical !== 0
) {
  throw new Error("serious or critical accessibility violations remain");
}

const artifactPaths = [
  ...browserEvidence.artifacts.screenshots.map((name) =>
    resolve(evidenceDirectory, name),
  ),
  ...walk(resolve(evidenceDirectory, "playwright-artifacts")).filter((path) =>
    path.endsWith(".zip"),
  ),
];
if (!artifactPaths.some((path) => path.endsWith(".zip"))) {
  throw new Error("Playwright trace metadata is missing");
}
for (const path of artifactPaths) {
  if (!existsSync(path)) throw new Error(`missing browser artifact ${path}`);
}

const report = {
  schemaVersion: 1,
  change: "v3-vite-react19-example",
  task: 3,
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
    react: readJson("examples/vite-app/package.json").dependencies.react,
    vite: readJson("examples/vite-app/package.json").devDependencies.vite,
    playwright: readJson("package.json").devDependencies["@playwright/test"],
    typescript: readJson("package.json").devDependencies.typescript,
    packageCandidate: packageVersion("packages/entity-graph-react/package.json"),
  },
  commands,
  unit: {
    status: "pass",
    testFiles: [
      "packages/entity-graph-react/src/hooks/use-entity-query.test.ts",
      "packages/entity-graph-react/src/hooks-suspense.test.tsx",
    ],
    sourceModes: ["local", "remote", "hybrid"],
    initialRemoteSeedsBaseList: true,
  },
  production: {
    typecheck: "pass",
    build: "pass",
    app: "examples/vite-app",
  },
  browser: {
    status: "pass",
    project: "chromium-desktop",
    expectedTests: playwrightReport.stats?.expected ?? null,
    unexpectedTests: playwrightReport.stats?.unexpected ?? null,
    declaredScenarioIds: showcase.scenarioIds,
    scenarios: browserEvidence.scenarios,
    accessibility: browserEvidence.accessibility,
  },
  artifacts: artifactPaths.map((path) => ({
    path: relative(root, path),
    sha256: sha256(path),
  })),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`React 19/Vite 8 verification passed: ${relative(root, reportPath)}`);
