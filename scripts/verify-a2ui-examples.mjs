#!/usr/bin/env node
/**
 * UPG-14 — examples run A2UI 1.0 end to end.
 *
 *   pnpm run verify:a2ui-examples -- --report <file>
 *
 * Oracle: each example (examples/agentic-a2ui-app, examples/agentic-a2ui,
 * examples/agui-activity-lab), built and served, renders its main surface and
 * completes one action in Chromium, and every A2UI envelope captured from its
 * running producer has `version: "1.0"`.
 *
 * Negative control (same run): the same envelope assertion
 * (`tests/a2ui-examples/envelope-assertion.mjs`) applied to each example's
 * pre-migration recording, after its recorded digest is verified, must fail on
 * its v0.9.1 or "v1.0" envelopes.
 *
 * Screenshots and captures go to `<report dir>/<report basename>-artifacts/`.
 * Exit codes: 0 pass, 1 any failure, 2 usage error (no `--report`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import {
  PRE_MIGRATION_VERSIONS,
  assertA2uiEnvelopes,
  collectEnvelopes,
  envelopeDigest,
  sha256Hex,
} from "../tests/a2ui-examples/envelope-assertion.mjs";
import { A2UI_EXAMPLES, PRE_MIGRATION_FIXTURE_DIRECTORY } from "../tests/a2ui-examples/examples.mjs";

const workspaceRoot = resolve(import.meta.dirname, "..");
const PLAYWRIGHT_CONFIG = "tests/browser/a2ui-examples.playwright.config.ts";

function usage(message) {
  process.stderr.write(`[a2ui-examples] ${message}\n`);
  process.stderr.write("usage: pnpm run verify:a2ui-examples -- --report <file>\n");
  process.exit(2);
}

function parseArgs(argv) {
  let report;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--report") {
      report = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("--report=")) {
      report = argument.slice("--report=".length);
    } else {
      usage(`unknown argument: ${argument}`);
    }
  }
  if (!report) usage("--report <file> is required");
  return { report: resolve(report) };
}

const argv = process.argv.slice(2);
const { report: reportPath } = parseArgs(argv);
const reportDirectory = dirname(reportPath);
const artifactsDirectory = join(
  reportDirectory,
  `${basename(reportPath, extname(reportPath))}-artifacts`,
);

const commands = [];
const startedAt = new Date().toISOString();

function run(label, command, args, env = {}) {
  const begun = new Date().toISOString();
  process.stdout.write(`[a2ui-examples] ${label}: ${[command, ...args].join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, FORCE_COLOR: "0", ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const exitCode = result.error ? null : result.status;
  commands.push({
    label,
    command: [command, ...args].join(" "),
    env: Object.keys(env).length > 0 ? env : undefined,
    startedAt: begun,
    completedAt: new Date().toISOString(),
    exitCode,
    signal: result.signal ?? null,
    error: result.error ? String(result.error) : null,
  });
  return exitCode;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function relativeToRoot(path) {
  return relative(workspaceRoot, path) || ".";
}

/** Verify a pre-migration fixture's digest, then run the shared assertion on it. */
function negativeControl(entry, manifest) {
  const path = resolve(workspaceRoot, PRE_MIGRATION_FIXTURE_DIRECTORY, entry.fixture);
  const recorded = manifest[entry.fixture]?.sha256 ?? null;
  if (!existsSync(path)) {
    return { exampleId: entry.id, fixture: relativeToRoot(path), status: "fail", reason: "fixture is missing" };
  }
  const bytes = readFileSync(path);
  const actual = sha256Hex(bytes);
  const digest = { recorded, actual, matches: recorded === actual };
  if (!digest.matches) {
    return {
      exampleId: entry.id,
      fixture: relativeToRoot(path),
      digest,
      status: "fail",
      reason: "fixture digest does not match the recorded manifest digest",
    };
  }
  const envelopes = collectEnvelopes(JSON.parse(bytes.toString("utf8")));
  const assertion = assertA2uiEnvelopes(envelopes);
  const failureVersions = [...new Set(assertion.failures.map(({ version }) => version))];
  const failsOnPreMigrationVersions =
    assertion.failures.length > 0 &&
    failureVersions.every((version) => PRE_MIGRATION_VERSIONS.includes(version));
  const discriminates = !assertion.ok && failsOnPreMigrationVersions;
  return {
    exampleId: entry.id,
    fixture: relativeToRoot(path),
    digest,
    assertion,
    failureVersions,
    expected: `the assertion fails, only on ${PRE_MIGRATION_VERSIONS.join(" / ")} envelopes`,
    status: discriminates ? "pass" : "fail",
    reason: discriminates
      ? null
      : assertion.ok
        ? "the assertion passed on the pre-migration recording, so it does not discriminate"
        : `the assertion failed on unexpected versions ${JSON.stringify(failureVersions)}`,
  };
}

