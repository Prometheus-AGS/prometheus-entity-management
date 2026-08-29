import type { GraphState, GraphStore } from "../graph";
import { collectGraphDevtoolsCounts, projectGraphDevtoolsChanges } from "./projection";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  type GraphDevtoolsCapabilities,
  type GraphDevtoolsCommand,
  type GraphDevtoolsDiagnosticEvent,
  type GraphDevtoolsEvent,
  type GraphDevtoolsHistoryStatus,
  type GraphDevtoolsLifecycleEvent,
  type GraphDevtoolsMutationEvent,
  type GraphDevtoolsResult,
  type GraphDevtoolsSnapshot,
  type GraphDevtoolsTransport,
  type GraphDevtoolsValuePolicy,
} from "./protocol";

export interface AttachGraphDevtoolsOptions {
  /**
   * `false` makes only this attachment a no-op. It never tears down references
   * already held by other attachments to the same store.
   */
  enabled?: boolean;
  storeId?: string;
  historyLimit?: number;
  historyBytesLimit?: number;
  eventBytesLimit?: number;
  values?: GraphDevtoolsValuePolicy;
}

export interface GraphDevtoolsController {
  readonly storeId: string;
  readonly capabilities: GraphDevtoolsCapabilities;
  getSnapshot(): GraphDevtoolsSnapshot;
  getHistory(): ReadonlyArray<GraphDevtoolsEvent>;
  getHistoryStatus(): GraphDevtoolsHistoryStatus;
  clearHistory(): void;
  subscribe(listener: (event: GraphDevtoolsEvent) => void, replay?: boolean): () => void;
  connect(clientId?: string): GraphDevtoolsTransport;
  handleCommand(command: unknown): GraphDevtoolsResult;
  isDisposed(): boolean;
}

export interface GraphDevtoolsAttachment {
  readonly enabled: boolean;
  readonly controller: GraphDevtoolsController | null;
  detach(): void;
}

interface ControllerEntry {
  controller: GraphDevtoolsController;
  dispose(): void;
  references: number;
}

interface CreatedController {
  controller: GraphDevtoolsController;
  dispose(): void;
}

const controllers = new WeakMap<GraphStore, ControllerEntry>();
const storeNumbers = new WeakMap<GraphStore, number>();
let nextStoreNumber = 1;

