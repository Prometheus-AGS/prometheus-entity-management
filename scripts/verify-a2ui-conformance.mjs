#!/usr/bin/env node
/**
 * UPG-3: run the pinned upstream A2UI framework-adapter conformance suites
 * (core/adapter_conformance.yaml, core/accessibility.yaml) against the BUILT
 * @prometheus-ags/a2ui-react in Chromium, with a mutated-case negative control.
 *
 *   node scripts/verify-a2ui-conformance.mjs --report <file>
 *
 * Steps: build entity-graph-core and a2ui-react; verify every vendored file's
 * SHA-256 against tests/conformance/a2ui/upstream/manifest.json (abort on any
 * mismatch or unlisted file); run tests/browser/a2ui-conformance.spec.ts; apply
 * tests/conformance/a2ui/divergences.json; run a mutated copy of one adapter
 * case and require it to FAIL; write the report.
 *
 * A case listed in divergences.json is DIVERGED (excused) only when every
 * failure it records is one of its listed (step, assertion) pairs. Any other
 * failure makes it FAIL, and an entry naming no loaded case fails the run. Two
 * controls replay the evaluation with a broken copy of the list (an entry for
 * a case that does not exist, and a diverged case with one allowance removed)
 * and require both to fail.
 *
 * Exit code is non-zero when any case FAILs or goes unrecorded, the list is
 * invalid, or any negative control does not fail.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRoot = join(workspaceRoot, "tests/conformance/a2ui/upstream");
const playwrightConfig = "tests/browser/a2ui-conformance.playwright.config.ts";
const SUITES = ["core/adapter_conformance.yaml", "core/accessibility.yaml"];
const DIVERGENCES_PATH = join(workspaceRoot, "tests/conformance/a2ui/divergences.json");
const REASON_CLASSES = new Set(["security-policy", "upstream-renderer-gap", "not-observable-through-public-API"]);
const NEGATIVE_CONTROL_CASE = "tree_hierarchy_declared_order";
const MUTATION_MARKER = " [mutated by negative control]";
const OWN_FILES = new Set(["manifest.json", "NOTICE"]);

const reportFlag = process.argv.indexOf("--report");
const reportArg = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
if (!reportArg || reportArg.startsWith("--")) {
  console.error("usage: node scripts/verify-a2ui-conformance.mjs --report <file>");
  process.exit(2);
}
const reportPath = resolve(process.cwd(), reportArg);
const artifactsRoot = join(dirname(reportPath), `${basename(reportPath).replace(/\.json$/, "")}-artifacts`);
const commands = [];

function run(label, command, args, env = {}, { allowFailure = false } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: workspaceRoot, stdio: "inherit", env: { ...process.env, ...env } });
  const exitCode = result.status ?? (result.error ? 127 : 1);
  commands.push({ label, argv: [command, ...args], env, startedAt, exitCode });
  if (exitCode !== 0 && !allowFailure) fail(`${label} exited with ${exitCode}`);
  return exitCode;
}

function writeReport(report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function fail(message, extra = {}) {
  writeReport({ schemaVersion: 1, scenario: "UPG-3", recordedAt: new Date().toISOString(), argv: process.argv.slice(1), status: "error", error: message, commands, ...extra });
  console.error(`verify-a2ui-conformance: ${message}`);
  process.exit(1);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function listFiles(root) {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? listFiles(path) : [relative(upstreamRoot, path).split("\\").join("/")];
  });
}

function verifyPinnedSuite() {
  const manifest = JSON.parse(readFileSync(join(upstreamRoot, "manifest.json"), "utf8"));
  const fileDigests = {};
  const problems = [];
  for (const [path, entry] of Object.entries(manifest.files)) {
    const absolute = join(upstreamRoot, path);
    if (!existsSync(absolute)) {
      problems.push(`missing ${path}`);
      continue;
    }
    const actual = sha256(absolute);
    fileDigests[path] = { sha256: actual, source: entry.source };
    if (actual !== entry.sha256) problems.push(`${path}: sha256 ${actual} != manifest ${entry.sha256}`);
  }
  for (const path of listFiles(upstreamRoot)) {
    if (!OWN_FILES.has(path) && !(path in manifest.files)) problems.push(`unlisted file ${path}`);
  }
  if (problems.length > 0) fail(`pinned suite does not match its manifest: ${problems.join("; ")}`, { fileDigests });
  return { manifest, fileDigests };
}

function readResults(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function runSpec(label, outDir, extraEnv = {}) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const resultsPath = join(outDir, "results.jsonl");
  const exitCode = run(label, "pnpm", ["exec", "playwright", "test", "--config", playwrightConfig], {
    A2UI_CONFORMANCE_RESULTS: resultsPath,
    A2UI_CONFORMANCE_OUT_DIR: outDir,
    ...extraEnv,
  }, { allowFailure: true });
  return { exitCode, entries: readResults(resultsPath) };
}

/** The assertion a harness failure message belongs to, or an `unclassified:` key no entry can allow. */
function assertionOf(message) {
  const unobservable = /^harness cannot observe (\w+)/.exec(message);
  if (unobservable) return unobservable[1];
  const axe = /^axeCore ([\w-]+):/.exec(message);
  if (axe) return `axeCore:${axe[1]}`;
  if (/^outbound\[\d+\] fails renderer_to_agent\.json/.test(message)) return "outboundSchema";
  if (message.startsWith("accessibility(")) return "expectAccessibilityTree";
  if (/^root([/.:\s]|$)/.test(message)) return "expectViewTree";
  const keyed = /^(expect[A-Za-z]+)/.exec(message);
  return keyed ? keyed[1] : `unclassified:${message.slice(0, 60)}`;
}

