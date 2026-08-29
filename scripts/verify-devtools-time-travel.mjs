import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  validatePackedManifestData,
  validateTarballFileList,
} from "./package-contract-validation.mjs";
import { PUBLIC_PACKAGES } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const corePackage = PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-core");
if (!corePackage) throw new Error("core package inventory is incomplete");

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-devtools-time-travel-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerDirectory = join(temporaryRoot, "consumer");
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  boundary: "assembled-multi-store-packed-consumer-time-travel",
  package: { payload: "pending", manifest: "pending", rootPayloadExclusion: "pending" },
  consumers: {
    rootOnlyEsm: "pending",
    esm: "pending",
    commonjs: "pending",
    typescriptNodeNext: "pending",
  },
  scenarios: {
    countEviction: "pending",
    byteEviction: "pending",
    oversizeCapture: "pending",
    stableExpiredCursors: "pending",
    rewindAndExactReturn: "pending",
    mutationWhileRewoundOrdering: "pending",
    importValidationAndConfirmation: "pending",
    multiStoreIsolation: "pending",
    teardown: "pending",
    rootCompatibilityEsm: "pending",
    rootCompatibilityCommonjs: "pending",
    rootOnlyUnavailable: "pending",
  },
};

try {
  await mkdir(tarballDirectory, { recursive: true });
  const packageDirectory = join(workspaceRoot, corePackage.directory);
  const packed = await run("pnpm", [
    "--dir",
    packageDirectory,
    "pack",
    "--pack-destination",
    tarballDirectory,
    "--json",
  ]);
  const packedResult = JSON.parse(packed.stdout);
  const tarballPath = resolve(packedResult.filename);
  const files = packedResult.files.map(({ path }) => path).sort();
  validateTarballFileList(corePackage, files);
  const manifest = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
  validatePackedManifestData(JSON.parse(manifest.stdout), workspaceRoot);
  report.package.payload = "pass";
  report.package.manifest = "pass";

  await writeConsumer(consumerDirectory, `file:${tarballPath}`);
  await run("pnpm", ["install", "--ignore-scripts"], { cwd: consumerDirectory });
  await verifyRootPayloadExclusion(consumerDirectory);
  report.package.rootPayloadExclusion = "pass";

  const rootOnly = await run("node", ["root-only.mjs"], { cwd: consumerDirectory });
  process.stdout.write(rootOnly.stdout);
  report.consumers.rootOnlyEsm = "pass";
  report.scenarios.rootOnlyUnavailable = "pass";

  const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
  process.stdout.write(esm.stdout);
  Object.assign(report.scenarios, JSON.parse(esm.stdout.trim().split("\n").at(-1)));
  report.consumers.esm = "pass";

  const commonjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(commonjs.stdout);
  report.consumers.commonjs = "pass";
  report.scenarios.rootCompatibilityCommonjs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumerDirectory });
  report.consumers.typescriptNodeNext = "pass";

  process.stdout.write("[devtools-time-travel] PASS: assembled packed acceptance gate.\n");
  if (reportPath) {
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function writeConsumer(directory, coreTarball) {
  await mkdir(directory, { recursive: true });
  const manifest = {
    name: "prometheus-devtools-time-travel-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": coreTarball,
      "@types/node": "25.5.0",
      typescript: "6.0.2",
    },
    pnpm: { overrides: { "@prometheus-ags/entity-graph-core": coreTarball } },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(join(directory, "root-only.mjs"), String.raw`
import assert from "node:assert/strict";
import {
  createGraphStore,
  getTimeTravelState,
  recordGraphSnapshot,
} from "@prometheus-ags/entity-graph-core";

const store = createGraphStore();
store.getState().upsertEntity("Task", "root-only", { id: "root-only", value: 1 });
assert.equal(recordGraphSnapshot("unavailable", store), -1);
assert.deepEqual(getTimeTravelState(store), { snapshots: [], cursor: null, capacity: 50 });
console.log("[devtools-time-travel] packed root-only ESM exclusion passed");
`);

  await writeFile(join(directory, "consumer.mjs"), String.raw`
import assert from "node:assert/strict";
import {
  configureTimeTravel,
  createGraphStore,
  getTimeTravelState,
  graphStore,
  recordGraphSnapshot,
  restoreGraphSnapshot,
  restoreGraphSnapshotBySeq,
  stepTimeTravel,
  subscribeTimeTravel,
} from "@prometheus-ags/entity-graph-core";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  attachGraphDevtools,
  createGraphDevtoolsClient,
  getGraphDevtoolsController,
} from "@prometheus-ags/entity-graph-core/devtools";

function graphData(store) {
  const state = store.getState();
  return structuredClone({
    entities: state.entities,
    patches: state.patches,
    entityStates: state.entityStates,
    syncMetadata: state.syncMetadata,
    lists: state.lists,
  });
}

function entityValue(store, id = "one") {
  return store.getState().entities.Task?.[id]?.value;
}

const storeA = createGraphStore();
const storeB = createGraphStore();
const attachmentA = attachGraphDevtools(storeA, {
  storeId: "time-a",
  snapshotLimit: 3,
  snapshotBytesLimit: 1024 * 1024,
  values: { mode: "include" },
});
const attachmentB = attachGraphDevtools(storeB, {
  storeId: "time-b",
  snapshotLimit: 8,
  snapshotBytesLimit: 1024 * 1024,
});
const controllerA = attachmentA.controller;
const controllerB = attachmentB.controller;
assert.ok(controllerA && controllerB);
assert.notEqual(controllerA, controllerB);
const clientA = createGraphDevtoolsClient(controllerA.storeId, controllerA.connect("time-client"));

const baselineCursor = controllerA.getSnapshotHistoryStatus().baselineCursor;
assert.equal(baselineCursor, 1);
storeA.getState().upsertEntity("Task", "one", { id: "one", value: 1 });
storeA.getState().replaceEntity("Task", "one", { id: "one", value: 2 });
storeA.getState().replaceEntity("Task", "one", { id: "one", value: 3 });
storeB.getState().upsertEntity("Task", "b-only", { id: "b-only", value: "b" });

const mutationEvents = controllerA.getHistory().filter((event) => event.type === "mutation");
assert.deepEqual(
  mutationEvents.map((event) => event.payload.snapshot.cursor),
  [2, 3, 4],
);
assert.ok(mutationEvents.every((event) => event.payload.snapshot.status === "retained"));
let statusA = controllerA.getSnapshotHistoryStatus();
assert.equal(statusA.retainedSnapshots, 3);
assert.equal(statusA.oldestCursor, 2);
assert.equal(statusA.newestCursor, 4);
assert.equal(statusA.latestCursor, 4);

const beforeExpiredAttempt = graphData(storeA);
const expiredBaseline = controllerA.rewind(baselineCursor);
assert.deepEqual(expiredBaseline, {
  status: "expired-history",
  cursor: 1,
  reason: "evicted",
  oldestCursor: 2,
  newestCursor: 4,
  latestCursor: 4,
});
assert.deepEqual(graphData(storeA), beforeExpiredAttempt);

const rewind = controllerA.rewind(2);
assert.equal(rewind.status, "rewound");
assert.equal(entityValue(storeA), 1);
assert.equal(entityValue(storeB, "b-only"), "b");
assert.equal(controllerB.getSnapshotHistoryStatus().mode, "live");
const returned = controllerA.returnToLive();
assert.equal(returned.status, "live");
assert.equal(entityValue(storeA), 3);
assert.equal(controllerA.getSnapshotHistoryStatus().mode, "live");

assert.equal(controllerA.rewind(3).status, "rewound");
assert.equal(entityValue(storeA), 2);
const historyBeforeBranch = controllerA.getHistory().length;
storeA.getState().replaceEntity("Task", "one", { id: "one", value: 20 });
assert.equal(entityValue(storeA), 20);
assert.equal(controllerA.getSnapshotHistoryStatus().mode, "live");
assert.equal(controllerA.returnToLive(), null);
const branchEvents = controllerA.getHistory().slice(historyBeforeBranch);
assert.deepEqual(branchEvents.map((event) => event.type), ["time-travel", "mutation"]);
assert.deepEqual(branchEvents[0].payload, {
  state: "live",
  cursor: null,
  previousCursor: 3,
  source: null,
  previousSource: "retained",
  reason: "mutation",
});
assert.equal(branchEvents[1].payload.snapshot.cursor, 5);
assert.equal(branchEvents[1].payload.snapshot.status, "retained");
assert.equal(controllerA.rewind(2).status, "expired-history");

const liveBeforeImport = graphData(storeA);
const importedData = structuredClone(liveBeforeImport);
importedData.entities.Task.one = { id: "one", value: 9001 };
const validImport = {
  protocol: GRAPH_DEVTOOLS_PROTOCOL,
  version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  storeId: controllerA.storeId,
  exportedAt: "2026-08-29T20:00:00.000Z",
  snapshots: [{
    cursor: 9001,
    capturedAt: "2026-08-29T19:59:00.000Z",
    eventSequence: null,
    data: importedData,
  }],
};
const wrongStoreInspection = await clientA.request("inspect-history-import", {
  candidate: { ...validImport, storeId: controllerB.storeId },
});
assert.equal(wrongStoreInspection.ok, true);
assert.equal(wrongStoreInspection.result.status, "rejected");
assert.equal(wrongStoreInspection.result.reason, "wrong-store");
assert.deepEqual(graphData(storeA), liveBeforeImport);
const wrongVersionInspection = await clientA.request("inspect-history-import", {
  candidate: { ...validImport, version: GRAPH_DEVTOOLS_PROTOCOL_VERSION + 1 },
});
assert.equal(wrongVersionInspection.result.status, "rejected");
assert.equal(wrongVersionInspection.result.reason, "unsupported-version");
const inspection = await clientA.request("inspect-history-import", { candidate: validImport });
assert.equal(inspection.ok, true);
assert.equal(inspection.result.status, "awaiting-confirmation");
assert.deepEqual(graphData(storeA), liveBeforeImport);
const deniedConfirmation = await clientA.request("confirm-history-import", {
  candidateId: inspection.result.candidateId,
  cursor: 9001,
  confirm: false,
});
assert.equal(deniedConfirmation.ok, false);
assert.equal(deniedConfirmation.error.code, "confirmation-required");
assert.deepEqual(graphData(storeA), liveBeforeImport);
const acceptedConfirmation = await clientA.request("confirm-history-import", {
  candidateId: inspection.result.candidateId,
  cursor: 9001,
  confirm: true,
});
assert.equal(acceptedConfirmation.ok, true);
assert.equal(acceptedConfirmation.result.status, "rewound");
assert.equal(acceptedConfirmation.result.source, "import");
assert.equal(entityValue(storeA), 9001);
assert.equal(controllerA.returnToLive().status, "live");
assert.deepEqual(graphData(storeA), liveBeforeImport);
const replayConfirmation = controllerA.confirmHistoryImport(inspection.result.candidateId, 9001);
assert.equal(replayConfirmation.status, "rejected");
assert.equal(replayConfirmation.reason, "candidate-not-found");

const byteStore = createGraphStore();
const byteAttachment = attachGraphDevtools(byteStore, {
  storeId: "byte-bound",
  snapshotLimit: 50,
  snapshotBytesLimit: 900,
});
const byteController = byteAttachment.controller;
for (let value = 1; value <= 5; value += 1) {
  byteStore.getState().replaceEntity("Payload", "one", {
    id: "one",
    value,
    content: "x".repeat(180),
  });
}
const byteStatus = byteController.getSnapshotHistoryStatus();
assert.ok(byteStatus.retainedBytes <= 900);
assert.ok(byteStatus.retainedSnapshots < 6);
assert.ok(byteStatus.oldestCursor > byteStatus.baselineCursor);

const oversizeStore = createGraphStore();
const oversizeAttachment = attachGraphDevtools(oversizeStore, {
  storeId: "oversize",
  snapshotLimit: 5,
  snapshotBytesLimit: 512,
});
const oversizeController = oversizeAttachment.controller;
oversizeStore.getState().upsertEntity("Payload", "large", {
  id: "large",
  content: "y".repeat(4096),
});
const oversizeEvent = oversizeController.getHistory().find((event) => event.type === "mutation");
assert.equal(oversizeEvent.payload.snapshot.status, "unavailable");
assert.equal(oversizeEvent.payload.snapshot.reason, "oversize");
const oversizeExpired = oversizeController.rewind(oversizeEvent.payload.snapshot.cursor);
assert.equal(oversizeExpired.status, "expired-history");
assert.equal(oversizeExpired.reason, "unavailable");
assert.equal(oversizeExpired.unavailableReason, "oversize");

let compatibilityNotifications = 0;
const rootAttachment = attachGraphDevtools(graphStore, {
  storeId: "root-compatibility",
  snapshotLimit: 4,
  snapshotBytesLimit: 1024 * 1024,
});
const unsubscribeCompatibility = subscribeTimeTravel(() => { compatibilityNotifications += 1; });
configureTimeTravel({ capacity: 2 });
graphStore.getState().upsertEntity("Legacy", "one", { id: "one", value: 1 });
const legacyOne = recordGraphSnapshot("legacy-one");
graphStore.getState().replaceEntity("Legacy", "one", { id: "one", value: 2 });
const legacyTwo = recordGraphSnapshot("legacy-two");
assert.notEqual(legacyOne, legacyTwo);
assert.deepEqual(getTimeTravelState().snapshots.map(({ seq, label }) => ({ seq, label })), [
  { seq: legacyOne, label: "legacy-one" },
  { seq: legacyTwo, label: "legacy-two" },
]);
assert.equal(restoreGraphSnapshot(0), true);
assert.equal(graphStore.getState().entities.Legacy.one.value, 1);
assert.equal(restoreGraphSnapshotBySeq(legacyTwo), true);
assert.equal(graphStore.getState().entities.Legacy.one.value, 2);
assert.equal(stepTimeTravel(-1), true);
assert.equal(graphStore.getState().entities.Legacy.one.value, 1);
assert.equal(stepTimeTravel(1), true);
assert.equal(graphStore.getState().entities.Legacy.one.value, 2);
assert.ok(compatibilityNotifications >= 6);
unsubscribeCompatibility();

const teardownStore = createGraphStore();
const teardownAttachment = attachGraphDevtools(teardownStore, { storeId: "teardown" });
const disposedController = teardownAttachment.controller;
teardownStore.getState().upsertEntity("Task", "before", { id: "before" });
teardownAttachment.detach();
assert.equal(disposedController.isDisposed(), true);
assert.equal(getGraphDevtoolsController(teardownStore), null);
assert.equal(disposedController.getHistory().length, 0);
assert.equal(disposedController.getSnapshotHistoryStatus().retainedSnapshots, 0);
teardownStore.getState().upsertEntity("Task", "after", { id: "after" });
assert.equal(disposedController.getHistory().length, 0);

clientA.disconnect();
attachmentA.detach();
attachmentB.detach();
byteAttachment.detach();
oversizeAttachment.detach();
rootAttachment.detach();

console.log("[devtools-time-travel] packed Node ESM integration passed");
console.log(JSON.stringify({
  countEviction: "pass",
  byteEviction: "pass",
  oversizeCapture: "pass",
  stableExpiredCursors: "pass",
  rewindAndExactReturn: "pass",
  mutationWhileRewoundOrdering: "pass",
  importValidationAndConfirmation: "pass",
  multiStoreIsolation: "pass",
  teardown: "pass",
  rootCompatibilityEsm: "pass"
}));
`);

  await writeFile(join(directory, "consumer.cjs"), String.raw`
const assert = require("node:assert/strict");
const core = require("@prometheus-ags/entity-graph-core");
const store = core.createGraphStore();
store.getState().upsertEntity("Task", "one", { id: "one", value: 0 });
assert.equal(core.recordGraphSnapshot("before-devtools", store), -1);
const devtools = require("@prometheus-ags/entity-graph-core/devtools");
const attachment = devtools.attachGraphDevtools(store, {
  storeId: "cjs-time-travel",
  snapshotLimit: 4,
});
store.getState().replaceEntity("Task", "one", { id: "one", value: 1 });
const one = core.recordGraphSnapshot("one", store);
store.getState().replaceEntity("Task", "one", { id: "one", value: 2 });
const two = core.recordGraphSnapshot("two", store);
assert.notEqual(one, two);
assert.equal(core.restoreGraphSnapshotBySeq(one, store), true);
assert.equal(store.getState().entities.Task.one.value, 1);
assert.equal(core.restoreGraphSnapshotBySeq(two, store), true);
assert.equal(store.getState().entities.Task.one.value, 2);
assert.deepEqual(core.getTimeTravelState(store).snapshots.map((snapshot) => snapshot.label), ["one", "two"]);
attachment.detach();
console.log("[devtools-time-travel] packed CommonJS root compatibility passed");
`);

  await writeFile(join(directory, "consumer.mts"), String.raw`
import {
  createGraphStore,
  getTimeTravelState,
  recordGraphSnapshot,
  restoreGraphSnapshotBySeq,
  type TimeTravelState,
} from "@prometheus-ags/entity-graph-core";
import {
  attachGraphDevtools,
  type GraphDevtoolsExpiredHistoryReceipt,
  type GraphDevtoolsHistoryImportEnvelope,
  type GraphDevtoolsHistoryImportInspectionResult,
  type GraphDevtoolsRewindResult,
  type GraphDevtoolsSnapshotHistoryStatus,
  type GraphDevtoolsSnapshotReference,
} from "@prometheus-ags/entity-graph-core/devtools";

const store = createGraphStore();
const attachment = attachGraphDevtools(store, { snapshotLimit: 3 });
if (!attachment.controller) throw new Error("controller unavailable");
const status: GraphDevtoolsSnapshotHistoryStatus = attachment.controller.getSnapshotHistoryStatus();
const references: ReadonlyArray<Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>> =
  attachment.controller.getSnapshotReferences();
const rewind: GraphDevtoolsRewindResult | null = attachment.controller.rewind(1);
const expired: GraphDevtoolsExpiredHistoryReceipt | undefined =
  rewind?.status === "expired-history" ? rewind : undefined;
const envelope: GraphDevtoolsHistoryImportEnvelope | undefined = undefined;
const inspection: GraphDevtoolsHistoryImportInspectionResult | undefined = envelope
  ? attachment.controller.inspectHistoryImport(envelope)
  : undefined;
const sequence: number = recordGraphSnapshot("typed", store);
const legacy: TimeTravelState = getTimeTravelState(store);
const restored: boolean = restoreGraphSnapshotBySeq(sequence, store);
void status;
void references;
void expired;
void inspection;
void legacy;
void restored;
attachment.detach();
`);
  await writeFile(join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2023",
      lib: ["ES2023", "DOM"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node"],
    },
    files: ["consumer.mts"],
  }, null, 2)}\n`);
}

async function verifyRootPayloadExclusion(consumerDirectory) {
  const packageDirectory = join(
    consumerDirectory,
    "node_modules",
    "@prometheus-ags",
    "entity-graph-core",
  );
  const forbidden = [
    "attachGraphDevtools",
    "createGraphDevtoolsSnapshotHistory",
    "GRAPH_DEVTOOLS_PROTOCOL_VERSION",
  ];
  const visited = new Set();

  async function inspect(relativeFile) {
    if (visited.has(relativeFile)) return;
    visited.add(relativeFile);
    const source = await readFile(join(packageDirectory, relativeFile), "utf8");
    for (const marker of forbidden) {
      if (source.includes(marker)) {
        throw new Error(`core root payload ${relativeFile} includes optional DevTools marker ${marker}`);
      }
    }
    const dependencies = relativeFile.endsWith(".mjs")
      ? source.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.mjs)["']/g)
      : source.matchAll(/require\(["'](\.\/[^"']+\.cjs)["']\)/g);
    for (const match of dependencies) {
      await inspect(join("dist", match[1].slice(2)));
    }
  }

  await inspect("dist/index.mjs");
  await inspect("dist/index.cjs");
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, { cause: error });
  }
}
