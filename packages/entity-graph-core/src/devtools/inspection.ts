import {
  EMPTY_ENTITY_STATE,
  EMPTY_SYNC_METADATA,
  type GraphState,
} from "../graph";
import type {
  GraphDevtoolsChange,
  GraphDevtoolsEntityDirtyReason,
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEntityRecordsSnapshot,
  GraphDevtoolsValueContext,
  GraphDevtoolsValuePolicy,
} from "./protocol";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
} from "./protocol";
import { toGraphDevtoolsTransportValue } from "./projection";

type GraphInspectionState = Pick<
  GraphState,
  "entities" | "patches" | "entityStates" | "syncMetadata"
>;

type GraphEntityIdentityState = Pick<GraphState, "entities" | "patches">;

function wireEntityKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/** Collision-free key for controller-owned maps; never exposed as a wire identity. */
export function graphDevtoolsEntityIdentityKey(type: string, id: string): string {
  return JSON.stringify([type, id]);
}

export function parseGraphDevtoolsEntityIdentityKey(
  key: string,
): { type: string; id: string } | null {
  try {
    const value: unknown = JSON.parse(key);
    if (
      Array.isArray(value) && value.length === 2 &&
      typeof value[0] === "string" && typeof value[1] === "string"
    ) return { type: value[0], id: value[1] };
  } catch {
    // Internal map keys may be absent or stale; never surface parser failures.
  }
  return null;
}

function splitEntityKey(key: string): { type: string; id: string } | null {
  const separator = key.indexOf(":");
  if (separator < 1 || separator === key.length - 1) return null;
  return { type: key.slice(0, separator), id: key.slice(separator + 1) };
}

/** Resolve legacy `type:id` metadata keys against actual graph buckets first. */
export function graphDevtoolsEntityIdentitiesForStateKey(
  state: GraphEntityIdentityState,
  key: string,
): Array<{ type: string; id: string }> {
  const matches: Array<{ type: string; id: string }> = [];
  const types = new Set([...Object.keys(state.entities), ...Object.keys(state.patches)]);
  for (const type of types) {
    const ids = new Set([
      ...Object.keys(state.entities[type] ?? {}),
      ...Object.keys(state.patches[type] ?? {}),
    ]);
    for (const id of ids) {
      if (wireEntityKey(type, id) === key) matches.push({ type, id });
    }
  }
  if (matches.length > 0) return matches;
  const fallback = splitEntityKey(key);
  return fallback ? [fallback] : [];
}