/** `steps[<i>] <message>` → { step, assertion }; failures outside a step (page errors) have no step. */
function classify(failure) {
  const stepped = /^steps\[(\d+)\] ([\s\S]*)$/.exec(failure);
  return stepped
    ? { step: Number(stepped[1]), assertion: assertionOf(stepped[2]), failure }
    : { step: null, assertion: `unclassified:${failure.slice(0, 60)}`, failure };
}

function loadDivergences() {
  const raw = readFileSync(DIVERGENCES_PATH);
  const document = JSON.parse(raw.toString("utf8"));
  return { sha256: createHash("sha256").update(raw).digest("hex"), entries: document.divergences ?? [] };
}

/**
 * Apply a divergence list to the recorded cases. Returns the per-case results
 * and the list-level problems; pure, so the controls can replay it.
 */
function evaluate(recordedCases, entries) {
  const problems = [];
  const byCase = new Map();
  for (const [index, entry] of entries.entries()) {
    const where = `divergences[${index}]`;
    const key = `${entry.suite}#${entry.case}`;
    if (!SUITES.includes(entry.suite) || !suiteCases[entry.suite]?.some((testCase) => testCase.name === entry.case)) {
      problems.push(`${where} names no loaded case: ${key}`);
      continue;
    }
    if (!REASON_CLASSES.has(entry.reasonClass)) problems.push(`${where} has unknown reasonClass ${JSON.stringify(entry.reasonClass)}`);
    if (typeof entry.reason !== "string" || entry.reason.length < 20) problems.push(`${where} needs a reason`);
    if (!Array.isArray(entry.allowedFailures) || entry.allowedFailures.length === 0) problems.push(`${where} lists no allowed failures`);
    if (byCase.has(key)) problems.push(`${where} duplicates the entry for ${key}`);
    byCase.set(key, entry);
  }
  const cases = recordedCases.map((result) => {
    const entry = byCase.get(`${result.suite}#${result.name}`);
    if (!entry) return result;
    const divergence = { reasonClass: entry.reasonClass, allowedFailures: entry.allowedFailures };
    if (result.status === "PASS") return { ...result, divergence: { ...divergence, outcome: "not-exercised: the case passed" } };
    const allowed = new Set((entry.allowedFailures ?? []).map((item) => `${item.step}|${item.assertion}`));
    const classified = (result.failures ?? []).map(classify);
    const disallowed = classified.filter((item) => !allowed.has(`${item.step}|${item.assertion}`));
    if (classified.length > 0 && disallowed.length === 0) {
      return { ...result, status: "DIVERGED", divergence: { ...divergence, outcome: "excused", observed: classified } };
    }
    const why = classified.length === 0 ? ["no failure was recorded"] : disallowed.map((item) => `[${item.step ?? "-"}|${item.assertion}] ${item.failure}`);
    return { ...result, status: "FAIL", reason: `listed divergence failed outside its allowances: ${why.slice(0, 4).join(" | ")}`, divergence: { ...divergence, outcome: "rejected", disallowed } };
  });
  return { cases, problems };
}

