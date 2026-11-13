#!/usr/bin/env node
/**
 * UPG-10, UPG-11, UPG-12 (phase-a2ui-1-0-agui-upgrade): AG-UI 1.0 run streams
 * drive the BUILT @prometheus-ags/a2ui-react `./ag-ui` components in Chromium.
 *
 *   node scripts/verify-agui-run-stack.mjs --report <file>
 *
 * Steps: build entity-graph-core and a2ui-react; check the installed
 * @ag-ui/client, @ag-ui/encoder and @ag-ui/core are 1.0.x; run
 * tests/browser/agui-run-stack.spec.ts (a scripted AG-UI agent on a scratch
 * port encodes events with @ag-ui/encoder, the page consumes them with
 * @ag-ui/client's HttpAgent); prove from the page build's module graph that
 * the package was loaded from dist/, not src/; judge each scenario.
 *
 * Every scenario's oracle AND negative control run in the same invocation. The
 * run fails (exit 1) when any oracle or control does not PASS, when a control
 * was not exercised, when a scenario recorded no result, or when the page was
 * not built against the package's dist/. Exit 2: usage.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCENARIOS = ["UPG-10", "UPG-11", "UPG-12"];
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playwrightConfig = "tests/browser/agui-run-stack.playwright.config.ts";
const pageRoot = join(workspaceRoot, "tests/agui-run-stack");
const PAGE_PORT = process.env.AGUI_RUN_STACK_PORT ?? "4211";
const AGENT_PORT = process.env.AGUI_RUN_STACK_AGENT_PORT ?? "4212";

const reportFlag = process.argv.indexOf("--report");
const reportArg = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
if (!reportArg || reportArg.startsWith("--")) {
  console.error("usage: node scripts/verify-agui-run-stack.mjs --report <file>");
  process.exit(2);
}
const reportPath = resolve(process.cwd(), reportArg);
const artifactsRoot = join(dirname(reportPath), `${basename(reportPath).replace(/\.json$/, "")}-artifacts`);
const commands = [];

function base() {
  return { schemaVersion: 1, scenarioIds: SCENARIOS, recordedAt: new Date().toISOString(), argv: process.argv.slice(1) };
}

function writeReport(report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function fail(message, extra = {}) {
  writeReport({ ...base(), scenarios: [], status: "error", error: message, commands, ...extra, exitCode: 1 });
  console.error(`verify-agui-run-stack: ${message}`);
  process.exit(1);
}

function run(label, command, args, env = {}, { allowFailure = false } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: workspaceRoot, stdio: "inherit", env: { ...process.env, ...env } });
  const exitCode = result.status ?? (result.error ? 127 : 1);
  commands.push({ label, argv: [command, ...args], env, startedAt, exitCode });
  if (exitCode !== 0 && !allowFailure) fail(`${label} exited with ${exitCode}`);
  return exitCode;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** The version each AG-UI package resolves to from the page and agent directory. */
function installedAgUi() {
  const requireFromPage = createRequire(join(pageRoot, "agent-server.mjs"));
  const versions = {};
  for (const name of ["@ag-ui/client", "@ag-ui/encoder", "@ag-ui/core"]) {
    try {
      const manifestPath = requireFromPage.resolve(`${name}/package.json`);
      versions[name] = { version: JSON.parse(readFileSync(manifestPath, "utf8")).version, path: relative(workspaceRoot, manifestPath) };
    } catch (cause) {
      versions[name] = { version: null, error: String(cause) };
    }
  }
  return versions;
}

