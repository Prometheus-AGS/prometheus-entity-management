import type { GraphState } from "../graph";
import type {
  GraphDevtoolsChange,
  GraphDevtoolsCounts,
  GraphDevtoolsValueContext,
  GraphDevtoolsValuePolicy,
} from "./protocol";

type GraphDataState = Pick<
  GraphState,
  "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"
>;

function countRecordEntries(record: Record<string, unknown>): number {
  return Object.keys(record).length;
}

export function collectGraphDevtoolsCounts(state: GraphDataState): GraphDevtoolsCounts {
  let entities = 0;
  let entityTypes = 0;
  for (const bucket of Object.values(state.entities)) {
    const count = Object.keys(bucket).length;
    if (count > 0) entityTypes += 1;
    entities += count;
  }

  let patchedEntities = 0;
  for (const bucket of Object.values(state.patches)) {
    for (const patch of Object.values(bucket)) {
      if (Object.keys(patch).length > 0) patchedEntities += 1;
    }
  }

  let listMemberships = 0;
  let fetching = 0;
  let stale = 0;
  let errors = 0;
  for (const list of Object.values(state.lists)) {
    listMemberships += list.ids.length;
    if (list.isFetching || list.isFetchingMore) fetching += 1;
    if (list.stale) stale += 1;
    if (list.error !== null || list.lastError !== null) errors += 1;
  }
  for (const entityState of Object.values(state.entityStates)) {
    if (entityState.isFetching) fetching += 1;
    if (entityState.stale) stale += 1;
    if (entityState.error !== null) errors += 1;
  }

  return {
    entityTypes,
    entities,
    patchedEntities,
    entityStates: countRecordEntries(state.entityStates),
    syncMetadata: countRecordEntries(state.syncMetadata),
    lists: countRecordEntries(state.lists),
    listMemberships,
    fetching,
    stale,
    errors,
  };
}

function withValues(
  change: Omit<GraphDevtoolsChange, "valueState" | "before" | "after">,
  before: unknown,
  after: unknown,
  policy: GraphDevtoolsValuePolicy,
  storeId: string,
): GraphDevtoolsChange {
  if (policy.mode !== "include") return { ...change, valueState: "hidden-by-policy" };
  const redact = policy.redact ?? ((value: unknown) => value);
  const baseContext: Omit<GraphDevtoolsValueContext, "side"> = {
    storeId,
    category: change.category,
    key: change.key,
    ...(change.id !== undefined ? { id: change.id } : {}),
    fieldPath: [],
    destination: "history",
  };
  const projectValue = (value: unknown, side: GraphDevtoolsValueContext["side"]) => {
    try {
      return { value: toGraphDevtoolsTransportValue(redact(value, { ...baseContext, side })), failed: false };
    } catch {
      return { value: { $type: "redaction-error" }, failed: true };
    }
  };
  const projectedBefore = before !== undefined ? projectValue(before, "before") : undefined;
  const projectedAfter = after !== undefined ? projectValue(after, "after") : undefined;
  return {
    ...change,
    valueState:
      projectedBefore?.failed || projectedAfter?.failed
        ? "redaction-error"
        : policy.redact
          ? "redacted"
          : "included",
    ...(projectedBefore ? { before: projectedBefore.value } : {}),
    ...(projectedAfter ? { after: projectedAfter.value } : {}),
  };
}

/** Convert graph values into deterministic JSON-safe DevTools payloads. */
export function toGraphDevtoolsTransportValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return { $type: "bigint", value: value.toString() };
  if (typeof value === "undefined") return { $type: "undefined" };
  if (typeof value === "function" || typeof value === "symbol") return { $type: typeof value };
  if (value instanceof Date) return { $type: "date", value: value.toISOString() };
  if (value instanceof Error) return { $type: "error", name: value.name, message: value.message };
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return { $type: "circular" };
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => toGraphDevtoolsTransportValue(item, seen));
    const normalized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      normalized[key] = toGraphDevtoolsTransportValue(item, seen);
    }
    return normalized;
  } finally {
    seen.delete(value);
  }
}

function actionFor(before: unknown, after: unknown): GraphDevtoolsChange["action"] {
  if (before === undefined) return "added";
  if (after === undefined) return "removed";
  return "updated";
}

function diffNestedRecords(
  category: "entity" | "patch",
  before: Record<string, Record<string, Record<string, unknown>>>,
  after: Record<string, Record<string, Record<string, unknown>>>,
  policy: GraphDevtoolsValuePolicy,
  storeId: string,
): GraphDevtoolsChange[] {
  const changes: GraphDevtoolsChange[] = [];
  for (const type of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const beforeBucket = before[type] ?? {};
    const afterBucket = after[type] ?? {};
    if (beforeBucket === afterBucket) continue;
    for (const id of new Set([...Object.keys(beforeBucket), ...Object.keys(afterBucket)])) {
      const previous = beforeBucket[id];
      const current = afterBucket[id];
      if (previous === current) continue;
      changes.push(withValues({
        category,
        action: actionFor(previous, current),
        key: type,
        id,
      }, previous, current, policy, storeId));
    }
  }
  return changes;
}

function diffFlatRecords(
  category: "entity-state" | "sync",
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  policy: GraphDevtoolsValuePolicy,
  storeId: string,
): GraphDevtoolsChange[] {
  const changes: GraphDevtoolsChange[] = [];
  if (before === after) return changes;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previous = before[key];
    const current = after[key];
    if (previous === current) continue;
    changes.push(withValues({
      category,
      action: actionFor(previous, current),
      key,
    }, previous, current, policy, storeId));
  }
  return changes;
}

function diffLists(
  before: GraphState["lists"],
  after: GraphState["lists"],
  policy: GraphDevtoolsValuePolicy,
  storeId: string,
): GraphDevtoolsChange[] {
  const changes: GraphDevtoolsChange[] = [];
  if (before === after) return changes;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previous = before[key];
    const current = after[key];
    if (previous === current) continue;
    changes.push(withValues({
      category: "list",
      action: actionFor(previous, current),
      key,
      beforeCount: previous?.ids.length ?? 0,
      afterCount: current?.ids.length ?? 0,
    }, previous, current, policy, storeId));
  }
  return changes;
}

/**
 * Project one Zustand publication into semantic graph effects. This is the
 * authoritative boundary because it also observes direct `store.setState`
 * hydration, rollback, restore, and external adapter writes.
 */
export function projectGraphDevtoolsChanges(
  before: GraphDataState,
  after: GraphDataState,
  policy: GraphDevtoolsValuePolicy,
  storeId: string,
): GraphDevtoolsChange[] {
  return [
    ...diffNestedRecords("entity", before.entities, after.entities, policy, storeId),
    ...diffNestedRecords("patch", before.patches, after.patches, policy, storeId),
    ...diffFlatRecords("entity-state", before.entityStates, after.entityStates, policy, storeId),
    ...diffFlatRecords("sync", before.syncMetadata, after.syncMetadata, policy, storeId),
    ...diffLists(before.lists, after.lists, policy, storeId),
  ];
}