/** Append the marker to the first expected `text` in an expectViewTree; returns where. */
function mutateFirstText(testCase) {
  const visit = (node, path) => {
    if (!node || typeof node !== "object") return undefined;
    if (typeof node.text === "string") {
      const from = node.text;
      node.text = `${from}${MUTATION_MARKER}`;
      return { path: `${path}.text`, from, to: node.text };
    }
    for (const [index, child] of (node.children ?? []).entries()) {
      const found = visit(child, `${path}.children[${index}]`);
      if (found) return found;
    }
    return undefined;
  };
  for (const [index, step] of (testCase.steps ?? []).entries()) {
    const found = visit(step.expectViewTree, `steps[${index}].expectViewTree`);
    if (found) return found;
  }
  return undefined;
}

run("build entity-graph-core", "pnpm", ["--filter", "@prometheus-ags/entity-graph-core", "build"]);
run("build a2ui-react", "pnpm", ["--filter", "@prometheus-ags/a2ui-react", "build"]);
const { manifest, fileDigests } = verifyPinnedSuite();
const packageJson = JSON.parse(readFileSync(join(workspaceRoot, "packages/a2ui-react/package.json"), "utf8"));
const builtEntry = join("packages/a2ui-react", packageJson.exports["."].default);
const builtEntryDigest = sha256(join(workspaceRoot, builtEntry));

const suiteCases = Object.fromEntries(
  SUITES.map((suite) => [suite, parse(readFileSync(join(upstreamRoot, "conformance", suite), "utf8"))]),
);
const divergences = loadDivergences();
const main = runSpec("conformance suites (Chromium)", join(artifactsRoot, "main"));
const recorded = main.entries.filter((entry) => entry.kind === "case");
const recordedCases = [];
const problems = [];
for (const suite of SUITES) {
  for (const testCase of suiteCases[suite]) {
    const matches = recorded.filter((entry) => entry.suite === suite && entry.name === testCase.name);
    if (matches.length > 1) problems.push(`DUPLICATE ${suite}#${testCase.name}`);
    const entry = matches[0];
    recordedCases.push(entry
      ? { suite, name: entry.name, status: entry.status, ...(entry.reason ? { reason: entry.reason } : {}), ...(entry.notes?.length ? { notes: entry.notes } : {}), failures: entry.failures, steps: entry.steps }
      : { suite, name: testCase.name, status: "FAIL", reason: "MISSING: the spec recorded no result for this case", failures: [] });
  }
}
for (const entry of recorded) {
  if (!suiteCases[entry.suite]?.some((testCase) => testCase.name === entry.name)) problems.push(`UNKNOWN_CASE ${entry.suite}#${entry.name}`);
}
const evaluation = evaluate(recordedCases, divergences.entries);
const cases = evaluation.cases;
problems.push(...evaluation.problems);

const counts = { total: cases.length, PASS: 0, DIVERGED: 0, FAIL: 0 };
for (const entry of cases) counts[entry.status] += 1;

// Divergence controls: a broken list must fail the run.
const divergenceControls = [];
{
  const phantom = [...divergences.entries, { suite: SUITES[0], case: "no_such_case_negative_control", reasonClass: "security-policy", reason: "negative control: names a case the suite does not contain", allowedFailures: [{ step: 0, assertion: "expectViewTree" }] }];
  const replay = evaluate(recordedCases, phantom);
  divergenceControls.push({ control: "entry naming no loaded case", failedRun: replay.problems.some((problem) => problem.includes("no_such_case_negative_control")) });
  const target = cases.find((entry) => entry.status === "DIVERGED");
  if (target) {
    const removed = target.divergence.observed[0];
    const narrowed = divergences.entries.map((entry) => entry.case === target.name && entry.suite === target.suite
      ? { ...entry, allowedFailures: entry.allowedFailures.filter((item) => !(item.step === removed.step && item.assertion === removed.assertion)).concat(entry.allowedFailures.length === 1 ? [{ step: removed.step, assertion: "expectNoSuchAssertion" }] : []) }
      : entry);
    const narrowedReplay = evaluate(recordedCases, narrowed);
    const after = narrowedReplay.cases.find((entry) => entry.suite === target.suite && entry.name === target.name);
    divergenceControls.push({ control: "diverged case failing outside its allowances", case: target.name, removedAllowance: { step: removed.step, assertion: removed.assertion }, failedRun: after?.status === "FAIL" });
  } else if (divergences.entries.length > 0) {
    // No listed case diverged (every divergence fixed): exercise the rejection on a constructed record instead.
    const entry = divergences.entries[0];
    const allowed = entry.allowedFailures[0];
    const synthetic = recordedCases.map((recordedCase) => recordedCase.suite === entry.suite && recordedCase.name === entry.case
      ? { ...recordedCase, status: "FAIL", failures: [`steps[${allowed.step}] ${allowed.assertion.startsWith("axeCore:") ? `axeCore ${allowed.assertion.slice(8)}: constructed allowed failure` : `${allowed.assertion}: constructed allowed failure`}`, `steps[${allowed.step}] expectNoSuchAssertion: constructed disallowed failure`] }
      : recordedCase);
    const after = evaluate(synthetic, divergences.entries).cases.find((item) => item.suite === entry.suite && item.name === entry.case);
    divergenceControls.push({ control: "diverged case failing outside its allowances", case: entry.case, constructed: true, failedRun: after?.status === "FAIL" });
  } else {
    divergenceControls.push({ control: "diverged case failing outside its allowances", failedRun: true, reason: "the divergence list is empty, so nothing can excuse a failure" });
  }
}