function readResults(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

/** Prove the page bundle loaded the package from dist/ and nothing from any package's src/. */
function judgeResolution(path, builtEntries) {
  if (!existsSync(path)) return { ok: false, problems: [`no resolution record at ${relative(workspaceRoot, path)}`] };
  const resolution = JSON.parse(readFileSync(path, "utf8"));
  const problems = [];
  for (const [specifier, entry] of Object.entries(builtEntries)) {
    if (resolution.resolved?.[specifier] === undefined) continue;
    if (resolution.resolved[specifier] !== entry) problems.push(`${specifier} resolved to ${resolution.resolved[specifier]}, not ${entry}`);
  }
  if (resolution.resolved?.["@prometheus-ags/a2ui-react/ag-ui"] === undefined) problems.push("the page never imported @prometheus-ags/a2ui-react/ag-ui");
  const srcModules = (resolution.moduleIds ?? []).filter((id) => /^packages\/[^/]+\/src\//.test(id));
  if (srcModules.length > 0) problems.push(`modules loaded from package sources: ${srcModules.slice(0, 5).join(", ")}`);
  if (!(resolution.moduleIds ?? []).includes(builtEntries["@prometheus-ags/a2ui-react/ag-ui"])) problems.push("the built ./ag-ui entry is not in the page's module graph");
  const agUiClient = (resolution.moduleIds ?? []).filter((id) => /@ag-ui\+client@1\.0\.\d+/.test(id) || id.includes("node_modules/@ag-ui/client/"));
  if (agUiClient.length === 0) problems.push("@ag-ui/client is not in the page's module graph");
  return { ok: problems.length === 0, problems, resolved: resolution.resolved, agUiClientModules: agUiClient, srcModules };
}

function judgePart(scenarioId, partName, partResult) {
  const problems = [];
  if (!partResult) return { status: "MISSING", problems: [`${scenarioId} ${partName}: no result recorded`] };
  if (!partResult.exercised) problems.push(`${scenarioId} ${partName}: NOT_EXERCISED`);
  const failed = (partResult.checks ?? []).filter((item) => !item.pass);
  for (const item of failed) problems.push(`${scenarioId} ${partName}: ${item.name}`);
  if ((partResult.checks ?? []).length === 0) problems.push(`${scenarioId} ${partName}: no checks ran`);
  const status = problems.length === 0 && partResult.status === "PASS" ? "PASS" : partResult.exercised ? "FAIL" : "NOT_EXERCISED";
  return { status, problems };
}

// ── 1. builds ──
run("build entity-graph-core", "pnpm", ["--filter", "@prometheus-ags/entity-graph-core", "build"]);
run("build a2ui-react", "pnpm", ["--filter", "@prometheus-ags/a2ui-react", "build"]);

const packageRoot = join(workspaceRoot, "packages/a2ui-react");
const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const builtEntries = {
  "@prometheus-ags/a2ui-react": relative(workspaceRoot, join(packageRoot, packageJson.exports["."].default)),
  "@prometheus-ags/a2ui-react/ag-ui": relative(workspaceRoot, join(packageRoot, packageJson.exports["./ag-ui"].default)),
};
for (const entry of Object.values(builtEntries)) {
  if (!existsSync(join(workspaceRoot, entry))) fail(`built entry missing after build: ${entry}`);
}
const builtPackage = {
  name: packageJson.name,
  version: packageJson.version,
  entries: Object.fromEntries(Object.entries(builtEntries).map(([specifier, entry]) => [specifier, { path: entry, sha256: sha256(join(workspaceRoot, entry)) }])),
};

// ── 2. real collaborators ──
const agUi = installedAgUi();
const versionProblems = Object.entries(agUi)
  .filter(([, info]) => typeof info.version !== "string" || !/^1\.0\.\d+$/.test(info.version))
  .map(([name, info]) => `${name} resolves to ${info.version ?? "nothing"} (${info.error ?? info.path}); the contract requires 1.0.x`);
if (versionProblems.length > 0) fail(versionProblems.join("; "), { agUi, builtPackage });

// ── 3. browser run ──
rmSync(artifactsRoot, { recursive: true, force: true });
mkdirSync(artifactsRoot, { recursive: true });
const resultsPath = join(artifactsRoot, "results.jsonl");
const resolutionPath = join(artifactsRoot, "page-resolution.json");
const playwrightExitCode = run("UPG-10/11/12 (Chromium)", "pnpm", ["exec", "playwright", "test", "--config", playwrightConfig], {
  AGUI_RUN_STACK_RESULTS: resultsPath,
  AGUI_RUN_STACK_OUT_DIR: artifactsRoot,
  AGUI_RUN_STACK_RESOLUTION: resolutionPath,
  AGUI_RUN_STACK_PORT: PAGE_PORT,
  AGUI_RUN_STACK_AGENT_PORT: AGENT_PORT,
}, { allowFailure: true });

// ── 4. judge ──
const entries = readResults(resultsPath).filter((entry) => entry.kind === "scenario");
const problems = [];
const scenarios = SCENARIOS.map((id) => {
  const matches = entries.filter((entry) => entry.id === id);
  if (matches.length > 1) problems.push(`${id}: ${matches.length} results recorded`);
  const entry = matches[0];
  if (!entry) {
    problems.push(`${id}: MISSING (the spec recorded no result)`);
    return { id, status: "FAIL", reason: "MISSING: the spec recorded no result", oracle: null, negativeControl: null };
  }
  const oracle = judgePart(id, "oracle", entry.oracle);
  const negativeControl = judgePart(id, "negativeControl", entry.negativeControl);
  const scenarioProblems = [...oracle.problems, ...negativeControl.problems, ...(entry.error ? [`${id}: ${entry.error}`] : [])];
  problems.push(...scenarioProblems);
  return {
    id,
    name: entry.name,
    status: scenarioProblems.length === 0 ? "PASS" : "FAIL",
    ...(scenarioProblems.length > 0 ? { reason: scenarioProblems.slice(0, 6).join(" | ") } : {}),
    oracle: { ...entry.oracle, verdict: oracle.status },
    negativeControl: { ...entry.negativeControl, verdict: negativeControl.status },
    pageErrors: entry.pageErrors ?? [],
    ...(entry.error ? { error: entry.error } : {}),
  };
});
const resolution = judgeResolution(resolutionPath, builtEntries);
if (!resolution.ok) problems.push(...resolution.problems.map((problem) => `page build: ${problem}`));
for (const entry of entries) {
  if (!SCENARIOS.includes(entry.id)) problems.push(`UNKNOWN_SCENARIO ${entry.id}`);
}

if (playwrightExitCode !== 0) problems.push(`playwright exited with ${playwrightExitCode}`);
const failed = problems.length > 0;
const report = {
  ...base(),
  builtPackage,
  agUi,
  browser: "chromium (Playwright devices['Desktop Chrome'])",
  scratchPorts: { page: Number(PAGE_PORT), agent: Number(AGENT_PORT) },
  pageResolution: resolution,
  scenarios,
  problems,
  playwright: { exitCode: playwrightExitCode, resultsFile: relative(workspaceRoot, resultsPath) },
  commands,
  status: failed ? "FAIL" : "PASS",
  exitCode: failed ? 1 : 0,
};
writeReport(report);
console.log(`verify-agui-run-stack: ${scenarios.map((item) => `${item.id} ${item.status}`).join(", ")}; report ${relative(workspaceRoot, reportPath)}`);
if (failed) for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
process.exit(report.exitCode);
