import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const exampleRoot = resolve(repositoryRoot, "examples/flutter-riverpod");
const hostTarget = "integration_test/devtools_controller_acceptance_host.dart";
const listStoresMethod = "ext.entity_graph_flutter.devtoolsV1.listStores";
const commandMethod = "ext.entity_graph_flutter.devtoolsV1.command";
const eventKind = "prometheus.entity-graph.devtools.v1";
const acceptanceStepMethod = "ext.entity_graph_flutter.acceptanceV1.step";
const protocol = "prometheus.entity-graph.devtools";
const protocolVersion = 1;
const storeA = "flutter-acceptance-a";
const storeB = "flutter-acceptance-b";
const secretSentinel = "PEM_DEVTOOLS_SECRET_SENTINEL";
// Startup is normally incremental in this gate. Keep the diagnostic bound
// finite so a missing machine-protocol milestone fails with safe telemetry.
const startTimeoutMs = 300_000;
const rpcTimeoutMs = 15_000;

function argument(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fixtureReceipt() {
  const names = ["entity-inspection-v1.json", "time-travel-v1.json"];
  const result = {};
  for (const name of names) {
    const core = await readFile(
      resolve(repositoryRoot, "packages/entity-graph-core/fixtures/devtools", name),
    );
    const flutter = await readFile(
      resolve(repositoryRoot, "packages/entity_graph_flutter/fixtures/devtools", name),
    );
    assert.deepEqual(flutter, core, `${name} must remain byte-identical across runtimes`);
    JSON.parse(flutter.toString("utf8"));
    result[name] = { sha256: sha256(flutter), bytes: flutter.byteLength };
  }
  return result;
}

function sanitizedChildEnvironment() {
  const environment = { ...process.env };
  delete environment.CARGO_REGISTRY_TOKEN;
  delete environment.NPM_TOKEN;
  delete environment.NODE_AUTH_TOKEN;
  return environment;
}

function sanitizeDiagnostic(value) {
  let sanitized = String(value)
    .replaceAll(secretSentinel, "[redacted]")
    .replaceAll(repositoryRoot, "[repository]");
  const userHome = process.env.HOME;
  if (userHome) sanitized = sanitized.replaceAll(userHome, "[home]");
  for (const name of ["CARGO_REGISTRY_TOKEN", "NPM_TOKEN", "NODE_AUTH_TOKEN"]) {
    const secret = process.env[name];
    if (secret) sanitized = sanitized.replaceAll(secret, "[redacted]");
  }
  return sanitized;
}

function parseMachineMessage(line) {
  try {
    const decoded = JSON.parse(line);
    return Array.isArray(decoded) && decoded.length === 1 ? decoded[0] : decoded;
  } catch {
    return null;
  }
}

function sourceCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) throw new Error("Unable to resolve acceptance source commit");
  return result.stdout.trim();
}

