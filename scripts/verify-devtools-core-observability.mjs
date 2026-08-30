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

const selected = [
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-core"),
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/prometheus-entity-management"),
];
if (selected.some((entry) => !entry)) throw new Error("core/React package inventory is incomplete");

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-devtools-core-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerDirectory = join(temporaryRoot, "consumer");
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  boundary: "assembled-packed-consumer",
  packages: {},
  consumers: { esm: "pending", commonjs: "pending", typescriptNodeNext: "pending" },
  scenarios: {
    semanticEventCompleteness: "pending",
    batchAndCoalescing: "pending",
    multiStoreIsolation: "pending",
    multipleClients: "pending",
    disabledMode: "pending",
    compatibilityDelegates: "pending",
    boundedHistory: "pending",
    eventByteLimit: "pending",
    teardown: "pending",
    valuePolicyBoundary: "pending",
    rootPayloadExclusion: "pending",
    skillsLedger: "pending",
  },
};

try {
  await mkdir(tarballDirectory, { recursive: true });
  await run("node", ["scripts/verify-skills-exports.mjs", "--pkg", "core"]);
  report.scenarios.skillsLedger = "pass";
  const tarballs = {};
  for (const publicPackage of selected) {
    const packageDirectory = join(workspaceRoot, publicPackage.directory);
    const packed = await run("pnpm", [
      "--dir",
      packageDirectory,
      "pack",
      "--pack-destination",
      tarballDirectory,
      "--json",
    ]);
    const result = JSON.parse(packed.stdout);
    const tarballPath = resolve(result.filename);
    const files = result.files.map(({ path }) => path).sort();
    validateTarballFileList(publicPackage, files);
    const manifest = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
    validatePackedManifestData(JSON.parse(manifest.stdout), workspaceRoot);
    tarballs[publicPackage.name] = `file:${tarballPath}`;
    report.packages[publicPackage.name] = { payload: "pass", manifest: "pass", files: files.length };
  }

  await writeConsumer(consumerDirectory, tarballs);
  await run("pnpm", ["install", "--ignore-scripts"], {
    cwd: consumerDirectory,
  });
  await verifyRootPayloadExclusion(consumerDirectory);
  report.scenarios.rootPayloadExclusion = "pass";

  const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
  process.stdout.write(esm.stdout);
  Object.assign(report.scenarios, JSON.parse(esm.stdout.trim().split("\n").at(-1)));
  report.consumers.esm = "pass";

  const commonjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(commonjs.stdout);
  report.consumers.commonjs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumerDirectory });
  report.consumers.typescriptNodeNext = "pass";

  process.stdout.write("[devtools-core] PASS: assembled packed core/React acceptance gate.\n");
  if (reportPath) {
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function writeConsumer(directory, tarballs) {
  await mkdir(directory, { recursive: true });
  const coreTarball = tarballs["@prometheus-ags/entity-graph-core"];
  const reactTarball = tarballs["@prometheus-ags/prometheus-entity-management"];
  const manifest = {
    name: "prometheus-devtools-core-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": coreTarball,
      "@prometheus-ags/prometheus-entity-management": reactTarball,
      "@types/node": "25.5.0",
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.4",
      react: "19.2.8",
      "react-dom": "19.2.8",
      typescript: "6.0.2",
    },
    pnpm: {
      overrides: {
        "@prometheus-ags/entity-graph-core": coreTarball,
        "@prometheus-ags/prometheus-entity-management": reactTarball,
      },
    },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(join(directory, "consumer.mjs"), `
import assert from "node:assert/strict";
import {
  configureTimeTravel,
  createGraphTransaction,
  createDevtoolsEventBus,
  createGraphStore,
  getRegisteredStores,
  getTimeTravelState,
  graphStore,
  registerSubscriber,
  recordGraphSnapshot,
  registerStore,
  restoreGraphSnapshot,
  subscribeDevtoolsEvent,
  subscribeSubscriberStats,
  unregisterSubscriber,
} from "@prometheus-ags/entity-graph-core";
import * as coreRoot from "@prometheus-ags/entity-graph-core";
import * as reactRoot from "@prometheus-ags/prometheus-entity-management";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  attachGraphDevtools,
  createGraphDevtoolsClient,
  getGraphDevtoolsController,
} from "@prometheus-ags/entity-graph-core/devtools";

assert.equal("attachGraphDevtools" in coreRoot, false, "v1 controller must stay off the core root surface");
assert.equal(typeof reactRoot.useGraphDevTools, "function", "packed React DevTools hook must load");

const storeA = createGraphStore();
const storeB = createGraphStore();
const attachmentA = attachGraphDevtools(storeA, {
  storeId: "store-a",
  historyLimit: 4,
  historyBytesLimit: 1024 * 1024,
  values: {
    mode: "include",
    redact(value, context) {
      if (context.category === "entity" && value && typeof value === "object") {
        return { ...value, secret: "[redacted]" };
      }
      return value;
    },
  },
});
const sharedAttachmentA = attachGraphDevtools(storeA);
const attachmentB = attachGraphDevtools(storeB, { storeId: "store-b", historyLimit: 16 });
assert.equal(attachmentA.controller, sharedAttachmentA.controller);
assert.notEqual(attachmentA.controller, attachmentB.controller);
const controllerA = attachmentA.controller;
const controllerB = attachmentB.controller;
assert.ok(controllerA && controllerB);
assert.equal("dispose" in controllerA, false, "public controller must not bypass attachment refcounts");
controllerA.clearHistory();
controllerB.clearHistory();

const transportA1 = controllerA.connect("client-a1");
const transportA2 = controllerA.connect("client-a2");
const clientA1 = createGraphDevtoolsClient(controllerA.storeId, transportA1);
const clientA2 = createGraphDevtoolsClient(controllerA.storeId, transportA2);
const eventsA1 = [];
const eventsA2 = [];
const eventsB = [];
clientA1.subscribe((event) => eventsA1.push(event));
clientA2.subscribe((event) => eventsA2.push(event));
controllerB.subscribe((event) => eventsB.push(event));
const transportB = controllerB.connect("client-b");
controllerA.subscribe(() => { throw new Error("listener isolation probe"); });

storeA.getState().upsertEntity("Task", "one", { id: "one", title: "First", secret: "host-only" });
storeA.getState().patchEntity("Task", "one", { title: "Draft" });
storeA.getState().setEntityFetching("Task", "one", true);
storeA.getState().setEntitySyncMetadata("Task", "one", { synced: false, origin: "client" });
storeA.getState().setListResult("tasks:all", ["one"], { total: 1 });
storeA.getState().upsertEntities("Task", [
  { id: "two", data: { id: "two", title: "Second" } },
  { id: "three", data: { id: "three", title: "Third" } },
]);
storeA.setState((state) => ({
  entities: {
    ...state.entities,
    Task: { ...state.entities.Task, direct: { id: "direct", title: "Direct publication" } },
  },
}));
storeB.getState().upsertEntity("Task", "b-only", { id: "b-only", title: "Store B" });

const mutationsA = eventsA1.filter((event) => event.type === "mutation");
const categories = new Set(mutationsA.flatMap((event) => event.payload.changes.map((change) => change.category)));
assert.deepEqual([...categories].sort(), ["entity", "entity-state", "list", "patch", "sync"]);
assert.ok(mutationsA.some((event) => event.payload.changes.filter((change) => change.category === "entity").length === 2));
assert.ok(mutationsA.some((event) => event.payload.changes.some((change) => change.id === "direct")));
assert.equal(eventsA1.length, eventsA2.length, "both clients must observe the same controller stream");
assert.equal(eventsB.filter((event) => event.type === "mutation").length, 1);
assert.equal(eventsA1.some((event) => event.storeId === "store-b"), false);
assert.equal(eventsB.some((event) => event.storeId === "store-a"), false);
for (let index = 1; index < eventsA1.length; index += 1) {
  assert.ok(eventsA1[index].sequence > eventsA1[index - 1].sequence);
}
const firstEntity = mutationsA.flatMap((event) => event.payload.changes).find((change) => change.id === "one" && change.category === "entity");
assert.equal(firstEntity.after.secret, "[redacted]");

const storeC = createGraphStore();
const attachmentC = attachGraphDevtools(storeC, {
  storeId: "store-c",
  values: { mode: "include", redact() { throw new Error("redactor probe"); } },
});
storeC.getState().upsertEntity("Secret", "one", { token: "must-not-escape" });
const redactedChange = attachmentC.controller.getHistory().find((event) => event.type === "mutation")?.payload.changes[0];
assert.deepEqual(redactedChange.after, { $type: "redaction-error" });
assert.equal(redactedChange.valueState, "redaction-error");
attachmentC.detach();

const storeDag = createGraphStore();
const attachmentDag = attachGraphDevtools(storeDag, {
  storeId: "store-dag",
  values: { mode: "include" },
});
const sharedValue = { label: "shared" };
storeDag.getState().upsertEntity("Dag", "one", { left: sharedValue, right: sharedValue });
const dagChange = attachmentDag.controller.getHistory().find((event) => event.type === "mutation")?.payload.changes[0];
assert.deepEqual(dagChange.after.left, { label: "shared" });
assert.deepEqual(dagChange.after.right, { label: "shared" });
attachmentDag.detach();

const storeD = createGraphStore();
const attachmentD = attachGraphDevtools(storeD, { storeId: "store-d", eventBytesLimit: 1024 });
storeD.getState().upsertEntities("Large", Array.from({ length: 200 }, (_, index) => ({
  id: "large-entity-" + index.toString().padStart(4, "0"),
  data: { index },
})));
const boundedEvent = attachmentD.controller.getHistory().find((event) => event.type === "mutation");
assert.ok(boundedEvent.payload.changesOmitted > 0);
assert.equal(boundedEvent.payload.valuesTruncated, false);
assert.ok(new TextEncoder().encode(JSON.stringify(boundedEvent)).byteLength <= 1024);
attachmentD.detach();

const finiteLimitStore = createGraphStore();
const finiteLimitAttachment = attachGraphDevtools(finiteLimitStore, {
  storeId: "finite-limits",
  historyLimit: Number.NaN,
  historyBytesLimit: Number.POSITIVE_INFINITY,
  eventBytesLimit: Number.NaN,
});
assert.deepEqual(finiteLimitAttachment.controller.capabilities.limits, {
  historyEvents: 500,
  historyBytes: 5 * 1024 * 1024,
  eventBytes: 256 * 1024,
  snapshots: 50,
  snapshotBytes: 10 * 1024 * 1024,
});
finiteLimitAttachment.detach();

const redactionBoundStore = createGraphStore();
const redactionBoundAttachment = attachGraphDevtools(redactionBoundStore, {
  storeId: "redaction-bound",
  eventBytesLimit: 1024,
  values: { mode: "include", redact() { throw new Error("redaction bound probe"); } },
});
redactionBoundStore.getState().upsertEntities("Secret", Array.from({ length: 200 }, (_, index) => ({
  id: "secret-entity-" + index.toString().padStart(4, "0"),
  data: { token: "must-not-escape" },
})));
const redactionBoundEvent = redactionBoundAttachment.controller.getHistory().find((event) => event.type === "mutation");
assert.equal(redactionBoundEvent.payload.valuesTruncated, true);
assert.ok(redactionBoundEvent.payload.changes.length > 0);
assert.ok(redactionBoundEvent.payload.changes.every((change) => change.valueState === "redaction-error"));
redactionBoundAttachment.detach();

const subscriberStore = createGraphStore();
let globalSubscriberNotifications = 0;
let scopedSubscriberNotifications = 0;
const unsubscribeGlobalStats = subscribeSubscriberStats(() => { globalSubscriberNotifications += 1; });
const unsubscribeScopedStats = subscribeSubscriberStats(
  () => { scopedSubscriberNotifications += 1; },
  subscriberStore,
);
const subscriberToken = registerSubscriber("Task:subscriber", subscriberStore);
unregisterSubscriber("Task:subscriber", subscriberToken, subscriberStore);
assert.equal(globalSubscriberNotifications, 2);
assert.equal(scopedSubscriberNotifications, 2);
unsubscribeGlobalStats();
unsubscribeScopedStats();

const snapshotB = controllerB.getSnapshot();
assert.equal(snapshotB.counts.entities, 1);
const defaultValueChange = controllerB.getHistory().find((event) => event.type === "mutation")?.payload.changes[0];
assert.equal(defaultValueChange.valueState, "hidden-by-policy");
assert.equal("after" in defaultValueChange, false);
assert.doesNotThrow(() => controllerB.subscribe(() => { throw new Error("replay isolation probe"); }, true));
assert.ok(controllerA.getHistoryStatus().retainedEvents <= 4);
assert.ok(controllerA.getHistoryStatus().retainedBytes <= 1024 * 1024);
const capabilities = await clientA1.request("get-capabilities");
assert.equal(capabilities.ok, true);
assert.ok(capabilities.result.features.includes("multi-store"));
const wrongStore = controllerA.handleCommand({
  protocol: GRAPH_DEVTOOLS_PROTOCOL,
  version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  requestId: "wrong-store",
  storeId: "store-b",
  command: "get-snapshot",
});
assert.equal(wrongStore.ok, false);
assert.equal(wrongStore.error.code, "wrong-store");

const disabledStore = createGraphStore();
const disabled = attachGraphDevtools(disabledStore, { enabled: false });
assert.equal(disabled.enabled, false);
assert.equal(disabled.controller, null);
assert.equal(getGraphDevtoolsController(disabledStore), null);
disabledStore.getState().upsertEntity("Task", "silent", { id: "silent" });
const liveNoOp = attachGraphDevtools(storeA, { enabled: false });
assert.equal(liveNoOp.controller, null);
assert.equal(getGraphDevtoolsController(storeA), controllerA);
liveNoOp.detach();

sharedAttachmentA.detach();
assert.equal(getGraphDevtoolsController(storeA), controllerA);
clientA1.disconnect();
const afterDisconnect = await clientA1.request("get-snapshot");
assert.equal(afterDisconnect.ok, false);
clientA2.disconnect();
attachmentA.detach();
assert.equal(getGraphDevtoolsController(storeA), null);
attachmentB.detach();
assert.equal(getGraphDevtoolsController(storeB), null);
assert.equal(controllerB.getHistoryStatus().retainedEvents, 0);
transportB.close();
assert.equal(controllerB.getHistoryStatus().retainedEvents, 0);

const legacyEvents = [];
const unsubscribeLegacy = subscribeDevtoolsEvent((event) => legacyEvents.push(event));
createGraphTransaction(graphStore).upsertEntity("Legacy", "one", { id: "one" });
assert.equal(legacyEvents.some((event) => event.kind === "upsert" && event.id === "one"), true);
const customLegacyStore = createGraphStore();
createGraphTransaction(customLegacyStore).patchEntity("Legacy", "custom", { draft: true });
assert.equal(
  legacyEvents.some((event) => event.kind === "patch" && event.id === "custom"),
  true,
  "deprecated global stream must retain custom-store graph transaction events",
);
unsubscribeLegacy();

configureTimeTravel({ capacity: 2 }, storeA);
storeA.getState().upsertEntity("Travel", "one", { version: 1 });
recordGraphSnapshot("one", storeA);
storeA.getState().replaceEntity("Travel", "one", { version: 2 });
recordGraphSnapshot("two", storeA);
recordGraphSnapshot("store-b", storeB);
assert.equal(getTimeTravelState(storeA).snapshots.length, 2);
assert.equal(getTimeTravelState(storeB).snapshots.length, 1);
assert.equal(restoreGraphSnapshot(0, storeA), true);
assert.equal(storeA.getState().readEntity("Travel", "one").version, 1);

const burstBus = createDevtoolsEventBus({ bufferSize: 20, coalesceBurstThreshold: 2 });
const burstTransaction = createGraphTransaction(graphStore);
for (let index = 0; index < 6; index += 1) {
  burstTransaction.upsertEntity("Burst", String(index), { index });
}
burstTransaction.commit();
await Promise.resolve();
await Promise.resolve();
assert.equal(burstBus.getBuffer().some((event) => event.kind === "list" && event.key === "burst-coalesce"), true);

const busOne = createDevtoolsEventBus({ coalesceBurstThreshold: 0 });
const busTwo = createDevtoolsEventBus({ coalesceBurstThreshold: 0 });
const source = () => () => {};
registerStore(busOne, source, "same-name");
registerStore(busTwo, source, "same-name");
assert.deepEqual(getRegisteredStores(busOne), [{ name: "same-name", active: true }]);
assert.deepEqual(getRegisteredStores(busTwo), [{ name: "same-name", active: true }]);
burstBus.destroy();
busOne.destroy();
busTwo.destroy();

console.log("[devtools-core] packed Node ESM behavioral acceptance passed");
console.log(JSON.stringify({
  semanticEventCompleteness: "pass",
  batchAndCoalescing: "pass",
  multiStoreIsolation: "pass",
  multipleClients: "pass",
  disabledMode: "pass",
  compatibilityDelegates: "pass",
  boundedHistory: "pass",
  eventByteLimit: "pass",
  teardown: "pass",
  valuePolicyBoundary: "pass",
  rootPayloadExclusion: "pass"
}));
`);

  await writeFile(join(directory, "consumer.cjs"), `
const assert = require("node:assert/strict");
const core = require("@prometheus-ags/entity-graph-core");
const devtools = require("@prometheus-ags/entity-graph-core/devtools");
const react = require("@prometheus-ags/prometheus-entity-management");
const store = core.createGraphStore();
const attachment = devtools.attachGraphDevtools(store, { storeId: "cjs-store" });
store.getState().upsertEntity("Task", "cjs", { id: "cjs" });
assert.equal(attachment.controller.getSnapshot().counts.entities, 1);
assert.equal(typeof devtools.createGraphDevtoolsClient, "function");
assert.equal(typeof react.useGraphDevTools, "function");
assert.equal("attachGraphDevtools" in core, false);
attachment.detach();
console.log("[devtools-core] packed CommonJS runtime acceptance passed");
`);

  await writeFile(join(directory, "consumer.mts"), `
import { createGraphStore, subscribeSubscriberStats } from "@prometheus-ags/entity-graph-core";
import { useGraphDevTools } from "@prometheus-ags/prometheus-entity-management";
import {
  attachGraphDevtools,
  createGraphDevtoolsClient,
  type GraphDevtoolsDiagnosticEvent,
  type GraphDevtoolsHistoryStatus,
  type GraphDevtoolsValueContext,
} from "@prometheus-ags/entity-graph-core/devtools";
const store = createGraphStore();
const unsubscribe = subscribeSubscriberStats(() => {}, store);
const attachment = attachGraphDevtools(store, {
  values: { mode: "include", redact: (value: unknown, context: GraphDevtoolsValueContext) => ({ value, side: context.side }) },
});
if (!attachment.controller) throw new Error("controller unavailable");
const client = createGraphDevtoolsClient(attachment.controller.storeId, attachment.controller.connect());
const history: GraphDevtoolsHistoryStatus = attachment.controller.getHistoryStatus();
const diagnostic: GraphDevtoolsDiagnosticEvent | undefined = attachment.controller
  .getHistory()
  .find((event): event is GraphDevtoolsDiagnosticEvent => event.type === "diagnostic");
void useGraphDevTools;
void history;
void diagnostic;
client.disconnect();
unsubscribe();
attachment.detach();
`);
  await writeFile(join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2023",
      lib: ["ES2023", "DOM", "DOM.Iterable"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node", "react", "react-dom"],
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
    {
      label: "prometheus.entity-graph.devtools",
      matches: (source) => ["\"", "'", "`"].some(
        (quote) => source.includes(`${quote}prometheus.entity-graph.devtools${quote}`),
      ),
    },
    { label: "attachGraphDevtools", matches: (source) => source.includes("attachGraphDevtools") },
    { label: "createGraphDevtoolsClient", matches: (source) => source.includes("createGraphDevtoolsClient") },
  ];
  const visited = new Set();

  async function inspect(relativeFile) {
    if (visited.has(relativeFile)) return;
    visited.add(relativeFile);
    const source = await readFile(join(packageDirectory, relativeFile), "utf8");
    for (const marker of forbidden) {
      if (marker.matches(source)) {
        throw new Error(`core root payload ${relativeFile} includes optional DevTools marker ${marker.label}`);
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