function nowDuration(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function boundedLimit(value: number | undefined, fallback: number, minimum = 0): number {
  const candidate = value ?? fallback;
  return Number.isFinite(candidate) ? Math.max(minimum, Math.floor(candidate)) : fallback;
}

function storeIdFor(store: GraphStore): string {
  let number = storeNumbers.get(store);
  if (number === undefined) {
    number = nextStoreNumber++;
    storeNumbers.set(store, number);
  }
  return `graph-${number}`;
}

function resultError(
  storeId: string,
  requestId: string,
  code: Extract<GraphDevtoolsResult, { ok: false }>["error"]["code"],
  message: string,
): GraphDevtoolsResult {
  return {
    protocol: GRAPH_DEVTOOLS_PROTOCOL,
    version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
    requestId,
    storeId,
    ok: false,
    error: { code, message },
  };
}

function parseCommand(command: unknown): GraphDevtoolsCommand | null {
  if (typeof command !== "object" || command === null) return null;
  const candidate = command as Partial<GraphDevtoolsCommand>;
  if (
    candidate.protocol !== GRAPH_DEVTOOLS_PROTOCOL ||
    typeof candidate.version !== "number" ||
    typeof candidate.requestId !== "string" ||
    typeof candidate.storeId !== "string" ||
    typeof candidate.command !== "string"
  ) return null;
  return candidate as GraphDevtoolsCommand;
}

function createController(
  store: GraphStore,
  options: AttachGraphDevtoolsOptions,
): CreatedController {
  const storeId = options.storeId ?? storeIdFor(store);
  const historyLimit = boundedLimit(options.historyLimit, 500);
  const historyBytesLimit = boundedLimit(options.historyBytesLimit, 5 * 1024 * 1024);
  const eventBytesLimit = boundedLimit(options.eventBytesLimit, 256 * 1024, 1024);
  const valuePolicy = options.values ?? { mode: "metadata-only" };
  const capabilities: GraphDevtoolsCapabilities = {
    protocolVersion: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
    metadataOnlyByDefault: true,
    commands: ["get-capabilities", "get-snapshot", "get-history", "get-history-status", "clear-history"],
    features: ["semantic-events", "diagnostic-events", "bounded-history", "multi-client", "multi-store"],
    limits: { historyEvents: historyLimit, historyBytes: historyBytesLimit, eventBytes: eventBytesLimit },
  };
  const listeners = new Set<(event: GraphDevtoolsEvent) => void>();
  const history: GraphDevtoolsEvent[] = [];
  const historySizes: number[] = [];
  let retainedBytes = 0;
  let sequence = 0;
  let activeClients = 0;
  let nextClientNumber = 1;
  let disposed = false;

  const nextBase = () => {
    const current = ++sequence;
    const eventId = `${storeId}:${current}`;
    return {
      protocol: GRAPH_DEVTOOLS_PROTOCOL,
      version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
      storeId,
      sequence: current,
      eventId,
      correlationId: eventId,
      observedAt: new Date().toISOString(),
    } as const;
  };

  const encodedBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

  const boundEvent = (event: GraphDevtoolsEvent): GraphDevtoolsEvent => {
    if (event.type !== "mutation") return event;
    if (encodedBytes(event) <= eventBytesLimit) return event;
    const valuesTruncated = event.payload.changes.some(
      (change) => "before" in change || "after" in change,
    );
    const withoutValues: GraphDevtoolsMutationEvent = {
      ...event,
      payload: {
        ...event.payload,
        valuesTruncated,
        changes: event.payload.changes.map(({ before: _before, after: _after, ...change }) => ({
          ...change,
          valueState:
            change.valueState === "hidden-by-policy" || change.valueState === "redaction-error"
              ? change.valueState
              : "truncated",
        })),
      },
    };
    if (encodedBytes(withoutValues) <= eventBytesLimit) return withoutValues;

    let lower = 0;
    let upper = withoutValues.payload.changes.length;
    let bounded: GraphDevtoolsMutationEvent = {
      ...withoutValues,
      payload: {
        ...withoutValues.payload,
        changes: [],
        changesOmitted: withoutValues.payload.changes.length,
      },
    };
    while (lower <= upper) {
      const count = Math.floor((lower + upper) / 2);
      const candidate: GraphDevtoolsMutationEvent = {
        ...withoutValues,
        payload: {
          ...withoutValues.payload,
          changes: withoutValues.payload.changes.slice(0, count),
          changesOmitted: withoutValues.payload.changes.length - count,
        },
      };
      if (encodedBytes(candidate) <= eventBytesLimit) {
        bounded = candidate;
        lower = count + 1;
      } else {
        upper = count - 1;
      }
    }
    return bounded;
  };

  const publish = (candidate: GraphDevtoolsEvent) => {
    if (disposed) return;
    const event = boundEvent(candidate);
    if (historyLimit > 0 && historyBytesLimit > 0) {
      const size = encodedBytes(event);
      history.push(event);
      historySizes.push(size);
      retainedBytes += size;
      while (history.length > historyLimit || retainedBytes > historyBytesLimit) {
        history.shift();
        retainedBytes -= historySizes.shift() ?? 0;
      }
    }
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        // Tooling listeners are isolated from the production graph boundary.
      }
    }
  };

  const publishLifecycle = (
    state: GraphDevtoolsLifecycleEvent["payload"]["state"],
    clientId?: string,
  ) => {
    publish({
      ...nextBase(),
      type: "lifecycle",
      payload: {
        state,
        ...(clientId !== undefined ? { clientId } : {}),
        activeClients,
      },
    });
  };

  const unsubscribeStore = store.subscribe((current: GraphState, previous: GraphState) => {
    if (disposed) return;
    const startedAt = nowDuration();
    let changes: GraphDevtoolsMutationEvent["payload"]["changes"];
    try {
      changes = projectGraphDevtoolsChanges(previous, current, valuePolicy, storeId);
    } catch {
      const event: GraphDevtoolsDiagnosticEvent = {
        ...nextBase(),
        type: "diagnostic",
        payload: {
          code: "projection-failed",
          message: "A graph publication could not be projected for DevTools.",
        },
      };
      publish(event);
      return;
    }
    if (changes.length === 0) return;
    const event: GraphDevtoolsMutationEvent = {
      ...nextBase(),
      type: "mutation",
      payload: {
        valuesTruncated: false,
        changesOmitted: 0,
        changes,
        before: collectGraphDevtoolsCounts(previous),
        after: collectGraphDevtoolsCounts(current),
        projectionDurationMs: Math.max(0, nowDuration() - startedAt),
      },
    };
    publish(event);
  });

  const controller: GraphDevtoolsController = {
    storeId,
    capabilities,
    getSnapshot() {
      return {
        protocol: GRAPH_DEVTOOLS_PROTOCOL,
        version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
        storeId,
        capturedAt: new Date().toISOString(),
        counts: collectGraphDevtoolsCounts(store.getState()),
        history: controller.getHistoryStatus(),
      };
    },
    getHistory() {
      return [...history];
    },
    getHistoryStatus() {
      return {
        retainedEvents: history.length,
        retainedBytes,
        eventLimit: historyLimit,
        byteLimit: historyBytesLimit,
        oldestSequence: history[0]?.sequence ?? null,
        newestSequence: history.length > 0 ? history[history.length - 1]!.sequence : null,
      };
    },
    clearHistory() {
      history.length = 0;
      historySizes.length = 0;
      retainedBytes = 0;
    },
    subscribe(listener, replay = false) {
      if (disposed) return () => {};
      if (replay) {
        for (const event of [...history]) {
          try {
            listener(event);
          } catch {
            // Replay delivery has the same listener isolation as live delivery.
          }
        }
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect(clientId = `client-${nextClientNumber++}`) {
      if (disposed) return createDisposedTransport(storeId, clientId);
      activeClients += 1;
      publishLifecycle("client-connected", clientId);
      let closed = false;
      const connectionSubscriptions = new Set<() => void>();
      return {
        request(command) {
          if (closed) {
            const parsed = parseCommand(command);
            return Promise.resolve(resultError(
              storeId,
              parsed?.requestId ?? "closed",
              "disposed",
              "DevTools client is disconnected",
            ));
          }
          return Promise.resolve(controller.handleCommand(command));
        },
        subscribe(listener) {
          if (closed) return () => {};
          const unsubscribe = controller.subscribe(listener);
          connectionSubscriptions.add(unsubscribe);
          return () => {
            connectionSubscriptions.delete(unsubscribe);
            unsubscribe();
          };
        },
        close() {
          if (closed) return;
          closed = true;
          for (const unsubscribe of connectionSubscriptions) unsubscribe();
          connectionSubscriptions.clear();
          activeClients = Math.max(0, activeClients - 1);
          publishLifecycle("client-disconnected", clientId);
        },
      };
    },
    handleCommand(command) {
      const parsed = parseCommand(command);
      const requestId = parsed?.requestId ?? "invalid";
      if (disposed) return resultError(storeId, requestId, "disposed", "DevTools controller is disposed");
      if (!parsed) return resultError(storeId, requestId, "invalid-envelope", "Invalid DevTools command envelope");
      if (parsed.version !== GRAPH_DEVTOOLS_PROTOCOL_VERSION) {
        return resultError(storeId, parsed.requestId, "unsupported-version", `Unsupported DevTools protocol version ${parsed.version}`);
      }
      if (parsed.storeId !== storeId) {
        return resultError(storeId, parsed.requestId, "wrong-store", `Command targets ${parsed.storeId}, not ${storeId}`);
      }

      let result: Extract<GraphDevtoolsResult, { ok: true }>["result"];
      switch (parsed.command) {
        case "get-capabilities": result = capabilities; break;
        case "get-snapshot": result = controller.getSnapshot(); break;
        case "get-history": result = controller.getHistory(); break;
        case "get-history-status": result = controller.getHistoryStatus(); break;
        case "clear-history": controller.clearHistory(); result = { cleared: true }; break;
        default:
          return resultError(storeId, parsed.requestId, "unsupported-command", `Unsupported DevTools command ${parsed.command}`);
      }
      return {
        protocol: GRAPH_DEVTOOLS_PROTOCOL,
        version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
        requestId: parsed.requestId,
        storeId,
        ok: true,
        result,
      };
    },
    isDisposed() {
      return disposed;
    },
  };

  const dispose = () => {
    if (disposed) return;
    activeClients = 0;
    publishLifecycle("disposed");
    disposed = true;
    unsubscribeStore();
    listeners.clear();
    history.length = 0;
    historySizes.length = 0;
    retainedBytes = 0;
  };

  publishLifecycle("attached");
  return { controller, dispose };
}

function createDisposedTransport(storeId: string, clientId: string): GraphDevtoolsTransport {
  return {
    request(command) {
      const parsed = parseCommand(command);
      return Promise.resolve(resultError(
        storeId,
        parsed?.requestId ?? clientId,
        "disposed",
        "DevTools controller is disposed",
      ));
    },
    subscribe() {
      return () => {};
    },
    close() {},
  };
}

/** Attach or reference the one DevTools controller owned by `store`. */
export function attachGraphDevtools(
  store: GraphStore,
  options: AttachGraphDevtoolsOptions = {},
): GraphDevtoolsAttachment {
  if (options.enabled === false) {
    return { enabled: false, controller: null, detach() {} };
  }

  let entry = controllers.get(store);
  if (!entry || entry.controller.isDisposed()) {
    entry = { ...createController(store, options), references: 0 };
    controllers.set(store, entry);
  }
  entry.references += 1;
  let detached = false;

  return {
    enabled: true,
    controller: entry.controller,
    detach() {
      if (detached) return;
      detached = true;
      const current = controllers.get(store);
      if (!current || current.controller !== entry?.controller) return;
      current.references = Math.max(0, current.references - 1);
      if (current.references === 0) {
        current.dispose();
        controllers.delete(store);
      }
    },
  };
}

/** Return the currently attached controller without changing its lifetime. */
export function getGraphDevtoolsController(store: GraphStore): GraphDevtoolsController | null {
  const entry = controllers.get(store);
  return entry && !entry.controller.isDisposed() ? entry.controller : null;
}