function resolveDevice(flutterExecutable, requestedDevice) {
  if (requestedDevice) return requestedDevice;
  const result = spawnSync(flutterExecutable, ["devices", "--machine"], {
    cwd: exampleRoot,
    env: sanitizedChildEnvironment(),
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) throw new Error("Unable to discover Flutter devices");
  const devices = JSON.parse(result.stdout);
  const platformDirectory = (targetPlatform) => {
    if (targetPlatform === "ios") return "ios";
    if (targetPlatform.startsWith("android")) return "android";
    if (targetPlatform === "darwin") return "macos";
    if (targetPlatform.startsWith("web")) return "web";
    return null;
  };
  const supported = devices.find((candidate) => {
    const directory = platformDirectory(candidate.targetPlatform);
    return directory && existsSync(resolve(exampleRoot, directory));
  });
  if (!supported) {
    throw new Error(
      "No connected Flutter device matches a platform configured by the acceptance example",
    );
  }
  return supported.id;
}

class VmServiceClient {
  #socket;
  #nextId = 1;
  #pending = new Map();
  extensionEvents = [];

  async connect(uri) {
    this.#socket = new WebSocket(uri);
    this.#socket.onmessage = (event) => this.#receive(String(event.data));
    this.#socket.onerror = () => {
      const error = new Error("VM-service WebSocket failed");
      for (const pending of this.#pending.values()) pending.reject(error);
      this.#pending.clear();
    };
    await withTimeout(
      new Promise((resolveOpen, rejectOpen) => {
        this.#socket.onopen = resolveOpen;
        this.#socket.onclose = () => rejectOpen(new Error("VM-service WebSocket closed"));
      }),
      rpcTimeoutMs,
      "VM-service connection",
    );
  }

  #receive(encoded) {
    const message = JSON.parse(encoded);
    if (message.method === "streamNotify") {
      const event = message.params?.event;
      if (message.params?.streamId === "Extension" && event?.extensionKind === eventKind) {
        this.extensionEvents.push(event.extensionData);
      }
      return;
    }
    const pending = this.#pending.get(message.id);
    if (!pending) return;
    this.#pending.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message ?? "VM-service RPC failed");
      error.rpcError = message.error;
      pending.reject(error);
      return;
    }
    pending.resolve(message.result);
  }

  request(method, parameters = {}) {
    const id = this.#nextId++;
    const response = deferred();
    this.#pending.set(id, response);
    this.#socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params: parameters }));
    return withTimeout(response.promise, rpcTimeoutMs, method);
  }

  async close() {
    if (!this.#socket || this.#socket.readyState >= WebSocket.CLOSING) return;
    const closed = new Promise((resolveClosed) => {
      this.#socket.onclose = resolveClosed;
    });
    this.#socket.close();
    await withTimeout(closed, 2_000, "VM-service close").catch(() => {});
  }
}

function commandEnvelope(storeId, requestId, command, payload = undefined) {
  return {
    protocol,
    version: protocolVersion,
    storeId,
    requestId,
    command,
    ...(payload === undefined ? {} : { payload }),
  };
}

async function command(client, isolateId, storeId, requestId, name, payload = undefined) {
  const result = await client.request(commandMethod, {
    isolateId,
    command: JSON.stringify(commandEnvelope(storeId, requestId, name, payload)),
  });
  assert.equal(result.protocol, protocol);
  assert.equal(result.version, protocolVersion);
  assert.equal(result.requestId, requestId);
  return result;
}

async function acceptanceStep(client, isolateId, step) {
  const result = await client.request(acceptanceStepMethod, { isolateId, step });
  assert.equal(result.step, step);
  return result;
}

async function waitUntil(predicate, label, timeoutMs = rpcTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await delay(25);
  }
  throw new Error(`${label} did not become true within ${timeoutMs}ms`);
}

async function waitForRegisteredSurface(client, isolates) {
  const deadline = Date.now() + rpcTimeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    for (const isolate of isolates) {
      try {
        const registry = await client.request(listStoresMethod, { isolateId: isolate.id });
        return { isolateId: isolate.id, registry };
      } catch (error) {
        lastError = error;
      }
    }
    await delay(50);
  }
  throw lastError ?? new Error("DevTools VM-service methods were not registered");
}

function findEntity(snapshot, type, id) {
  return snapshot.entityRecords.find((record) => record.type === type && record.id === id);
}

function eventTypes(events) {
  return [...new Set(events.map((event) => event?.type).filter(Boolean))].sort();
}

async function stopFlutter(flutter, appId) {
  if (!flutter || flutter.exitCode !== null) return;
  if (appId && flutter.stdin.writable) {
    flutter.stdin.write(
      `${JSON.stringify([{ id: 9001, method: "app.stop", params: { appId } }])}\n`,
    );
    const exited = await Promise.race([
      new Promise((resolveExit) => flutter.once("close", resolveExit)),
      delay(10_000).then(() => null),
    ]);
    if (exited !== null || flutter.exitCode !== null || flutter.signalCode !== null) return;
  }
  flutter.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => flutter.once("close", resolveExit)),
    delay(5_000),
  ]);
}

