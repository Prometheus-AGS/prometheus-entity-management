#!/usr/bin/env node
/**
 * A2UI 1.0 acceptance verifier: contract scenarios UPG-1, UPG-2, UPG-4, UPG-5,
 * UPG-6, UPG-7, UPG-8, UPG-13 and UPG-17 of phase-a2ui-1-0-agui-upgrade,
 * against the BUILT @prometheus-ags/a2ui-react (its package.json exports, never
 * src).
 *
 *   node scripts/verify-a2ui-v1.mjs --report <file>
 *
 * Steps: build entity-graph-core and a2ui-react; write the scratch fixtures
 * (tests/a2ui-v1/fixtures.mjs) next to the report, content-digested; run the
 * Chromium lane (tests/browser/a2ui-v1.spec.ts over tests/a2ui-v1/page, served
 * from the run's scratch directory on a free port; UPG-2 drives a real
 * @ag-ui/a2ui-middleware stream); run the Node lane for UPG-13 (pack both
 * packages, install the tarballs into a scratch pnpm consumer, import the
 * packed `@prometheus-ags/a2ui-react/headless`); judge every scenario.
 *
 * A scenario passes only when every oracle check passes AND its negative
 * control was exercised and every control check passed (the control's bad
 * input was refused, or had no effect, as the contract requires). A missing
 * scenario, a control that was not exercised or did not fail, a non-zero
 * Playwright exit, or any lane error fails the run. Exit 2 without --report.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixtures } from "../tests/a2ui-v1/fixtures.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playwrightConfig = "tests/browser/a2ui-v1.playwright.config.ts";
const headlessLaneSource = join(workspaceRoot, "tests/a2ui-v1/headless-lane.mjs");
const BROWSER_SCENARIOS = ["UPG-1", "UPG-2", "UPG-4", "UPG-5", "UPG-6", "UPG-7", "UPG-8", "UPG-17"];
const NODE_SCENARIOS = ["UPG-13"];
const SCENARIOS = ["UPG-1", "UPG-2", "UPG-4", "UPG-5", "UPG-6", "UPG-7", "UPG-8", "UPG-13", "UPG-17"];
const RESERVED_PORTS = new Set([4185]);
const PACKED = [
  { name: "@prometheus-ags/entity-graph-core", directory: "packages/entity-graph-core" },
  { name: "@prometheus-ags/a2ui-react", directory: "packages/a2ui-react" },
];

const reportFlag = process.argv.indexOf("--report");
const reportArg = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
if (!reportArg || reportArg.startsWith("--")) {
  console.error("usage: node scripts/verify-a2ui-v1.mjs --report <file>");
  process.exit(2);
}
const reportPath = resolve(process.cwd(), reportArg);
const artifactsRoot = join(dirname(reportPath), `${basename(reportPath).replace(/\.json$/, "")}-artifacts`);
const recordedAt = new Date().toISOString();
const commands = [];

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function run(label, command, args, { env = {}, cwd = workspaceRoot, allowFailure = false, capture = false } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: capture ? "utf8" : undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
  const exitCode = result.status ?? (result.error ? 127 : 1);
  commands.push({ label, argv: [command, ...args], cwd: relative(workspaceRoot, cwd) || ".", env, startedAt, exitCode });
  if (exitCode !== 0 && !allowFailure) fail(`${label} exited with ${exitCode}`);
  return { exitCode, stdout: capture ? result.stdout ?? "" : "" };
}

function writeReport(report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function fail(message, extra = {}) {
  writeReport({
    schemaVersion: 1,
    scenarios: SCENARIOS,
    recordedAt,
    argv: process.argv.slice(1),
    status: "error",
    error: message,
    commands,
    exitCode: 1,
    ...extra,
  });
  console.error(`verify-a2ui-v1: ${message}`);
  process.exit(1);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

async function pickPort() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const port = await freePort();
    if (!RESERVED_PORTS.has(port)) return port;
  }
  fail("could not find a free port");
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function builtPackage() {
  const packageRoot = join(workspaceRoot, "packages/a2ui-react");
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const entries = {};
  for (const subpath of [".", "./headless"]) {
    const file = join("packages/a2ui-react", manifest.exports[subpath].default);
    entries[subpath] = { file, sha256: sha256(readFileSync(join(workspaceRoot, file))) };
  }
  return { name: manifest.name, version: manifest.version, entries, manifest };
}

function writeFixtures(directory) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  const digests = {};
  for (const [name, value] of Object.entries(buildFixtures())) {
    const bytes = `${JSON.stringify(value, null, 2)}\n`;
    writeFileSync(join(directory, name), bytes);
    digests[name] = sha256(bytes);
  }
  return digests;
}

function browserLane(fixturesDir, port) {
  const outDir = join(artifactsRoot, "browser");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const resultsPath = join(outDir, "results.jsonl");
  const { exitCode } = run("browser lane: UPG-1,2,4,5,6,7,8,17 (Chromium)", "pnpm", ["exec", "playwright", "test", "--config", playwrightConfig], {
    env: { A2UI_V1_RESULTS: resultsPath, A2UI_V1_FIXTURES: fixturesDir, A2UI_V1_OUT_DIR: outDir, A2UI_V1_PORT: String(port) },
    allowFailure: true,
  });
  return { exitCode, port, outDir: relative(workspaceRoot, outDir), entries: readJsonLines(resultsPath) };
}

function nodeLane(fixturesDir, manifest) {
  const lane = { scratch: undefined, tarballs: {}, install: undefined, run: undefined, result: undefined, problems: [] };
  try {
    const scratch = mkdtempSync(join(tmpdir(), "a2ui-v1-headless-"));
    lane.scratch = scratch;
    const tarballDir = join(scratch, "tarballs");
    mkdirSync(tarballDir, { recursive: true });
    const specs = {};
    for (const pkg of PACKED) {
      const packed = run(`pack ${pkg.name}`, "pnpm", ["--dir", join(workspaceRoot, pkg.directory), "pack", "--pack-destination", tarballDir, "--json"], {
        capture: true,
        allowFailure: true,
      });
      if (packed.exitCode !== 0) throw new Error(`pnpm pack ${pkg.name} exited with ${packed.exitCode}`);
      const tarball = resolve(JSON.parse(packed.stdout).filename);
      lane.tarballs[pkg.name] = { file: basename(tarball), sha256: sha256(readFileSync(tarball)) };
      specs[pkg.name] = `file:${tarball}`;
    }
    const consumer = join(scratch, "consumer");
    mkdirSync(consumer, { recursive: true });
    const devDependencies = manifest.devDependencies ?? {};
    writeFileSync(
      join(consumer, "package.json"),
      `${JSON.stringify({
        name: "a2ui-v1-headless-consumer",
        private: true,
        type: "module",
        // Pinned to the repository's pnpm (corepack's out-of-project fallback may not be launchable).
        packageManager: JSON.parse(readFileSync(join(workspaceRoot, "package.json"), "utf8")).packageManager,
        dependencies: {
          ...specs,
          // Peers of the package; the headless entry never imports them.
          react: devDependencies.react,
          "react-dom": devDependencies["react-dom"],
        },
        // Force every internal edge to the candidate tarballs (see scripts/package-contract-validation.mjs).
        pnpm: { overrides: { ...specs } },
      }, null, 2)}\n`,
    );
    const install = run("install packed headless consumer", "pnpm", ["install", "--ignore-scripts", "--strict-peer-dependencies=false"], {
      cwd: consumer,
      allowFailure: true,
    });
    lane.install = { exitCode: install.exitCode };
    if (install.exitCode !== 0) throw new Error(`pnpm install exited with ${install.exitCode}`);
    copyFileSync(headlessLaneSource, join(consumer, "headless-lane.mjs"));
    const outPath = join(artifactsRoot, "node", "headless-lane.json");
    mkdirSync(dirname(outPath), { recursive: true });
    rmSync(outPath, { force: true });
    const ran = run("node lane: UPG-13 (packed ./headless)", process.execPath, ["headless-lane.mjs", "--fixtures", fixturesDir, "--out", outPath], {
      cwd: consumer,
      allowFailure: true,
    });
    lane.run = { exitCode: ran.exitCode, output: relative(workspaceRoot, outPath) };
    if (ran.exitCode !== 0) lane.problems.push(`headless lane process exited with ${ran.exitCode}`);
    if (!existsSync(outPath)) throw new Error("the headless lane wrote no result");
    lane.result = JSON.parse(readFileSync(outPath, "utf8"));
    if (lane.result.status !== "completed") lane.problems.push(`headless lane error: ${lane.result.error?.message ?? "unknown"}`);
  } catch (cause) {
    lane.problems.push(cause instanceof Error ? cause.message : String(cause));
  } finally {
    // The tarball digests and the result are already recorded; keep the scratch only on request.
    if (lane.scratch && !process.env.A2UI_V1_KEEP_SCRATCH) {
      rmSync(lane.scratch, { recursive: true, force: true });
      lane.scratchRemoved = true;
    }
  }
  return lane;
}

function judgePart(part, { control }) {
  const checks = Array.isArray(part?.checks) ? part.checks : [];
  const exercised = control ? part?.exercised === true : true;
  const failed = checks.filter((item) => item.pass !== true).map((item) => item.name);
  const pass = exercised && checks.length > 0 && failed.length === 0;
  const reason = !exercised
    ? "NOT_EXERCISED"
    : checks.length === 0
      ? "NO_CHECKS"
      : failed.length > 0
        ? control
          ? `CONTROL_DID_NOT_FAIL_AS_REQUIRED: ${failed.join("; ")}`
          : `ORACLE_FAILED: ${failed.join("; ")}`
        : undefined;
  return {
    status: pass ? "PASS" : "FAIL",
    ...(control ? { exercised } : {}),
    ...(reason ? { reason } : {}),
    checks,
    observed: part?.observed ?? {},
  };
}

function judgeScenario(id, entries, lane) {
  const matches = entries.filter((entry) => entry.id === id);
  if (matches.length === 0) {
    return { id, lane, status: "FAIL", reason: "MISSING: the lane recorded no result for this scenario", oracle: { status: "FAIL" }, negativeControl: { status: "FAIL", exercised: false } };
  }
  const entry = matches[0];
  const oracle = judgePart(entry.oracle, { control: false });
  const negativeControl = judgePart(entry.negativeControl, { control: true });
  const reasons = [
    ...(matches.length > 1 ? [`DUPLICATE: ${matches.length} results recorded`] : []),
    ...(entry.harnessError ? [`HARNESS_ERROR: ${entry.harnessError}`] : []),
    // Uncaught page exceptions fail the scenario; console.error output is recorded only.
    ...(entry.pageErrors ?? []).filter((message) => !String(message).startsWith("console.error:")).map((message) => `UNCAUGHT_PAGE_ERROR: ${message}`),
    ...(oracle.reason ? [`oracle ${oracle.reason}`] : []),
    ...(negativeControl.reason ? [`negativeControl ${negativeControl.reason}`] : []),
  ];
  return {
    id,
    lane,
    title: entry.title,
    status: reasons.length === 0 ? "PASS" : "FAIL",
    ...(reasons.length > 0 ? { reason: reasons.join(" | ") } : {}),
    oracle,
    negativeControl,
    ...(entry.pageErrors?.length ? { pageErrors: entry.pageErrors } : {}),
  };
}

run("build entity-graph-core", "pnpm", ["--filter", "@prometheus-ags/entity-graph-core", "build"]);
run("build a2ui-react", "pnpm", ["--filter", "@prometheus-ags/a2ui-react", "build"]);
const built = builtPackage();

rmSync(artifactsRoot, { recursive: true, force: true });
mkdirSync(artifactsRoot, { recursive: true });
const fixturesDir = join(artifactsRoot, "fixtures");
const fixtureDigests = writeFixtures(fixturesDir);

const port = await pickPort();
const browser = browserLane(fixturesDir, port);
const node = nodeLane(fixturesDir, built.manifest);

const nodeEntries = node.result?.status === "completed"
  ? [{ id: "UPG-13", title: "headless export by protocol version", oracle: node.result.oracle, negativeControl: node.result.negativeControl }]
  : [];
const results = SCENARIOS.map((id) =>
  NODE_SCENARIOS.includes(id) ? judgeScenario(id, nodeEntries, "node") : judgeScenario(id, browser.entries, "browser"),
);

const problems = [];
if (browser.exitCode !== 0) problems.push(`playwright exited with ${browser.exitCode}`);
for (const entry of browser.entries) {
  if (!BROWSER_SCENARIOS.includes(entry.id)) problems.push(`UNKNOWN_SCENARIO ${entry.id}`);
}
problems.push(...node.problems);

const counts = { total: results.length, PASS: 0, FAIL: 0 };
for (const result of results) counts[result.status] += 1;
const failed = counts.FAIL > 0 || problems.length > 0;
const { manifest: _manifest, ...builtSummary } = built;
const report = {
  schemaVersion: 1,
  phase: "phase-a2ui-1-0-agui-upgrade",
  scenarios: SCENARIOS,
  recordedAt,
  argv: process.argv.slice(1),
  node: process.version,
  builtPackage: builtSummary,
  fixtures: { directory: relative(workspaceRoot, fixturesDir), sha256: fixtureDigests },
  lanes: {
    browser: { browser: "chromium (Playwright devices['Desktop Chrome'])", port: browser.port, exitCode: browser.exitCode, artifacts: browser.outDir, recorded: browser.entries.length },
    node: {
      scratch: node.scratch,
      tarballs: node.tarballs,
      install: node.install,
      run: node.run,
      ...(node.result ? { node: node.result.node, resolvedEntry: node.result.resolvedEntry, resolvedEntryDigest: node.result.resolvedEntryDigest } : {}),
    },
  },
  results,
  counts,
  problems,
  commands,
  status: failed ? "FAIL" : "PASS",
  exitCode: failed ? 1 : 0,
};
writeReport(report);
console.log(
  `verify-a2ui-v1: ${counts.PASS}/${counts.total} scenarios pass${counts.FAIL ? ` (FAIL: ${results.filter((result) => result.status === "FAIL").map((result) => result.id).join(", ")})` : ""}${problems.length ? `; ${problems.length} problem(s)` : ""}; report ${relative(workspaceRoot, reportPath)}`,
);
process.exit(report.exitCode);
