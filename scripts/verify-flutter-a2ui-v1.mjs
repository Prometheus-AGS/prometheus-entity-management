#!/usr/bin/env node
/**
 * UPG-18: the Flutter showcase renders A2UI 1.0 through the official
 * a2ui_flutter 0.3.0 renderer on a booted iOS simulator.
 *
 *   node scripts/verify-flutter-a2ui-v1.mjs --report <file> [--device <name|udid>]
 *
 * Steps:
 *   1. The example pubspec pins a2ui_flutter 0.3.0 and a2ui_core 0.7.0 and does
 *      not name genui; the workspace pubspec.lock resolves those versions and
 *      contains no genui package.
 *   2. Boot the simulator (default "iPhone 17 Pro") unless it is already booted.
 *   3. Run integration_test/mobile_smoke_test.dart on it. The test renders the
 *      task board's A2UI 1.0 surface, presses a denied action (denial receipt,
 *      no graph change) and an allowed one (receipt and graph change), then loads
 *      a batch with an unknown component (refusal shown, nothing rendered,
 *      nothing written).
 *   4. Negative control: run a copy of that test whose denied-delete expectation
 *      is flipped to "allowed"; it must FAIL, which shows the receipts are read.
 *   5. Shut the simulator down if this script booted it; write the report.
 *
 * Exit code is non-zero when any pin check fails, the integration test fails,
 * or the negative control passes.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(workspaceRoot, "examples/flutter-riverpod");
const TEST_FILE = "integration_test/mobile_smoke_test.dart";
const CONTROL_FILE = "integration_test/negative_control_generated_test.dart";
const CONTROL_FROM = "find.text('task.delete · denied')";
const CONTROL_TO = "find.text('task.delete · allowed')";
const DEFAULT_DEVICE = "iPhone 17 Pro";
const SURFACE_MESSAGE_SOURCES = [
  "lib/a2ui/surface_messages.dart",
  "lib/features/a2ui/infrastructure/deterministic_fixture.dart",
  "lib/features/a2ui/application/a2ui_surface_store.dart",
];
const RUN_TIMEOUT_MS = 20 * 60 * 1000;

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
};
const reportArg = option("--report");
if (!reportArg) {
  console.error("usage: node scripts/verify-flutter-a2ui-v1.mjs --report <file> [--device <name|udid>]");
  process.exit(2);
}
const reportPath = resolve(process.cwd(), reportArg);
const deviceArg = option("--device") ?? DEFAULT_DEVICE;
const commands = [];
const report = { schemaVersion: 1, scenario: "UPG-18", recordedAt: new Date().toISOString(), argv: process.argv.slice(1) };

function writeReport(extra) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify({ ...report, ...extra, commands }, null, 2)}\n`);
}

function run(label, command, commandArgs, { cwd = exampleRoot, timeout = RUN_TIMEOUT_MS } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
    maxBuffer: 200 * 1024 * 1024,
    timeout,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const exitCode = result.status ?? (result.error ? 127 : 1);
  commands.push({ label, argv: [command, ...commandArgs], cwd: relative(workspaceRoot, cwd) || ".", startedAt, completedAt: new Date().toISOString(), exitCode });
  return { exitCode, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** Output of a run whose iOS app failed to build or launch (no test assertion ran). */
const APP_START_FAILURE = /Failed to build iOS app|Unable to start the app on the device/;

/**
 * Run one integration file on the simulator. A first cold Xcode build can fail to link the
 * Flutter framework; only when the app did not build or launch is the run repeated, once, and
 * both attempts are recorded. A failed test assertion is never retried.
 */
