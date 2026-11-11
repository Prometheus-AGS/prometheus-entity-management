/**
 * agent/ag-ui-bridge.ts — Ingest AG-UI agent state into the entity graph.
 *
 * The headline agentic capability (change C2): an agent emits AG-UI state, it
 * lands in the entity graph, and every view reading those entities updates.
 *
 * AG-UI (https://docs.ag-ui.com) streams two state events:
 *   - STATE_SNAPSHOT — the complete agent state object
 *   - STATE_DELTA    — a partial update as an RFC-6902 JSON Patch
 *
 * Our `patchEntity`/`upsertEntity` already align with this model: STATE_DELTA's
 * JSON Patch maps onto the graph, and writes route through the C1 MergeStrategy
 * so agent edits resolve against concurrent realtime/local writes.
 *
 * Mapping: the agent's state tree is projected onto entities via an
 * {@link AgUiStateMapping}. Each entry says "the object at this JSON-Pointer
 * prefix is an entity of `type`, keyed by `id` (a field of that object or a
 * constant)". This keeps the bridge transport-agnostic — it does not depend on
 * `@ag-ui/client` and takes plain event objects, so `@ag-ui/*` stays an OPTIONAL
 * peer (use it for typed events on the consumer side if desired).
 *
 * Lossless since 4.4.0:
 * - The complete agent state document (plain fields included) is stored as the
 *   `AgUiState` entity (`readAgUiState`), and deltas apply to it, so scalars
 *   such as `phase` and root-pointer mappings survive.
 * - Each collection mapping's order is kept as an ordered list
 *   (`agUiListKey(mapping)`), so `move` and positional `add` are represented.
 * - Items that leave a mapped slice (`remove`, `replace`, a smaller snapshot)
 *   are removed from the graph and from every list. Only ids present in the
 *   previous agent state at that pointer are removed; entities written by
 *   anything else are never touched.
 * - One snapshot or delta is one graph publication.
 * - The caller's event objects are copied, never stored, so they are never
 *   frozen by the store and can still be mutated (A2UI data models do this).
 * - An `eventId` makes re-delivery idempotent: an id already applied to the
 *   document is skipped, and the record survives persistence and hydration.
 */

import { graphStore, type GraphStore } from "../graph";
import { batchGraphWrites, type GraphBatch } from "../graph-batch";
import { applyJsonPatch, type JsonPatchOp } from "./json-patch";

/** Entity type of the stored agent state documents (one per `stateId`). */
export const AGUI_STATE_ENTITY_TYPE = "AgUiState";
const DEFAULT_STATE_ID = "default";
/** Applied event ids remembered per document for idempotent re-delivery. */
const MAX_APPLIED_EVENT_IDS = 256;

/** AG-UI STATE_SNAPSHOT event (minimal shape — no @ag-ui dependency). */
export interface AgUiStateSnapshotEvent {
  type?: "STATE_SNAPSHOT" | string;
  snapshot: Record<string, unknown>;
}

/** AG-UI STATE_DELTA event (minimal shape — RFC-6902 patch). */
export interface AgUiStateDeltaEvent {
  type?: "STATE_DELTA" | string;
  delta: JsonPatchOp[];
}

/** Maps one slice of agent state onto an entity type. */
export interface AgUiStateMapping {
  /** Entity type the mapped object(s) belong to. */
  entityType: string;
  /**
   * JSON-Pointer prefix into the agent state where this entity (or collection)
   * lives. `"/order"` → a single entity; `"/orders"` → a collection keyed by id;
   * `""` → the whole state as one entity.
   */
  pointer: string;
  /** Whether `pointer` addresses one object or a collection (array/record). */
  kind: "single" | "collection";
  /**
   * Field on each object that holds its entity id. For `single` you may instead
   * pass a constant id via `constantId`.
   */
  idField?: string;
  /** Constant id for `single` mappings whose object has no id field. */
  constantId?: string;
  /**
   * How to write: `upsert` (merge via MergeStrategy — default) or `replace`
   * (full overwrite). Snapshots typically replace; deltas typically upsert.
   */
  write?: "upsert" | "replace";
  /** List key holding a collection's order (default `agUiListKey(mapping)`). */
  listKey?: string;
}

export interface ApplyAgUiOptions {
  mappings: AgUiStateMapping[];
  /** Graph to write into (default: the process graph). */
  store?: GraphStore;
  /** Which stored agent state document to apply to (default `"default"`). */
  stateId?: string;
  /** Identity of this event (SSE id, sequence number). Re-applying an id already applied is a no-op. */
  eventId?: string;
}

