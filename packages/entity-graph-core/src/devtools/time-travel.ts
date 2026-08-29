import type { GraphState } from "../graph";
import type {
  GraphDevtoolsSnapshotHistoryStatus,
  GraphDevtoolsSnapshotReference,
} from "./protocol";

export type GraphDevtoolsGraphData = Pick<
  GraphState,
  "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"
>;

export interface GraphDevtoolsRetainedSnapshot {
  readonly reference: Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>;
  readonly data: GraphDevtoolsGraphData;
}

export interface GraphDevtoolsSnapshotHistory {
  capture(state: GraphState, eventSequence: number | null): GraphDevtoolsSnapshotReference;
  getStatus(): GraphDevtoolsSnapshotHistoryStatus;
  read(cursor: number): GraphDevtoolsGraphData | null;
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

/** Controller-local snapshot storage. It never subscribes to or owns a graph. */
export function createGraphDevtoolsSnapshotHistory(
  options: GraphDevtoolsSnapshotHistoryOptions,
): GraphDevtoolsSnapshotHistory {
  const retained: GraphDevtoolsRetainedSnapshot[] = [];
  let retainedBytes = 0;
  let latestCursor = 0;
  let baselineCursor: number | null = null;
  let lastUnavailable: Extract<GraphDevtoolsSnapshotReference, { status: "unavailable" }> | null = null;
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
    return reference;
  };

  const history: GraphDevtoolsSnapshotHistory = {
    capture(state, eventSequence) {
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
        mode: "live",
        cursor: null,
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
      };
    },
    read(cursor) {
      const snapshot = retained.find((candidate) => candidate.reference.cursor === cursor);
      return snapshot ? cloneGraphData(snapshot.data) : null;
    },
    clear() {
      retained.length = 0;
      retainedBytes = 0;
    },
    dispose() {
      disposed = true;
      retained.length = 0;
      retainedBytes = 0;
      lastUnavailable = null;
    },
  };

  return history;
}
