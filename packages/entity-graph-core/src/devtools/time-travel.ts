import type { GraphState } from "../graph";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  type GraphDevtoolsExpiredHistoryReceipt,
  type GraphDevtoolsGraphData,
  type GraphDevtoolsHistoryImportInspectionResult,
  type GraphDevtoolsHistoryImportInspectionReceipt,
  type GraphDevtoolsSnapshotHistoryStatus,
  type GraphDevtoolsSnapshotReference,
} from "./protocol";

export interface GraphDevtoolsRetainedSnapshot {
  readonly reference: Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>;
  readonly data: GraphDevtoolsGraphData;
}

export type GraphDevtoolsSnapshotRewindAttempt =
  | {
      status: "rewound";
      previousCursor: number | null;
      previousSource: "retained" | "import" | null;
    }
  | GraphDevtoolsExpiredHistoryReceipt
  | null;

export type GraphDevtoolsImportRestoreAttempt =
  | {
      status: "rewound";
      previousCursor: number | null;
      previousSource: "retained" | "import" | null;
    }
  | { status: "candidate-not-found" }
  | { status: "snapshot-not-found" }
  | { status: "restore-failed" };

export interface GraphDevtoolsReturnToLiveAttempt {
  previousCursor: number;
  previousSource: "retained" | "import";
}

export interface GraphDevtoolsSnapshotHistory {
  capture(state: GraphState, eventSequence: number | null): GraphDevtoolsSnapshotReference;
  getStatus(): GraphDevtoolsSnapshotHistoryStatus;
  read(cursor: number): GraphDevtoolsGraphData | null;
  rewind(
    cursor: number,
    liveState: GraphState,
    restore: (data: GraphDevtoolsGraphData) => void,
  ): GraphDevtoolsSnapshotRewindAttempt;
  inspectImport(candidate: unknown, storeId: string): GraphDevtoolsHistoryImportInspectionResult;
  restoreImport(
    candidateId: string,
    cursor: number,
    liveState: GraphState,
    restore: (data: GraphDevtoolsGraphData) => void,
  ): GraphDevtoolsImportRestoreAttempt;
  returnToLive(restore: (data: GraphDevtoolsGraphData) => void): GraphDevtoolsReturnToLiveAttempt | null;
  leaveRewindForMutation(): GraphDevtoolsReturnToLiveAttempt | null;
  clear(): void;
  dispose(): void;
}

export interface GraphDevtoolsSnapshotHistoryOptions {
  snapshotLimit: number;
  snapshotBytesLimit: number;
}

function cloneGraphData(data: GraphDevtoolsGraphData): GraphDevtoolsGraphData {
  return structuredClone({
    entities: data.entities,
    patches: data.patches,
    entityStates: data.entityStates,
    syncMetadata: data.syncMetadata,
    lists: data.lists,
  });
}

function encodedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;

  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, ancestors))
    : isRecord(value) && Object.values(value).every((item) => isJsonValue(item, ancestors));
  ancestors.delete(value);
  return valid;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isNullableFiniteNumber(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isEntityTable(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(
    (entities) => isRecord(entities) && Object.values(entities).every(isRecord),
  );
}

function isEntityStates(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((state) => (
    isRecord(state) &&
    typeof state.isFetching === "boolean" &&
    isNullableFiniteNumber(state.lastFetched) &&
    isNullableString(state.error) &&
    typeof state.stale === "boolean"
  ));
}

function isSyncMetadata(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((metadata) => (
    isRecord(metadata) &&
    typeof metadata.synced === "boolean" &&
    (metadata.origin === "server" || metadata.origin === "client" || metadata.origin === "optimistic") &&
    isNullableFiniteNumber(metadata.updatedAt)
  ));
}

function isLists(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((list) => (
    isRecord(list) &&
    Array.isArray(list.ids) && list.ids.every((id) => typeof id === "string") &&
    isNullableFiniteNumber(list.total) &&
    isNullableString(list.nextCursor) &&
    isNullableString(list.prevCursor) &&
    typeof list.hasNextPage === "boolean" &&
    typeof list.hasPrevPage === "boolean" &&
    typeof list.isFetching === "boolean" &&
    typeof list.isFetchingMore === "boolean" &&
    isNullableString(list.error) &&
    (list.lastError === null || isRecord(list.lastError)) &&
    isNullableFiniteNumber(list.lastFetched) &&
    typeof list.stale === "boolean" &&
    isNullableFiniteNumber(list.currentPage) &&
    isNullableFiniteNumber(list.pageSize)
  ));
}

function isGraphData(value: unknown): value is GraphDevtoolsGraphData {
  return isRecord(value) &&
    isEntityTable(value.entities) &&
    isEntityTable(value.patches) &&
    isEntityStates(value.entityStates) &&
    isSyncMetadata(value.syncMetadata) &&
    isLists(value.lists);
}

interface ImportedSnapshot {
  cursor: number;
  capturedAt: string;
  eventSequence: number | null;
  bytes: number;
  data: GraphDevtoolsGraphData;
}

interface ImportedCandidate {
  candidateId: string;
  bytes: number;
  snapshots: ImportedSnapshot[];
}

/** Controller-local snapshot storage. It never subscribes to or owns a graph. */
export function createGraphDevtoolsSnapshotHistory(
  options: GraphDevtoolsSnapshotHistoryOptions,
): GraphDevtoolsSnapshotHistory {
  const retained: GraphDevtoolsRetainedSnapshot[] = [];
  let retainedBytes = 0;
  let latestCursor = 0;
  let baselineCursor: number | null = null;
  let lastUnavailable: Extract<GraphDevtoolsSnapshotReference, { status: "unavailable" }> | null = null;
  const unavailableReferences = new Map<
    number,
    Extract<GraphDevtoolsSnapshotReference, { status: "unavailable" }>
  >();
  let clearedThroughCursor = 0;
  let mode: GraphDevtoolsSnapshotHistoryStatus["mode"] = "live";
  let activeCursor: number | null = null;
  let activeSource: GraphDevtoolsSnapshotHistoryStatus["source"] = null;
  let protectedLiveHead: GraphDevtoolsGraphData | null = null;
  let importedCandidate: ImportedCandidate | null = null;
  let nextImportCandidate = 1;
  let disposed = false;

  const unavailable = (
    cursor: number,
    capturedAt: string,
    eventSequence: number | null,
    reason: Extract<GraphDevtoolsSnapshotReference, { status: "unavailable" }>["reason"],
  ): GraphDevtoolsSnapshotReference => {
    const reference: Extract<GraphDevtoolsSnapshotReference, { status: "unavailable" }> = {
      cursor,
      capturedAt,
      eventSequence,
      status: "unavailable",
      reason,
    };
    lastUnavailable = reference;
    unavailableReferences.set(cursor, reference);
    while (unavailableReferences.size > Math.max(1, options.snapshotLimit)) {
      const oldest = unavailableReferences.keys().next().value as number | undefined;
      if (oldest === undefined) break;
      unavailableReferences.delete(oldest);
    }
    return reference;
  };

  const expired = (cursor: number): GraphDevtoolsExpiredHistoryReceipt | null => {
    if (cursor > latestCursor) return null;
    const status = history.getStatus();
    const unavailableReference = unavailableReferences.get(cursor);
    if (unavailableReference) {
      return {
        status: "expired-history",
        cursor,
        reason: "unavailable",
        unavailableReason: unavailableReference.reason,
        oldestCursor: status.oldestCursor,
        newestCursor: status.newestCursor,
        latestCursor: status.latestCursor,
      };
    }
    return {
      status: "expired-history",
      cursor,
      reason: cursor <= clearedThroughCursor ? "cleared" : "evicted",
      oldestCursor: status.oldestCursor,
      newestCursor: status.newestCursor,
      latestCursor: status.latestCursor,
    };
  };

  const enterRewind = (
    cursor: number,
    source: "retained" | "import",
    data: GraphDevtoolsGraphData,
    liveState: GraphState,
    restore: (data: GraphDevtoolsGraphData) => void,
  ): Extract<GraphDevtoolsSnapshotRewindAttempt, { status: "rewound" }> | null => {
    if (disposed || (mode === "rewound" && protectedLiveHead === null)) return null;
    const previousCursor = activeCursor;
    const previousSource = activeSource;
    let target: GraphDevtoolsGraphData;
    let nextLiveHead = protectedLiveHead;
    try {
      target = cloneGraphData(data);
      if (mode === "live") nextLiveHead = cloneGraphData(liveState);
      restore(target);
    } catch {
      return null;
    }
    protectedLiveHead = nextLiveHead;
    mode = "rewound";
    activeCursor = cursor;
    activeSource = source;
    return { status: "rewound", previousCursor, previousSource };
  };

  const history: GraphDevtoolsSnapshotHistory = {
    capture(state, eventSequence) {
      // Live graph activity invalidates an inspected-but-unrestored candidate
      // and releases its portion of the one controller-local memory budget.
      importedCandidate = null;
      const cursor = ++latestCursor;
      const capturedAt = new Date().toISOString();
      if (baselineCursor === null) baselineCursor = cursor;
      if (disposed || options.snapshotLimit === 0 || options.snapshotBytesLimit === 0) {
        return unavailable(cursor, capturedAt, eventSequence, "retention-disabled");
      }

      let data: GraphDevtoolsGraphData;
      let bytes: number;
      try {
        data = cloneGraphData(state);
        bytes = encodedBytes(data);
      } catch {
        return unavailable(cursor, capturedAt, eventSequence, "capture-failed");
      }
      if (bytes > options.snapshotBytesLimit) {
        return unavailable(cursor, capturedAt, eventSequence, "oversize");
      }

      const reference: Extract<GraphDevtoolsSnapshotReference, { status: "retained" }> = {
        cursor,
        capturedAt,
        eventSequence,
        status: "retained",
        bytes,
      };
      retained.push({ reference, data });
      retainedBytes += bytes;
      while (
        retained.length > options.snapshotLimit ||
        retainedBytes > options.snapshotBytesLimit
      ) {
        const removed = retained.shift();
        retainedBytes -= removed?.reference.bytes ?? 0;
      }
      return reference;
    },
    getStatus() {
      return {
        mode,
        cursor: activeCursor,
        source: activeSource,
        retainedSnapshots: retained.length,
        retainedBytes,
        snapshotLimit: options.snapshotLimit,
        byteLimit: options.snapshotBytesLimit,
        baselineCursor,
        oldestCursor: retained[0]?.reference.cursor ?? null,
        newestCursor: retained.length > 0
          ? retained[retained.length - 1]!.reference.cursor
          : null,
        latestCursor: latestCursor === 0 ? null : latestCursor,
        lastUnavailable,
        importCandidate: importedCandidate
          ? {
              candidateId: importedCandidate.candidateId,
              snapshots: importedCandidate.snapshots.length,
              bytes: importedCandidate.bytes,
            }
          : null,
      };
    },
    read(cursor) {
      const snapshot = retained.find((candidate) => candidate.reference.cursor === cursor);
      return snapshot ? cloneGraphData(snapshot.data) : null;
    },
    rewind(cursor, liveState, restore) {
      if (disposed) return null;
      const snapshot = retained.find((candidate) => candidate.reference.cursor === cursor);
      if (!snapshot) return expired(cursor);
      return enterRewind(cursor, "retained", snapshot.data, liveState, restore);
    },
    inspectImport(candidate, storeId) {
      // Every inspection attempt replaces the prior inert candidate, including
      // a rejected attempt, so confirmation can never target stale UI state.
      importedCandidate = null;
      const rejected = (
        reason: Extract<GraphDevtoolsHistoryImportInspectionResult, { status: "rejected" }>["reason"],
        message: string,
      ): GraphDevtoolsHistoryImportInspectionResult => ({ status: "rejected", reason, message });
      try {
        if (!isRecord(candidate) || !isJsonValue(candidate) || candidate.protocol !== GRAPH_DEVTOOLS_PROTOCOL) {
          return rejected("invalid-envelope", "Import must use the Prometheus entity-graph DevTools protocol");
        }
        if (candidate.version !== GRAPH_DEVTOOLS_PROTOCOL_VERSION) {
          return rejected("unsupported-version", `Import protocol version ${String(candidate.version)} is unsupported`);
        }
        if (candidate.storeId !== storeId) {
          return rejected("wrong-store", `Import targets ${String(candidate.storeId)}, not ${storeId}`);
        }
        if (!isTimestamp(candidate.exportedAt) || !Array.isArray(candidate.snapshots) || candidate.snapshots.length === 0) {
          return rejected("invalid-envelope", "Import metadata and at least one snapshot are required");
        }
        if (candidate.snapshots.length > options.snapshotLimit) {
          return rejected("snapshot-limit-exceeded", `Import contains ${candidate.snapshots.length} snapshots; limit is ${options.snapshotLimit}`);
        }
        const importBytes = encodedBytes(candidate);
        if (importBytes > options.snapshotBytesLimit) {
          return rejected("byte-limit-exceeded", `Import contains ${importBytes} bytes; limit is ${options.snapshotBytesLimit}`);
        }

        const snapshots: ImportedSnapshot[] = [];
        let previousCursor = 0;
        for (const value of candidate.snapshots) {
          if (!isRecord(value)) return rejected("invalid-envelope", "Every imported snapshot must be an object");
          const cursor = value.cursor;
          const eventSequence = value.eventSequence;
          if (
            typeof cursor !== "number" || !Number.isSafeInteger(cursor) || cursor <= previousCursor ||
            !isTimestamp(value.capturedAt) ||
            !(eventSequence === null || (typeof eventSequence === "number" && Number.isSafeInteger(eventSequence) && eventSequence > 0)) ||
            !isGraphData(value.data)
          ) {
            return rejected("invalid-envelope", "Imported snapshots must have ordered stable cursors and valid graph data");
          }
          const data = cloneGraphData(value.data);
          snapshots.push({
            cursor,
            capturedAt: value.capturedAt,
            eventSequence,
            bytes: encodedBytes(data),
            data,
          });
          previousCursor = cursor;
        }

        const candidateBytes = snapshots.reduce((total, snapshot) => total + snapshot.bytes, 0);
        while (
          retained.length + snapshots.length > options.snapshotLimit ||
          retainedBytes + candidateBytes > options.snapshotBytesLimit
        ) {
          const removed = retained.shift();
          if (!removed) break;
          retainedBytes -= removed.reference.bytes;
        }

        const candidateId = `import-${nextImportCandidate++}`;
        importedCandidate = { candidateId, bytes: candidateBytes, snapshots };
        const receipt: GraphDevtoolsHistoryImportInspectionReceipt = {
          status: "awaiting-confirmation",
          candidateId,
          storeId,
          protocolVersion: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
          inspectedAt: new Date().toISOString(),
          bytes: importBytes,
          snapshots: snapshots.map(({ data: _data, ...metadata }) => metadata),
        };
        return receipt;
      } catch {
        return rejected("invalid-envelope", "Import could not be safely inspected or cloned");
      }
    },
    restoreImport(candidateId, cursor, liveState, restore) {
      if (!importedCandidate || importedCandidate.candidateId !== candidateId) {
        return { status: "candidate-not-found" };
      }
      const snapshot = importedCandidate.snapshots.find((candidate) => candidate.cursor === cursor);
      if (!snapshot) return { status: "snapshot-not-found" };
      const restored = enterRewind(cursor, "import", snapshot.data, liveState, restore);
      if (!restored) return { status: "restore-failed" };
      // Confirmation is one-shot. Reusing imported data requires a fresh,
      // visible inspection and confirmation cycle.
      importedCandidate = null;
      return restored;
    },
    returnToLive(restore) {
      if (disposed || mode !== "rewound" || protectedLiveHead === null) return null;
      const previousCursor = activeCursor;
      const previousSource = activeSource;
      if (previousCursor === null || previousSource === null) return null;
      try {
        restore(cloneGraphData(protectedLiveHead));
      } catch {
        return null;
      }
      mode = "live";
      activeCursor = null;
      activeSource = null;
      protectedLiveHead = null;
      return { previousCursor, previousSource };
    },
    leaveRewindForMutation() {
      if (mode !== "rewound") return null;
      const previousCursor = activeCursor;
      const previousSource = activeSource;
      if (previousCursor === null || previousSource === null) return null;
      mode = "live";
      activeCursor = null;
      activeSource = null;
      protectedLiveHead = null;
      return { previousCursor, previousSource };
    },
    clear() {
      retained.length = 0;
      retainedBytes = 0;
      clearedThroughCursor = latestCursor;
      importedCandidate = null;
    },
    dispose() {
      disposed = true;
      retained.length = 0;
      retainedBytes = 0;
      lastUnavailable = null;
      unavailableReferences.clear();
      mode = "live";
      activeCursor = null;
      activeSource = null;
      protectedLiveHead = null;
      importedCandidate = null;
    },
  };

  return history;
}
