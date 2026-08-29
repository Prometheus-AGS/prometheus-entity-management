/** Stable wire protocol identifier for every DevTools envelope. */
export const GRAPH_DEVTOOLS_PROTOCOL = "prometheus.entity-graph.devtools" as const;

/** Current wire protocol major. Incompatible envelopes must be rejected. */
export const GRAPH_DEVTOOLS_PROTOCOL_VERSION = 1 as const;

export type GraphDevtoolsChangeCategory =
  | "entity"
  | "patch"
  | "entity-state"
  | "sync"
  | "list"
  | "store";

export type GraphDevtoolsChangeAction = "added" | "updated" | "removed" | "replaced";

export interface GraphDevtoolsCounts {
  entityTypes: number;
  entities: number;
  patchedEntities: number;
  entityStates: number;
  syncMetadata: number;
  lists: number;
  listMemberships: number;
  fetching: number;
  stale: number;
  errors: number;
}

export interface GraphDevtoolsChange {
  category: GraphDevtoolsChangeCategory;
  action: GraphDevtoolsChangeAction;
  /** Entity type, entity-state key, or list query key. */
  key: string;
  /** Entity id when the change targets one normalized entity. */
  id?: string;
  beforeCount?: number;
  afterCount?: number;
  valueState:
    | "hidden-by-policy"
    | "included"
    | "redacted"
    | "redaction-error"
    | "truncated";
  /** Omitted under the default metadata-only policy. */
  before?: unknown;
  /** Omitted under the default metadata-only policy. */
  after?: unknown;
}

export interface GraphDevtoolsCapabilities {
  protocolVersion: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  metadataOnlyByDefault: true;
  commands: ReadonlyArray<GraphDevtoolsCommandName>;
  features: ReadonlyArray<"semantic-events" | "diagnostic-events" | "bounded-history" | "multi-client" | "multi-store">;
  limits: {
    historyEvents: number;
    historyBytes: number;
    eventBytes: number;
  };
}

export interface GraphDevtoolsEventBase {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  storeId: string;
  sequence: number;
  eventId: string;
  /** In v1 one event represents one Zustand publication, so this equals eventId. */
  correlationId: string;
  observedAt: string;
}

export interface GraphDevtoolsMutationEvent extends GraphDevtoolsEventBase {
  type: "mutation";
  payload: {
    changes: GraphDevtoolsChange[];
    before: GraphDevtoolsCounts;
    after: GraphDevtoolsCounts;
    /** Time spent projecting the already-completed store publication. */
    projectionDurationMs: number;
    valuesTruncated: boolean;
    /** Semantic changes omitted only when metadata itself exceeds the event byte limit. */
    changesOmitted: number;
  };
}

export interface GraphDevtoolsLifecycleEvent extends GraphDevtoolsEventBase {
  type: "lifecycle";
  payload: {
    state: "attached" | "client-connected" | "client-disconnected" | "disposed";
    clientId?: string;
    activeClients: number;
  };
}

export interface GraphDevtoolsDiagnosticEvent extends GraphDevtoolsEventBase {
  type: "diagnostic";
  payload: {
    code: "projection-failed";
    message: string;
  };
}

export type GraphDevtoolsEvent =
  | GraphDevtoolsMutationEvent
  | GraphDevtoolsLifecycleEvent
  | GraphDevtoolsDiagnosticEvent;

export interface GraphDevtoolsSnapshot {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  storeId: string;
  capturedAt: string;
  counts: GraphDevtoolsCounts;
  history: GraphDevtoolsHistoryStatus;
}

export interface GraphDevtoolsHistoryStatus {
  retainedEvents: number;
  retainedBytes: number;
  eventLimit: number;
  byteLimit: number;
  oldestSequence: number | null;
  newestSequence: number | null;
}

export type GraphDevtoolsCommandName =
  | "get-capabilities"
  | "get-snapshot"
  | "get-history"
  | "get-history-status"
  | "clear-history";

export interface GraphDevtoolsCommand {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  requestId: string;
  storeId: string;
  command: GraphDevtoolsCommandName;
}

export type GraphDevtoolsResultPayload =
  | GraphDevtoolsCapabilities
  | GraphDevtoolsSnapshot
  | GraphDevtoolsHistoryStatus
  | ReadonlyArray<GraphDevtoolsEvent>
  | { cleared: true };

export type GraphDevtoolsResult =
  | {
      protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
      version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
      requestId: string;
      storeId: string;
      ok: true;
      result: GraphDevtoolsResultPayload;
    }
  | {
      protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
      version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
      requestId: string;
      storeId: string;
      ok: false;
      error: {
        code: "invalid-envelope" | "unsupported-version" | "wrong-store" | "unsupported-command" | "disposed";
        message: string;
      };
    };

export interface GraphDevtoolsValueContext {
  storeId: string;
  category: GraphDevtoolsChangeCategory;
  key: string;
  id?: string;
  /** Empty means the redactor is receiving the whole current change value. */
  fieldPath: ReadonlyArray<string | number>;
  side: "before" | "after";
  destination: "history";
}

/** Values never leave the graph under the default metadata-only policy. */
export type GraphDevtoolsValuePolicy =
  | { mode?: "metadata-only" }
  | {
      mode: "include";
      redact?: (value: unknown, context: GraphDevtoolsValueContext) => unknown;
    };

export interface GraphDevtoolsTransport {
  request(command: unknown): Promise<GraphDevtoolsResult>;
  subscribe(listener: (event: GraphDevtoolsEvent) => void): () => void;
  close(): void;
}