function toIsoTimestamp(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

function compareEntityIdentity(
  left: { type: string; id: string },
  right: { type: string; id: string },
): number {
  if (left.type !== right.type) return left.type < right.type ? -1 : 1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function collectEntityIdentities(state: GraphInspectionState): Array<{ type: string; id: string }> {
  const identities = new Map<string, { type: string; id: string }>();
  for (const [type, bucket] of Object.entries(state.entities)) {
    for (const id of Object.keys(bucket)) {
      identities.set(graphDevtoolsEntityIdentityKey(type, id), { type, id });
    }
  }
  for (const [type, bucket] of Object.entries(state.patches)) {
    for (const id of Object.keys(bucket)) {
      identities.set(graphDevtoolsEntityIdentityKey(type, id), { type, id });
    }
  }
  for (const key of [...Object.keys(state.entityStates), ...Object.keys(state.syncMetadata)]) {
    for (const identity of graphDevtoolsEntityIdentitiesForStateKey(state, key)) {
      identities.set(graphDevtoolsEntityIdentityKey(identity.type, identity.id), identity);
    }
  }
  return [...identities.values()].sort(compareEntityIdentity);
}

function dirtyReasonsFor(
  canonical: Record<string, unknown> | undefined,
  patch: Record<string, unknown> | undefined,
  synced: boolean,
): GraphDevtoolsEntityDirtyReason[] {
  const reasons: GraphDevtoolsEntityDirtyReason[] = [];
  for (const field of Object.keys(patch ?? {}).sort()) {
    reasons.push({
      kind: "local-patch",
      field,
      change: canonical && Object.hasOwn(canonical, field) ? "changed" : "added",
    });
  }
  if (!synced) {
    reasons.push({ kind: "sync-state", field: null, change: "unsynced" });
  }
  return reasons;
}

export function projectGraphDevtoolsInspectionValue(
  value: unknown,
  policy: GraphDevtoolsValuePolicy,
  context: Omit<GraphDevtoolsValueContext, "fieldPath" | "side" | "destination">,
): unknown {
  if (policy.mode !== "include") return { $type: "hidden-by-policy" };
  try {
    const projected = policy.redact
      ? policy.redact(value, {
          ...context,
          fieldPath: [],
          side: "after",
          destination: "inspection",
        })
      : value;
    return toGraphDevtoolsTransportValue(projected);
  } catch {
    return { $type: "redaction-error" };
  }
}

function recordFor(
  state: GraphInspectionState,
  storeId: string,
  type: string,
  id: string,
  revisions: ReadonlyMap<string, number>,
  valuePolicy: GraphDevtoolsValuePolicy,
): GraphDevtoolsEntityRecord {
  const key = wireEntityKey(type, id);
  const identityKey = graphDevtoolsEntityIdentityKey(type, id);
  const canonical = state.entities[type]?.[id];
  const storedPatch = state.patches[type]?.[id];
  const patch = storedPatch && Object.keys(storedPatch).length > 0 ? storedPatch : undefined;
  const entityState = state.entityStates[key] ?? EMPTY_ENTITY_STATE;
  const sync = state.syncMetadata[key] ?? EMPTY_SYNC_METADATA;
  const dirtyReasons = dirtyReasonsFor(canonical, patch, sync.synced);

  return {
    key,
    type,
    id,
    presence: canonical ? "present" : "missing-canonical",
    canonical: canonical
      ? projectGraphDevtoolsInspectionValue(canonical, valuePolicy, { storeId, category: "entity", key: type, id })
      : null,
    patch: patch
      ? projectGraphDevtoolsInspectionValue(patch, valuePolicy, { storeId, category: "patch", key: type, id })
      : null,
    merged: canonical
      ? projectGraphDevtoolsInspectionValue(
          { ...canonical, ...(patch ?? {}) },
          valuePolicy,
          { storeId, category: "entity", key: type, id },
        )
      : null,
    dirty: dirtyReasons.length > 0,
    dirtyReasons,
    entityState: {
      isFetching: entityState.isFetching,
      lastFetchedAt: toIsoTimestamp(entityState.lastFetched),
      stale: entityState.stale,
      error: entityState.error === null
        ? null
        : {
            kind: "entity-fetch",
            message: entityState.error,
            retryable: null,
          },
    },
    sync: {
      synced: sync.synced,
      origin: sync.origin,
      updatedAt: toIsoTimestamp(sync.updatedAt),
    },
    revision: revisions.get(identityKey) ?? 0,
    viewIds: [],
  };
}

/** Project the current entity inspection model without retaining graph values. */
export function projectGraphDevtoolsEntityRecords(
  state: GraphInspectionState,
  storeId: string,
  revisions: ReadonlyMap<string, number>,
  valuePolicy: GraphDevtoolsValuePolicy = { mode: "metadata-only" },
  viewIdsByEntity: ReadonlyMap<string, readonly string[]> = new Map(),
): GraphDevtoolsEntityRecordsSnapshot {
  return {
    protocol: GRAPH_DEVTOOLS_PROTOCOL,
    version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
    storeId,
    capturedAt: new Date().toISOString(),
    entityRecords: collectEntityIdentities(state).map(({ type, id }) => {
      const record = recordFor(state, storeId, type, id, revisions, valuePolicy);
      return {
        ...record,
        viewIds: [...(viewIdsByEntity.get(graphDevtoolsEntityIdentityKey(type, id)) ?? [])],
      };
    }),
  };
}

/** Advance each touched entity exactly once for one completed store publication. */
export function advanceGraphDevtoolsEntityRevisions(
  changes: ReadonlyArray<GraphDevtoolsChange>,
  revisions: Map<string, number>,
  state: GraphEntityIdentityState,
  valueRevisions?: Map<string, number>,
): void {
  const touched = new Set<string>();
  const valueTouched = new Set<string>();
  for (const change of changes) {
    if ((change.category === "entity" || change.category === "patch") && change.id !== undefined) {
      const key = graphDevtoolsEntityIdentityKey(change.key, change.id);
      touched.add(key);
      valueTouched.add(key);
      continue;
    }
    if (change.category === "entity-state" || change.category === "sync") {
      for (const identity of graphDevtoolsEntityIdentitiesForStateKey(state, change.key)) {
        touched.add(graphDevtoolsEntityIdentityKey(identity.type, identity.id));
      }
    }
  }
  for (const key of touched) revisions.set(key, (revisions.get(key) ?? 0) + 1);
  if (valueRevisions) {
    for (const key of valueTouched) valueRevisions.set(key, (valueRevisions.get(key) ?? 0) + 1);
  }
}