// Negative control: a mutated copy of a case that passed must fail on the mutation.
const passing = cases.filter((entry) => entry.suite === SUITES[0] && entry.status === "PASS").map((entry) => entry.name);
const candidates = [NEGATIVE_CONTROL_CASE, ...passing.filter((name) => name !== NEGATIVE_CONTROL_CASE)];
let negativeControl = { case: NEGATIVE_CONTROL_CASE, status: "NOT_EXERCISED", reason: "no adapter case with an expected text passed, so a mutation could not be shown to be the cause of a failure" };
const chosen = candidates
  .map((name) => structuredClone(suiteCases[SUITES[0]].find((testCase) => testCase.name === name)))
  .map((testCase) => ({ testCase, mutation: testCase ? mutateFirstText(testCase) : undefined }))
  .find(({ testCase, mutation }) => testCase && mutation && passing.includes(testCase.name));
if (chosen) {
  const outDir = join(artifactsRoot, "negative-control");
  const casesFile = join(artifactsRoot, "negative-control-case.json");
  mkdirSync(artifactsRoot, { recursive: true });
  writeFileSync(casesFile, `${JSON.stringify({ suite: SUITES[0], cases: [chosen.testCase] }, null, 2)}\n`);
  const negative = runSpec("negative control (mutated case)", outDir, { A2UI_CONFORMANCE_CASES_FILE: casesFile });
  const entry = negative.entries.find((item) => item.kind === "case");
  const failedOnMutation = (entry?.failures ?? []).some((failure) => failure.includes(MUTATION_MARKER));
  negativeControl = {
    case: chosen.testCase.name,
    mutation: chosen.mutation,
    originalStatus: "PASS",
    status: entry?.status ?? "MISSING",
    failedOnMutation,
    ...(entry?.reason ? { reason: entry.reason } : {}),
    casesFile: relative(workspaceRoot, casesFile),
  };
}

if (main.exitCode !== 0) problems.push(`playwright exited with ${main.exitCode} (the spec records results and does not assert)`);
const failed = counts.FAIL > 0 || problems.length > 0 || negativeControl.status !== "FAIL" || !negativeControl.failedOnMutation
  || divergenceControls.some((control) => !control.failedRun);
const report = {
  schemaVersion: 1,
  scenario: "UPG-3",
  recordedAt: new Date().toISOString(),
  argv: process.argv.slice(1),
  repository: manifest.repository,
  commit: manifest.commit,
  fileDigests,
  builtPackage: { name: packageJson.name, version: packageJson.version, entry: builtEntry, sha256: builtEntryDigest },
  browser: "chromium (Playwright devices['Desktop Chrome'])",
  divergences: { path: relative(workspaceRoot, DIVERGENCES_PATH), sha256: divergences.sha256, entries: divergences.entries.length },
  cases,
  counts,
  allPassed: counts.PASS === counts.total && problems.length === 0,
  problems,
  negativeControl,
  divergenceControls,
  playwright: { mainExitCode: main.exitCode },
  commands,
  status: failed ? "FAIL" : "PASS",
  exitCode: failed ? 1 : 0,
};
writeReport(report);
console.log(`verify-a2ui-conformance: ${counts.PASS} pass, ${counts.DIVERGED} diverged (listed), ${counts.FAIL} fail of ${counts.total}; negative control ${negativeControl.status}; divergence controls ${divergenceControls.map((control) => (control.failedRun ? "ok" : "MISSED")).join("/")}; report ${relative(workspaceRoot, reportPath)}`);
process.exit(report.exitCode);