/** Outcome of applying one AG-UI state event. */
export interface AgUiApplyResult {
  /** False when the event was skipped because its `eventId` was already applied. */
  applied: boolean;
  /** The agent state after the event (read-only: it is the stored, frozen document). */
  state: Record<string, unknown> | null;
}

interface AgUiStateRecord {
  id: string;
  state: Record<string, unknown>;
  appliedEventIds: string[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parsePointer(pointer: string): string[] {
  if (pointer === "" || pointer === "/") return [];
  return pointer.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function getAtPointer(state: unknown, pointer: string): unknown {
  let cur: unknown = state;
  for (const s of parsePointer(pointer)) {
    if (Array.isArray(cur)) cur = cur[Number(s)];
    else if (isObject(cur)) cur = cur[s];
    else return undefined;
  }
  return cur;
}

/** Default list key holding the order of a collection mapping. */
export function agUiListKey(mapping: AgUiStateMapping, stateId: string = DEFAULT_STATE_ID): string {
  return mapping.listKey ?? `agui:${stateId}:${mapping.entityType}:${mapping.pointer}`;
}

/** Ordered `[id, object]` pairs a mapping addresses in one agent state. */
function mappedItems(state: unknown, mapping: AgUiStateMapping): Array<[string, Record<string, unknown>]> {
  const slice = getAtPointer(state, mapping.pointer);
  if (slice === undefined) return [];
  if (mapping.kind === "single") {
    if (!isObject(slice)) return [];
    const id = mapping.constantId ?? String(slice[mapping.idField ?? "id"] ?? "");
    return id ? [[id, slice]] : [];
  }
  // collection: array of objects, or record keyed by id
  const items: Array<[string, Record<string, unknown>]> = [];
  if (Array.isArray(slice)) {
    for (const item of slice) {
      if (isObject(item)) {
        const id = String(item[mapping.idField ?? "id"] ?? "");
        if (id) items.push([id, item]);
      }
    }
  } else if (isObject(slice)) {
    for (const [key, item] of Object.entries(slice)) {
      if (isObject(item)) items.push([String(item[mapping.idField ?? "id"] ?? key), item]);
    }
  }
  return items;
}

/**
 * Write `next`'s mapped slices, remove items that left them since `prev`, and
 * record collection order. An id is removed only when no mapping of its entity
 * type still holds it in `next` (an item moving between two slices survives).
 */
function projectState(
  batch: GraphBatch,
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  mappings: AgUiStateMapping[],
  stateId: string,
): void {
  const itemsByMapping = mappings.map((mapping) => mappedItems(next, mapping));
  if (prev) {
    const held = new Map<string, Set<string>>();
    mappings.forEach((mapping, i) => {
      let ids = held.get(mapping.entityType);
      if (!ids) held.set(mapping.entityType, (ids = new Set()));
      for (const [id] of itemsByMapping[i]) ids.add(id);
    });
    const removed = new Set<string>();
    for (const mapping of mappings) {
      for (const [id] of mappedItems(prev, mapping)) {
        const key = `${mapping.entityType}:${id}`;
        if (held.get(mapping.entityType)?.has(id) || removed.has(key)) continue;
        removed.add(key);
        batch.removeEntity(mapping.entityType, id);
        batch.removeIdFromAllLists(mapping.entityType, id);
      }
    }
  }
  mappings.forEach((mapping, i) => {
    const items = itemsByMapping[i];
    const nextIds = new Set(items.map(([id]) => id));
    for (const [id, obj] of items) {
      if ((mapping.write ?? "upsert") === "replace") batch.replaceEntity(mapping.entityType, id, obj);
      else batch.upsertEntity(mapping.entityType, id, obj);
    }
    if (mapping.kind === "collection") {
      batch.setListIds(agUiListKey(mapping, stateId), [...nextIds], mapping.entityType);
    }
  });
}

function readRecord(store: GraphStore, stateId: string): AgUiStateRecord | undefined {
  const record = store.getState().entities[AGUI_STATE_ENTITY_TYPE]?.[stateId];
  return record as unknown as AgUiStateRecord | undefined;
}

/** The stored agent state document, or `null` before the first snapshot/delta. Read-only. */
export function readAgUiState(stateId: string = DEFAULT_STATE_ID, store: GraphStore = graphStore): Record<string, unknown> | null {
  return readRecord(store, stateId)?.state ?? null;
}

function applyState(
  options: ApplyAgUiOptions,
  nextOf: (record: AgUiStateRecord | undefined) => { prev: Record<string, unknown> | undefined; next: unknown },
): AgUiApplyResult {
  const store = options.store ?? graphStore;
  const stateId = options.stateId ?? DEFAULT_STATE_ID;
  const record = readRecord(store, stateId);
  if (options.eventId !== undefined && record?.appliedEventIds.includes(options.eventId)) {
    return { applied: false, state: record.state };
  }
  const { prev, next } = nextOf(record);
  if (!isObject(next)) return { applied: false, state: record?.state ?? null };

  const appliedEventIds = options.eventId === undefined
    ? record?.appliedEventIds ?? []
    : [...(record?.appliedEventIds ?? []), options.eventId].slice(-MAX_APPLIED_EVENT_IDS);
  batchGraphWrites((batch) => {
    projectState(batch, prev, next, options.mappings, stateId);
    batch.replaceEntity(AGUI_STATE_ENTITY_TYPE, stateId, { id: stateId, state: next, appliedEventIds });
  }, store);
  return { applied: true, state: readAgUiState(stateId, store) };
}

/**
 * Apply an AG-UI STATE_SNAPSHOT to the graph: store the whole document, write
 * each mapped slice as entities, record collection order, and remove items the
 * previous document had at a mapped pointer but this one does not. Writes use
 * each mapping's `write` mode (default `upsert`).
 *
 * @example
 * ```ts
 * applyAgUiSnapshot(event, { mappings: [
 *   { entityType: "Order", pointer: "/order", kind: "single", write: "replace" },
 *   { entityType: "LineItem", pointer: "/order/items", kind: "collection" },
 * ]});
 * ```
 */
export function applyAgUiSnapshot(
  event: AgUiStateSnapshotEvent,
  options: ApplyAgUiOptions,
): AgUiApplyResult {
  if (!isObject(event.snapshot)) return { applied: false, state: null };
  return applyState(options, (record) => ({ prev: record?.state, next: structuredClone(event.snapshot) }));
}

/**
 * Apply an AG-UI STATE_DELTA (RFC-6902 JSON Patch) to the graph.
 *
 * The delta applies to, in order of preference: `currentState` when given, the
 * stored agent state document, or (for graphs written before 4.4.0) a state
 * view reconstructed from the mapped entities. The result is stored and
 * re-projected exactly as a snapshot is, so removals and order are applied.
 * A reconstructed base never causes removals: it may contain entities the
 * agent never wrote.
 */
export function applyAgUiDelta(
  event: AgUiStateDeltaEvent,
  options: ApplyAgUiOptions,
  /** Current agent-state view; if omitted, the stored document (or a reconstruction) is used. */
  currentState?: Record<string, unknown>,
): AgUiApplyResult {
  const store = options.store ?? graphStore;
  const stateId = options.stateId ?? DEFAULT_STATE_ID;
  return applyState(options, (record) => {
    const base = currentState !== undefined ? structuredClone(currentState) : record?.state;
    if (base) return { prev: base, next: applyJsonPatch(base, event.delta) };
    const reconstructed = reconstructState(options.mappings, store, stateId);
    return { prev: undefined, next: applyJsonPatch(reconstructed, event.delta) };
  });
}

/** Copy-on-write set: never mutates `target` or the (frozen) graph objects it holds. */
function setAtPointer(target: Record<string, unknown>, pointer: string, value: unknown): Record<string, unknown> {
  const segs = parsePointer(pointer);
  if (segs.length === 0) return isObject(value) ? { ...value } : target;
  const root = { ...target };
  let cur = root;
  for (const seg of segs.slice(0, -1)) {
    const child: Record<string, unknown> = isObject(cur[seg]) ? { ...(cur[seg] as Record<string, unknown>) } : {};
    cur[seg] = child;
    cur = child;
  }
  cur[segs[segs.length - 1]] = value;
  return root;
}

/** Rebuild an agent-state view from mapped graph entities (graphs with no stored document). */
function reconstructState(mappings: AgUiStateMapping[], store: GraphStore, stateId: string): Record<string, unknown> {
  const s = store.getState();
  let state: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const bucket = s.entities[mapping.entityType] ?? {};
    if (mapping.kind === "single") {
      const id = mapping.constantId;
      if (id && bucket[id]) state = setAtPointer(state, mapping.pointer, bucket[id]);
    } else {
      const order = s.lists[agUiListKey(mapping, stateId)]?.ids;
      const items = order ? order.map((id) => bucket[id]).filter(Boolean) : Object.values(bucket);
      state = setAtPointer(state, mapping.pointer, items);
    }
  }
  return state;
}