/** Collect every spec in a Playwright JSON report, with its title and outcome. */
function playwrightSpecs(reportFile) {
  if (!existsSync(reportFile)) return [];
  const specs = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      const statuses = (spec.tests ?? []).flatMap((testCase) =>
        (testCase.results ?? []).map((result) => result.status),
      );
      specs.push({ title: spec.title, ok: spec.ok === true, statuses });
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of readJson(reportFile).suites ?? []) visit(suite);
  return specs;
}

function evaluateExample(entry, buildExitCode, specs) {
  const result = {
    exampleId: entry.id,
    packageName: entry.packageName,
    producer: entry.producer,
    build: { exitCode: buildExitCode, status: buildExitCode === 0 ? "pass" : "fail" },
    browser: null,
    surface: null,
    action: null,
    capture: null,
    assertion: null,
    screenshots: [],
    status: "fail",
    reasons: [],
  };
  if (buildExitCode !== 0) {
    result.reasons.push(`build exited with ${buildExitCode}`);
    return result;
  }

  const spec = specs.find(({ title }) => title.startsWith(`${entry.id}:`));
  result.browser = spec
    ? { test: spec.title, ok: spec.ok, statuses: spec.statuses }
    : { test: null, ok: false, statuses: [] };
  if (!spec) result.reasons.push("the browser test did not run");
  else if (!spec.ok) result.reasons.push(`the browser test ended ${spec.statuses.join(",") || "without a result"}`);

  const captureFile = join(artifactsDirectory, `${entry.id}.captures.json`);
  if (!existsSync(captureFile)) {
    result.reasons.push("no capture file was written");
    return result;
  }
  const captureBytes = readFileSync(captureFile);
  const capture = JSON.parse(captureBytes.toString("utf8"));
  result.surface = capture.surface;
  result.action = capture.action;
  if (!capture.surface) result.reasons.push("the main surface was not observed rendered");
  if (!capture.action) result.reasons.push("the action was not observed completed");
  if (capture.error) result.reasons.push(`flow error: ${capture.error}`);

  const envelopes = [];
  const sources = {};
  for (const record of capture.records ?? []) {
    const found = collectEnvelopes(record.payload);
    sources[record.source] ??= { records: 0, envelopes: 0 };
    sources[record.source].records += 1;
    sources[record.source].envelopes += found.length;
    for (const envelope of found) envelopes.push({ source: record.source, envelope });
  }
  const assertion = assertA2uiEnvelopes(envelopes.map(({ envelope }) => envelope));
  result.assertion = {
    ...assertion,
    failures: assertion.failures.map((failure) => ({
      ...failure,
      source: envelopes[failure.index].source,
      digest: envelopeDigest(envelopes[failure.index].envelope),
    })),
  };
  if (!assertion.ok) result.reasons.push(...assertion.reasons);

  const required = sources[entry.requiredSource]?.envelopes ?? 0;
  if (required === 0) {
    result.reasons.push(`no envelopes were captured from the producer source "${entry.requiredSource}"`);
  }
  const digests = [...new Set(envelopes.map(({ envelope }) => envelopeDigest(envelope)))];
  result.capture = {
    file: relativeToRoot(captureFile),
    sha256: sha256Hex(captureBytes),
    tap: capture.tap,
    requiredSource: entry.requiredSource,
    sources,
    envelopes: envelopes.length,
    distinctEnvelopeDigests: digests,
  };

  for (const name of capture.screenshots ?? []) {
    const path = join(artifactsDirectory, name);
    const present = existsSync(path) && statSync(path).size > 0;
    result.screenshots.push({
      path: relativeToRoot(path),
      sha256: present ? sha256Hex(readFileSync(path)) : null,
    });
    if (!present) result.reasons.push(`screenshot ${name} is missing or empty`);
  }
  if (result.screenshots.length === 0) result.reasons.push("no screenshot was taken");

  result.status = result.reasons.length === 0 ? "pass" : "fail";
  return result;
}

