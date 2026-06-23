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
 */

import { useGraphStore } from "../graph";
import { applyJsonPatch, type JsonPatchOp } from "./json-patch";

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
   * lives. `"/order"` → a single entity; `"/orders"` → a collection keyed by id.
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
}

export interface ApplyAgUiOptions {
  mappings: AgUiStateMapping[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getAtPointer(state: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "/") return state;
  const segs = pointer.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur: unknown = state;
  for (const s of segs) {
    if (Array.isArray(cur)) cur = cur[Number(s)];
    else if (isObject(cur)) cur = cur[s];
    else return undefined;
  }
  return cur;
}

function writeEntity(
  mapping: AgUiStateMapping,
  id: string,
  obj: Record<string, unknown>,
): void {
  const store = useGraphStore.getState();
  if ((mapping.write ?? "upsert") === "replace") {
    store.replaceEntity(mapping.entityType, id, obj);
  } else {
    store.upsertEntity(mapping.entityType, id, obj);
  }
}

function projectState(state: Record<string, unknown>, mappings: AgUiStateMapping[]): void {
  for (const mapping of mappings) {
    const slice = getAtPointer(state, mapping.pointer);
    if (slice === undefined) continue;

    if (mapping.kind === "single") {
      if (!isObject(slice)) continue;
      const id = mapping.constantId ?? String(slice[mapping.idField ?? "id"] ?? "");
      if (!id) continue;
      writeEntity(mapping, id, slice);
    } else {
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
          if (isObject(item)) {
            const id = String(item[mapping.idField ?? "id"] ?? key);
            items.push([id, item]);
          }
        }
      }
      for (const [id, obj] of items) writeEntity(mapping, id, obj);
    }
  }
}

/**
 * Apply an AG-UI STATE_SNAPSHOT to the graph. Each mapped slice is written as an
 * entity. Snapshots default to `replace` semantics when the mapping does not
 * specify otherwise is left to the mapping's `write` field (default upsert).
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
): void {
  if (!isObject(event.snapshot)) return;
  projectState(event.snapshot, options.mappings);
}

/**
 * Apply an AG-UI STATE_DELTA (RFC-6902 JSON Patch) to the graph.
 *
 * The delta is applied against a reconstructed agent-state view assembled from
 * the current graph entities (per the mappings), then the resulting slices are
 * re-projected back into the graph. This lets path-based deltas target nested
 * entity fields without the caller tracking the full agent state themselves.
 */
export function applyAgUiDelta(
  event: AgUiStateDeltaEvent,
  options: ApplyAgUiOptions,
  /** Current agent-state view; if omitted, reconstructed from the graph mappings. */
  currentState?: Record<string, unknown>,
): void {
  const base = currentState ?? reconstructState(options.mappings);
  const next = applyJsonPatch(base, event.delta);
  if (isObject(next)) projectState(next, options.mappings);
}

/** Rebuild a minimal agent-state view from current graph entities (per mappings). */
function reconstructState(mappings: AgUiStateMapping[]): Record<string, unknown> {
  const store = useGraphStore.getState();
  const state: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const key = mapping.pointer.replace(/^\//, "").split("/")[0];
    if (!key) continue;
    const bucket = store.entities[mapping.entityType] ?? {};
    if (mapping.kind === "single") {
      const id = mapping.constantId;
      if (id && bucket[id]) state[key] = bucket[id];
    } else {
      state[key] = Object.values(bucket);
    }
  }
  return state;
}