async function main() {
  const reportPath = resolve(
    repositoryRoot,
    argument(
      "--report",
      ".kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-flutter-controller/task-8-assembled-acceptance.json",
    ),
  );
  const flutterExecutable = argument("--flutter", process.env.FLUTTER_BIN ?? "flutter");
  const device = resolveDevice(
    flutterExecutable,
    argument("--device", process.env.PEM_FLUTTER_DEVICE),
  );
  const fixtures = await fixtureReceipt();
  const debugPort = deferred();
  const appStarted = deferred();
  const appStart = deferred();
  const startupEvents = new Set();
  const startupDiagnostics = new Set();
  const startupDiagnosticDetails = [];
  let diagnosticLineCount = 0;
  let machineMessageCount = 0;
  let flutter;
  let client;
  let appId;

  try {
    flutter = spawn(
      flutterExecutable,
      ["run", "--machine", "--debug", "-d", device, "-t", hostTarget],
      {
        cwd: exampleRoot,
        env: sanitizedChildEnvironment(),
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      },
    );

    const remember = (line) => {
      diagnosticLineCount += 1;
      for (const marker of [
        "Building macOS application",
        "Building iOS application",
        "Built build/macos",
        "Launching",
        "Error",
        "Failed",
      ]) {
        if (line.includes(marker)) {
          startupDiagnostics.add(marker);
          if (
            (marker === "Error" || marker === "Failed") &&
            startupDiagnosticDetails.length < 8
          ) {
            startupDiagnosticDetails.push(sanitizeDiagnostic(line));
          }
        }
      }
    };
    createInterface({ input: flutter.stdout, crlfDelay: Infinity }).on("line", (line) => {
      const message = parseMachineMessage(line);
      if (!message) {
        remember(line);
        return;
      }
      machineMessageCount += 1;
      if (typeof message.event === "string") startupEvents.add(message.event);
      if (message.event === "app.start") {
        appId = message.params?.appId;
        appStart.resolve(message.params);
      } else if (message.event === "app.debugPort") {
        debugPort.resolve(message.params?.wsUri);
      } else if (message.event === "app.started") {
        appStarted.resolve(message.params);
      } else if (message.event === "app.stop") {
        const detail = message.params?.error ?? message.params?.trace ?? "no error detail";
        const error = new Error(
          `Flutter acceptance host stopped during startup: ${sanitizeDiagnostic(detail)}`,
        );
        debugPort.reject(error);
        appStarted.reject(error);
        appStart.reject(error);
      }
    });
    createInterface({ input: flutter.stderr, crlfDelay: Infinity }).on("line", remember);
    flutter.once("error", (error) => {
      debugPort.reject(error);
      appStarted.reject(error);
      appStart.reject(error);
    });
    flutter.once("exit", (code) => {
      const error = new Error(`Flutter acceptance host exited before startup with code ${code}`);
      debugPort.reject(error);
      appStarted.reject(error);
      appStart.reject(error);
    });

    let startup;
    try {
      startup = await withTimeout(
        Promise.all([appStarted.promise, debugPort.promise, appStart.promise]),
        startTimeoutMs,
        "Flutter acceptance host startup",
      );
    } catch (error) {
      throw new Error(
        `${error.message}; machineMessages=${machineMessageCount}; ` +
          `events=${JSON.stringify([...startupEvents].sort())}; ` +
          `diagnostics=${JSON.stringify([...startupDiagnostics].sort())}; ` +
          `diagnosticDetails=${JSON.stringify(startupDiagnosticDetails)}; ` +
          `appId=${appId === undefined ? "missing" : "present"}; ` +
          `processExit=${flutter.exitCode ?? "running"}`,
        { cause: error },
      );
    }
    const [, wsUri, start] = startup;
    assert.equal(start.mode, "debug", "VM-service acceptance must run a debug app");
    assert.equal(typeof wsUri, "string");

    client = new VmServiceClient();
    await client.connect(wsUri);
    const vm = await client.request("getVM");
    assert.ok(vm.isolates?.length, "Flutter acceptance host must expose an isolate");
    const registered = await waitForRegisteredSurface(client, vm.isolates);
    const { isolateId } = registered;
    await client.request("streamListen", { streamId: "Extension" });

    const initialRegistry = registered.registry;
    assert.equal(initialRegistry.protocol, protocol);
    assert.equal(initialRegistry.version, protocolVersion);
    assert.deepEqual(
      initialRegistry.stores.map((store) => store.storeId),
      [storeA, storeB],
    );

    await acceptanceStep(client, isolateId, "seed");
    await waitUntil(
      () => client.extensionEvents.some((event) => event?.storeId === storeA),
      "store A Extension event",
    );
    await waitUntil(
      () => client.extensionEvents.some((event) => event?.storeId === storeB),
      "store B Extension event",
    );

    const snapshotA = await command(
      client,
      isolateId,
      storeA,
      "snapshot-a",
      "get-snapshot",
    );
    const snapshotB = await command(
      client,
      isolateId,
      storeB,
      "snapshot-b",
      "get-snapshot",
    );
    assert.equal(snapshotA.ok, true);
    assert.equal(snapshotA.result.counts.entities, 3);
    assert.equal(snapshotA.result.counts.patchedEntities, 1);
    assert.equal(snapshotA.result.counts.lists, 1);
    assert.equal(snapshotA.result.counts.errors, 1);
    assert.equal(snapshotB.result.counts.entities, 1);
    assert.equal(snapshotB.result.counts.patchedEntities, 0);
    assert.equal(snapshotB.result.counts.lists, 0);

    await waitUntil(async () => {
      const views = await command(
        client,
        isolateId,
        storeA,
        `views-ready-${Date.now()}`,
        "get-views",
      );
      return views.result.views.length >= 2 && views.result.views.every((view) => view.subscriberCount > 0)
        ? views
        : null;
    }, "Riverpod view registrations");

    const entities = await command(
      client,
      isolateId,
      storeA,
      "entities",
      "get-entity-records",
    );
    const taskOne = findEntity(entities.result, "AcceptanceTask", "task-1");
    const taskTwo = findEntity(entities.result, "AcceptanceTask", "task-2");
    assert.equal(taskOne.canonical.name, "Original task");
    assert.equal(taskOne.patch.status, "in-progress");
    assert.equal(taskOne.merged.status, "in-progress");
    assert.equal(taskOne.dirty, true);
    assert.equal(taskOne.sync.synced, false);
    assert.ok(taskOne.viewIds.length >= 2);
    assert.equal(taskTwo.entityState.error.message, "acceptance error");

    const views = await command(client, isolateId, storeA, "views", "get-views");
    const listView = views.result.views.find((view) => view.queryKey === "acceptance:tasks");
    assert.deepEqual(
      listView.membership.map((entity) => entity.id),
      ["task-1", "task-2"],
    );
    assert.equal(listView.list.total, 2);

    const relationships = await command(
      client,
      isolateId,
      storeA,
      "relationships",
      "get-relationships",
    );
    assert.ok(
      relationships.result.relationships.some(
        (relationship) =>
          relationship.relation === "project" &&
          relationship.source.id === "task-1" &&
          relationship.target.id === "project-1" &&
          relationship.status === "resolved",
      ),
    );
    assert.ok(
      relationships.result.relationships.some(
        (relationship) => relationship.source.id === "task-2" && relationship.status === "missing-target",
      ),
    );

    const historyBefore = await command(
      client,
      isolateId,
      storeA,
      "history-before",
      "get-history",
    );
    assert.ok(historyBefore.result.length >= 6);
    assert.ok(historyBefore.result.some((event) => event.type === "mutation"));
    assert.ok(historyBefore.result.some((event) => event.type === "view"));
    assert.equal(
      JSON.stringify({ entities, historyBefore, extensionEvents: client.extensionEvents }).includes(
        secretSentinel,
      ),
      false,
      "host-redacted sentinel must never cross the VM-service boundary",
    );

    const eventCountBeforeOversize = client.extensionEvents.length;
    await acceptanceStep(client, isolateId, "oversized-event");
    const truncatedEvent = await waitUntil(
      () =>
        client.extensionEvents
          .slice(eventCountBeforeOversize)
          .find((event) => event?.type === "mutation" && event?.payload?.valuesTruncated === true),
      "bounded oversized mutation event",
    );
    assert.ok(
      Buffer.byteLength(JSON.stringify(truncatedEvent), "utf8") <= 256 * 1024 + 128,
      "VM event must retain the configured per-event byte ceiling",
    );

    const invalidPolicyEscalation = commandEnvelope(
      storeA,
      "policy-escalation",
      "get-entity-records",
    );
    invalidPolicyEscalation.valuePolicy = { mode: "include" };
    const escalationResult = await client.request(commandMethod, {
      isolateId,
      command: JSON.stringify(invalidPolicyEscalation),
    });
    assert.equal(escalationResult.ok, false);
    assert.equal(escalationResult.error.code, "invalid-envelope");

    const invalidPreview = await command(
      client,
      isolateId,
      storeA,
      "invalid-preview",
      "preview-entity-patch",
      { type: "AcceptanceTask", id: "task-1", patch: { status: "preview" }, valuePolicy: "include" },
    );
    assert.equal(invalidPreview.ok, false);
    assert.equal(invalidPreview.error.code, "invalid-payload");

    const wrongStore = await command(
      client,
      isolateId,
      "missing-store",
      "wrong-store",
      "get-snapshot",
    );
    assert.equal(wrongStore.ok, false);
    assert.equal(wrongStore.error.code, "wrong-store");

    const oversized = await client.request(commandMethod, {
      isolateId,
      command: JSON.stringify({
        ...commandEnvelope(storeA, "oversized", "get-snapshot"),
        padding: "x".repeat(300 * 1024),
      }),
    });
    assert.equal(oversized.ok, false);
    assert.equal(oversized.error.code, "transport-limit-exceeded");

    const preview = await command(
      client,
      isolateId,
      storeA,
      "preview",
      "preview-entity-patch",
      { type: "AcceptanceTask", id: "task-1", patch: { status: "preview" } },
    );
    assert.equal(preview.ok, true);
    assert.equal(preview.result.entity.type, "AcceptanceTask");
    assert.equal(preview.result.entity.id, "task-1");
    assert.equal(preview.result.appliedPatch.status, "preview");

    const duplicatePreview = await command(
      client,
      isolateId,
      storeA,
      "duplicate-preview",
      "preview-entity-patch",
      { type: "AcceptanceTask", id: "task-1", patch: { status: "duplicate" } },
    );
    assert.equal(duplicatePreview.ok, false);
    assert.equal(duplicatePreview.error.code, "preview-already-active");

    const previewTravelStatus = await command(
      client,
      isolateId,
      storeA,
      "preview-travel-status",
      "get-time-travel-status",
    );
    const blockedPreviewRewind = await command(
      client,
      isolateId,
      storeA,
      "preview-rewind-blocked",
      "rewind",
      { cursor: previewTravelStatus.result.oldestCursor },
    );
    assert.equal(blockedPreviewRewind.ok, false);
    assert.equal(blockedPreviewRewind.error.code, "preview-already-active");

    await acceptanceStep(client, isolateId, "update");
    const canonicalSafeRestore = await command(
      client,
      isolateId,
      storeA,
      "canonical-safe-restore",
      "restore-entity-preview",
      { previewId: preview.result.previewId },
    );
    assert.equal(canonicalSafeRestore.result.status, "restored");

    const conflictPreview = await command(
      client,
      isolateId,
      storeA,
      "conflict-preview",
      "preview-entity-patch",
      { type: "AcceptanceTask", id: "task-1", patch: { status: "preview" } },
    );
    assert.equal(conflictPreview.ok, true);
    await acceptanceStep(client, isolateId, "preview-conflict");
    const restore = await command(
      client,
      isolateId,
      storeA,
      "restore-conflict",
      "restore-entity-preview",
      { previewId: conflictPreview.result.previewId },
    );
    assert.equal(restore.result.status, "conflict");
    assert.equal(restore.result.reason, "entity-changed-since-preview");
    await acceptanceStep(client, isolateId, "resolve-preview-conflict");
    const recoveredRestore = await command(
      client,
      isolateId,
      storeA,
      "restore-after-conflict",
      "restore-entity-preview",
      { previewId: conflictPreview.result.previewId },
    );
    assert.equal(recoveredRestore.result.status, "restored");

    await acceptanceStep(client, isolateId, "update");
    const travelStatus = await command(
      client,
      isolateId,
      storeA,
      "travel-status",
      "get-time-travel-status",
    );
    assert.ok(travelStatus.result.retainedSnapshots >= 2);
    const rewind = await command(client, isolateId, storeA, "rewind", "rewind", {
      cursor: travelStatus.result.oldestCursor,
    });
    assert.equal(rewind.result.status, "rewound");
    const rewoundSnapshot = await command(
      client,
      isolateId,
      storeA,
      "rewound-snapshot",
      "get-snapshot",
    );
    assert.equal(rewoundSnapshot.result.snapshots.mode, "rewound");
    const live = await command(
      client,
      isolateId,
      storeA,
      "return-live",
      "return-to-live",
    );
    assert.equal(live.result.status, "live");
    const liveEntities = await command(
      client,
      isolateId,
      storeA,
      "live-entities",
      "get-entity-records",
    );
    assert.equal(
      findEntity(liveEntities.result, "AcceptanceTask", "task-1").canonical.name,
      "Updated through graph publication",
    );

    const secondTravelStatus = await command(
      client,
      isolateId,
      storeA,
      "travel-status-mutation",
      "get-time-travel-status",
    );
    const secondRewind = await command(
      client,
      isolateId,
      storeA,
      "rewind-for-mutation",
      "rewind",
      { cursor: secondTravelStatus.result.oldestCursor },
    );
    assert.equal(secondRewind.result.status, "rewound");
    await acceptanceStep(client, isolateId, "mutate-after-rewind");
    const mutationTravelStatus = await command(
      client,
      isolateId,
      storeA,
      "travel-status-after-mutation",
      "get-time-travel-status",
    );
    assert.equal(mutationTravelStatus.result.mode, "live");
    const mutationEntities = await command(
      client,
      isolateId,
      storeA,
      "entities-after-rewind-mutation",
      "get-entity-records",
    );
    assert.equal(
      findEntity(mutationEntities.result, "AcceptanceTask", "task-1").canonical.name,
      "Mutation after rewind",
    );

    const cleared = await command(
      client,
      isolateId,
      storeA,
      "clear-history",
      "clear-history",
    );
    assert.equal(cleared.result.cleared, true);
    const historyAfter = await command(
      client,
      isolateId,
      storeA,
      "history-after",
      "get-history",
    );
    assert.deepEqual(historyAfter.result, []);

    await acceptanceStep(client, isolateId, "dispose-store-b");
    await waitUntil(
      () =>
        client.extensionEvents.some(
          (event) => event?.storeId === storeB && event?.type === "lifecycle" && event?.payload?.state === "disposed",
        ),
      "store B disposal event",
    );
    const oneStoreRegistry = await client.request(listStoresMethod, { isolateId });
    assert.deepEqual(oneStoreRegistry.stores.map((store) => store.storeId), [storeA]);
    const disposedStore = await command(
      client,
      isolateId,
      storeB,
      "disposed-store",
      "get-snapshot",
    );
    assert.equal(disposedStore.ok, false);
    assert.equal(disposedStore.error.code, "wrong-store");

    await acceptanceStep(client, isolateId, "dispose-store-a");
    const emptyRegistry = await client.request(listStoresMethod, { isolateId });
    assert.deepEqual(emptyRegistry.stores, []);

    const receipt = {
      schemaVersion: 1,
      boundary: "flutter-riverpod-vm-service-acceptance",
      status: "pass",
      executedAt: new Date().toISOString(),
      sourceCommit: sourceCommit(),
      device,
      fixtures,
      stores: [storeA, storeB],
      extensionEvents: {
        total: client.extensionEvents.length,
        types: eventTypes(client.extensionEvents),
      },
      assertions: [
        "cross-language fixtures are byte-identical and valid JSON",
        "real Flutter app registers Riverpod entity and list views",
        "two active graphs remain isolated through discovery, commands, history, and disposal",
        "graph publications emit bounded versioned Extension-stream events",
        "entity, dirty, error, view, and relationship projections are complete",
        "host redaction removes the sentinel before history and VM serialization",
        "remote commands cannot escalate value policy or exceed request bounds",
        "preview restore refuses a post-preview conflict",
        "retained rewind returns exactly to the protected live head",
        "the first real graph mutation after rewind returns history mode to live before publication",
        "final detach removes every active store from discovery",
      ],
    };
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(
      `[devtools-flutter-controller] PASS: assembled Flutter/Riverpod/VM-service acceptance (${client.extensionEvents.length} events).\n`,
    );
  } catch (error) {
    if (diagnosticLineCount > 0) {
      process.stderr.write(
        `[devtools-flutter-controller] Flutter emitted ${diagnosticLineCount} non-protocol diagnostic lines; content withheld to avoid recording environment secrets.\n`,
      );
    }
    throw error;
  } finally {
    await client?.close();
    await stopFlutter(flutter, appId);
  }
}

await main();