const report = {
  schemaVersion: 1,
  scenario: "UPG-14",
  name: "Examples run A2UI 1.0 end to end",
  argv: process.argv,
  cwd: workspaceRoot,
  node: process.version,
  startedAt,
  completedAt: null,
  artifactsDirectory: relativeToRoot(artifactsDirectory),
  commands,
  examples: [],
  fixtures: [],
  negativeControl: [],
  screenshots: [],
  status: "fail",
  exitCode: 1,
  error: null,
};

function writeReport() {
  report.completedAt = new Date().toISOString();
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

try {
  rmSync(artifactsDirectory, { recursive: true, force: true });
  mkdirSync(artifactsDirectory, { recursive: true });

  // Negative control inputs first: a fixture that does not match its recorded
  // digest is not the recording the migration task made.
  const manifestPath = resolve(workspaceRoot, PRE_MIGRATION_FIXTURE_DIRECTORY, "manifest.json");
  const fixtureManifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
  report.negativeControl = A2UI_EXAMPLES.map((entry) => negativeControl(entry, fixtureManifest));
  report.fixtures = report.negativeControl.map(({ exampleId, fixture, digest }) => ({
    exampleId,
    fixture,
    manifest: relativeToRoot(manifestPath),
    ...(digest ?? { recorded: null, actual: null, matches: false }),
  }));

  // Workspace dependencies once (agentic-a2ui resolves the packages from dist),
  // then each example's own build.
  const dependencyFilters = A2UI_EXAMPLES.flatMap((entry) => ["--filter", `${entry.packageName}^...`]);
  const dependencyExit = run("build-workspace-dependencies", "pnpm", [...dependencyFilters, "build"]);
  const builds = new Map();
  for (const entry of A2UI_EXAMPLES) {
    builds.set(
      entry.id,
      dependencyExit === 0 ? run(`build-${entry.id}`, "pnpm", ["--filter", entry.packageName, "build"]) : dependencyExit,
    );
  }

  const built = A2UI_EXAMPLES.filter((entry) => builds.get(entry.id) === 0).map((entry) => entry.id);
  let playwrightExit = null;
  if (built.length > 0) {
    playwrightExit = run(
      "browser-chromium",
      "pnpm",
      ["exec", "playwright", "test", "--config", PLAYWRIGHT_CONFIG],
      { A2UI_EXAMPLES_ARTIFACTS: artifactsDirectory, A2UI_EXAMPLES_ONLY: built.join(",") },
    );
  }

  const specs = playwrightSpecs(join(artifactsDirectory, "playwright-report.json"));
  report.examples = A2UI_EXAMPLES.map((entry) => evaluateExample(entry, builds.get(entry.id), specs));
  report.screenshots = report.examples.flatMap(({ screenshots }) => screenshots.map(({ path }) => path));

  const examplesPass = report.examples.every(({ status }) => status === "pass");
  const controlsPass = report.negativeControl.every(({ status }) => status === "pass");
  const browserPass = playwrightExit === 0;
  report.status = examplesPass && controlsPass && browserPass ? "pass" : "fail";
  report.exitCode = report.status === "pass" ? 0 : 1;
} catch (error) {
  report.error = error instanceof Error ? (error.stack ?? error.message) : String(error);
  report.status = "fail";
  report.exitCode = 1;
}

writeReport();
for (const example of report.examples) {
  const detail = example.reasons.length > 0 ? ` (${example.reasons.join("; ")})` : "";
  process.stdout.write(`[a2ui-examples] ${example.exampleId}: ${example.status}${detail}\n`);
}
for (const control of report.negativeControl) {
  const detail = control.reason ? ` (${control.reason})` : "";
  process.stdout.write(`[a2ui-examples] control ${control.exampleId}: ${control.status}${detail}\n`);
}
process.stdout.write(
  `[a2ui-examples] ${report.status.toUpperCase()}: report ${relativeToRoot(reportPath)}\n`,
);
process.exit(report.exitCode);