function runOnDevice(label, file, udid) {
  const attempts = [];
  let result = run(label, "flutter", ["test", file, "-d", udid, "--reporter", "expanded"]);
  attempts.push({ exitCode: result.exitCode, appStartFailure: APP_START_FAILURE.test(`${result.stdout}\n${result.stderr}`) });
  if (result.exitCode !== 0 && attempts[0].appStartFailure) {
    result = run(`${label} (retry after app build/launch failure)`, "flutter", ["test", file, "-d", udid, "--reporter", "expanded"]);
    attempts.push({ exitCode: result.exitCode, appStartFailure: APP_START_FAILURE.test(`${result.stdout}\n${result.stderr}`) });
  }
  return { ...result, attempts };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** version of a package in pubspec.lock, or undefined when absent */
function lockedVersion(lock, name) {
  const match = new RegExp(`^  ${name}:\\n(?:    .*\\n|      .*\\n)*?    version: "([^"]+)"`, "m").exec(lock);
  return match?.[1];
}

function checkPins() {
  const pubspec = readFileSync(join(exampleRoot, "pubspec.yaml"), "utf8");
  const lock = readFileSync(join(workspaceRoot, "pubspec.lock"), "utf8");
  const pins = {
    pubspec: {
      a2uiFlutter: /^\s+a2ui_flutter:\s*0\.3\.0\s*$/m.test(pubspec),
      a2uiCore: /^\s+a2ui_core:\s*0\.7\.0\s*$/m.test(pubspec),
      noGenui: !/^\s+genui\b/m.test(pubspec),
    },
    lock: {
      a2uiFlutter: lockedVersion(lock, "a2ui_flutter") ?? null,
      a2uiCore: lockedVersion(lock, "a2ui_core") ?? null,
      genui: lockedVersion(lock, "genui") ?? null,
    },
    digests: { pubspec: sha256(join(exampleRoot, "pubspec.yaml")), lock: sha256(join(workspaceRoot, "pubspec.lock")) },
    // The showcase's own A2UI 1.0 surface messages the integration test renders (UPG-18 fixtures).
    surfaceMessages: Object.fromEntries(SURFACE_MESSAGE_SOURCES.map((path) => [path, sha256(join(exampleRoot, path))])),
  };
  const problems = [];
  if (!pins.pubspec.a2uiFlutter) problems.push("example pubspec does not pin a2ui_flutter 0.3.0");
  if (!pins.pubspec.a2uiCore) problems.push("example pubspec does not pin a2ui_core 0.7.0");
  if (!pins.pubspec.noGenui) problems.push("example pubspec still names genui");
  if (pins.lock.a2uiFlutter !== "0.3.0") problems.push(`pubspec.lock resolves a2ui_flutter ${pins.lock.a2uiFlutter}`);
  if (pins.lock.a2uiCore !== "0.7.0") problems.push(`pubspec.lock resolves a2ui_core ${pins.lock.a2uiCore}`);
  if (pins.lock.genui !== null) problems.push(`pubspec.lock still resolves genui ${pins.lock.genui}`);
  return { pins, problems };
}

function findDevice() {
  const listing = run("list simulators", "xcrun", ["simctl", "list", "devices", "available", "--json"], { cwd: workspaceRoot, timeout: 60_000 });
  if (listing.exitCode !== 0) return undefined;
  const devices = Object.entries(JSON.parse(listing.stdout).devices).flatMap(([runtime, list]) =>
    list.map((device) => ({ ...device, runtime })));
  return devices.find((device) => device.udid === deviceArg) ?? devices.find((device) => device.name === deviceArg && /iOS/.test(device.runtime));
}

const { pins, problems } = checkPins();
if (problems.length > 0) {
  writeReport({ status: "FAIL", exitCode: 1, pins, problems });
  console.error(`verify-flutter-a2ui-v1: ${problems.join("; ")}`);
  process.exit(1);
}

const device = findDevice();
if (!device) {
  writeReport({ status: "error", exitCode: 1, pins, problems: [`no available iOS simulator named or with udid ${deviceArg}`] });
  console.error(`verify-flutter-a2ui-v1: no available iOS simulator ${deviceArg}`);
  process.exit(1);
}
const bootedByVerifier = device.state !== "Booted";
const flutterVersion = /Flutter (\S+)/.exec(run("flutter version", "flutter", ["--version"], { timeout: 120_000 }).stdout)?.[1] ?? "unknown";

let integration;
let negativeControl;
try {
  if (bootedByVerifier) {
    const boot = run("boot simulator", "xcrun", ["simctl", "boot", device.udid], { cwd: workspaceRoot, timeout: 120_000 });
    if (boot.exitCode !== 0) throw new Error(`simulator ${device.udid} did not boot`);
  }
  run("wait for simulator", "xcrun", ["simctl", "bootstatus", device.udid, "-b"], { cwd: workspaceRoot, timeout: 600_000 });

  const main = runOnDevice("integration test", TEST_FILE, device.udid);
  integration = {
    file: `examples/flutter-riverpod/${TEST_FILE}`,
    sha256: sha256(join(exampleRoot, TEST_FILE)),
    exitCode: main.exitCode,
    attempts: main.attempts,
    passed: main.exitCode === 0 && /All tests passed!/.test(main.stdout),
  };

  const source = readFileSync(join(exampleRoot, TEST_FILE), "utf8");
  if (!source.includes(CONTROL_FROM)) throw new Error(`negative control anchor ${CONTROL_FROM} is missing from ${TEST_FILE}`);
  writeFileSync(join(exampleRoot, CONTROL_FILE), source.replace(CONTROL_FROM, CONTROL_TO));
  const control = runOnDevice("negative control (denied delete expected as allowed)", CONTROL_FILE, device.udid);
  negativeControl = {
    mutation: { file: `examples/flutter-riverpod/${CONTROL_FILE}`, from: CONTROL_FROM, to: CONTROL_TO },
    exitCode: control.exitCode,
    attempts: control.attempts,
    // It must fail on the flipped assertion, not because the app never started.
    failed: control.exitCode !== 0 && !APP_START_FAILURE.test(`${control.stdout}\n${control.stderr}`)
      && /task\.delete · allowed/.test(`${control.stdout}\n${control.stderr}`),
  };
} catch (cause) {
  writeReport({ status: "error", exitCode: 1, pins, device, bootedByVerifier, flutterVersion, integration, negativeControl, error: cause instanceof Error ? cause.message : String(cause) });
  console.error(`verify-flutter-a2ui-v1: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
} finally {
  rmSync(join(exampleRoot, CONTROL_FILE), { force: true });
  if (bootedByVerifier) run("shut down simulator", "xcrun", ["simctl", "shutdown", device.udid], { cwd: workspaceRoot, timeout: 120_000 });
}
if (process.exitCode === 1) process.exit(1);

const failed = !integration?.passed || !negativeControl?.failed;
writeReport({
  status: failed ? "FAIL" : "PASS",
  exitCode: failed ? 1 : 0,
  pins,
  device: { name: device.name, udid: device.udid, runtime: device.runtime },
  bootedByVerifier,
  flutterVersion,
  integration,
  negativeControl,
});
console.log(`verify-flutter-a2ui-v1: integration ${integration?.passed ? "PASS" : "FAIL"}; negative control ${negativeControl?.failed ? "failed as required" : "DID NOT FAIL"}; report ${relative(workspaceRoot, reportPath)}`);
process.exit(failed ? 1 : 0);
