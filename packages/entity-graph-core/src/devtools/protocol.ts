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
  features: ReadonlyArray<
    | "semantic-events"
    | "diagnostic-events"
    | "bounded-history"
    | "multi-client"
    | "multi-store"
    | "entity-inspection"
    | "view-inspection"
    | "relationship-inspection"
    | "local-preview"
  >;
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

export interface GraphDevtoolsViewEvent extends GraphDevtoolsEventBase {
  type: "view";
  payload: {
    state: "registered" | "membership-changed" | "unregistered";
    viewId: string;
    membershipCount: number;
  };
}

export type GraphDevtoolsEvent =
  | GraphDevtoolsMutationEvent
  | GraphDevtoolsLifecycleEvent
  | GraphDevtoolsDiagnosticEvent
  | GraphDevtoolsViewEvent;

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

export interface GraphDevtoolsEntityError {
  kind: "entity-fetch";
  message: string;
  /** `null` when the graph only retained the compatibility error string. */
  retryable: boolean | null;
}

export interface GraphDevtoolsEntityDirtyReason {
  kind: "local-patch" | "sync-state";
  field: string | null;
  change: "added" | "changed" | "unsynced";
}

export interface GraphDevtoolsEntityRecord {
  key: string;
  type: string;
  id: string;
  presence: "present" | "missing-canonical";
  canonical: unknown | null;
  patch: unknown | null;
  merged: unknown | null;
  dirty: boolean;
  dirtyReasons: GraphDevtoolsEntityDirtyReason[];
  entityState: {
    isFetching: boolean;
    lastFetchedAt: string | null;
    stale: boolean;
    error: GraphDevtoolsEntityError | null;
  };
  sync: {
    synced: boolean;
    origin: "server" | "client" | "optimistic";
    updatedAt: string | null;
  };
  /** Store-local revision; increments once per publication that touches this entity. */
  revision: number;
  /** Stable IDs of registered views currently displaying this entity. */
  viewIds: string[];
}

export interface GraphDevtoolsEntityRecordsSnapshot {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  storeId: string;
  capturedAt: string;
  entityRecords: GraphDevtoolsEntityRecord[];
}

export interface GraphDevtoolsViewDefinition {
  viewId: string;
  label: string;
  kind: "entity" | "list";
  entityType: string;
  queryKey?: string | null;
}

export interface GraphDevtoolsViewMembership {
  type: string;
  id: string;
}

export interface GraphDevtoolsViewListStats {
  visibleCount: number;
  graphCount: number;
  total: number | null;
  isFetching: boolean;
  isFetchingMore: boolean;
  stale: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GraphDevtoolsViewRecord extends GraphDevtoolsViewDefinition {
  queryKey: string | null;
  registeredAt: string;
  lastRenderedAt: string | null;
  renderCount: number;
  membership: GraphDevtoolsViewMembership[];
  list: GraphDevtoolsViewListStats | null;
}

export interface GraphDevtoolsEntityViewMembership extends GraphDevtoolsViewMembership {
  viewIds: string[];
}

export interface GraphDevtoolsViewsSnapshot {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  storeId: string;
  capturedAt: string;
  views: GraphDevtoolsViewRecord[];
  entityViewMembership: GraphDevtoolsEntityViewMembership[];
}

export interface GraphDevtoolsRelationshipEndpoint {
  type: string;
  id: string;
  field?: string | null;
}

export interface GraphDevtoolsRelationship {
  relation: string;
  cardinality: "belongsTo" | "hasMany" | "manyToMany";
  direction: "outgoing" | "reverse";
  source: GraphDevtoolsRelationshipEndpoint;
  target: GraphDevtoolsRelationshipEndpoint;
  status: "resolved" | "missing-target";
}

export interface GraphDevtoolsRelationshipsSnapshot {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  storeId: string;
  capturedAt: string;
  relationships: GraphDevtoolsRelationship[];
}

export interface GraphDevtoolsPreviewEntityPatchPayload {
  type: string;
  id: string;
  patch: Record<string, unknown>;
}

export interface GraphDevtoolsRestoreEntityPreviewPayload {
  previewId: string;
}

export interface GraphDevtoolsPreviewAppliedReceipt {
  previewId: string;
  entity: { type: string; id: string };
  priorPatch: unknown | null;
  previewPatch: unknown;
  appliedPatch: unknown;
  baselineRevision: number;
  previewRevision: number;
  appliedAt: string;
}

export interface GraphDevtoolsPreviewRestoredReceipt {
  previewId: string;
  status: "restored";
  restoredPatch: unknown | null;
  observedRevision: number;
  restoredAt: string;
}

export interface GraphDevtoolsPreviewConflictReceipt {
  previewId: string;
  status: "conflict";
  reason: "entity-changed-since-preview";
  expectedRevision: number;
  observedRevision: number;
  currentPatch: unknown | null;
  priorPatch: unknown | null;
}

export type GraphDevtoolsPreviewRestoreReceipt =
  | GraphDevtoolsPreviewRestoredReceipt
  | GraphDevtoolsPreviewConflictReceipt;

export type GraphDevtoolsCommandName =
  | "get-capabilities"
  | "get-snapshot"
  | "get-history"
  | "get-history-status"
  | "get-entity-records"
  | "get-views"
  | "get-relationships"
  | "preview-entity-patch"
  | "restore-entity-preview"
  | "clear-history";

export interface GraphDevtoolsCommand {
  protocol: typeof GRAPH_DEVTOOLS_PROTOCOL;
  version: typeof GRAPH_DEVTOOLS_PROTOCOL_VERSION;
  requestId: string;
  storeId: string;
  command: GraphDevtoolsCommandName;
  payload?: unknown;
}

export type GraphDevtoolsResultPayload =
  | GraphDevtoolsCapabilities
  | GraphDevtoolsSnapshot
  | GraphDevtoolsHistoryStatus
  | GraphDevtoolsEntityRecordsSnapshot
  | GraphDevtoolsViewsSnapshot
  | GraphDevtoolsRelationshipsSnapshot
  | GraphDevtoolsPreviewAppliedReceipt
  | GraphDevtoolsPreviewRestoreReceipt
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
        code:
          | "invalid-envelope"
          | "invalid-payload"
          | "unsupported-version"
          | "wrong-store"
          | "unsupported-command"
          | "entity-not-found"
          | "preview-not-found"
          | "disposed";
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
  destination: "history" | "inspection";
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
