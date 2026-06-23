/**
 * commands.ts
 *
 * Typed wrappers around every Tauri command exposed by the Rust plugin
 * (`rust-plugin/src/commands.rs`). Each function corresponds 1-to-1 with a
 * `#[tauri::command]` / `#[specta::specta]` annotated handler on the Rust
 * side; tauri-specta v2 generates the raw call signatures into
 * `src/generated-bindings.ts` — these wrappers add graph-store side-effects
 * so the TS layer stays consistent with the core entity graph.
 *
 * Layering rule: commands write to the core graph store via `useGraphStore`
 * after a successful Tauri IPC round-trip. The Rust plugin writes to its own
 * in-memory state for commands that the Rust side needs to reflect; the two
 * sides are kept in sync through the event channel (`events.ts`).
 */

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import type {
  UpsertEntityPayload,
  RemoveEntityPayload,
  PatchEntityPayload,
  SetListPayload,
  PersistSnapshotPayload,
  RestoreSnapshotPayload,
  TauriInvokeFn,
} from "./types";

// ── Command name constants (match Rust side exactly) ─────────────────────────

const CMD_UPSERT_ENTITY = "plugin:entity_graph|graph_upsert_entity";
const CMD_REMOVE_ENTITY = "plugin:entity_graph|graph_remove_entity";
const CMD_PATCH_ENTITY = "plugin:entity_graph|graph_patch_entity";
const CMD_SET_LIST = "plugin:entity_graph|graph_set_list";
const CMD_GET_ENTITY = "plugin:entity_graph|graph_get_entity";
const CMD_GET_LIST = "plugin:entity_graph|graph_get_list";
const CMD_PERSIST_SNAPSHOT = "plugin:entity_graph|graph_persist_snapshot";
const CMD_RESTORE_SNAPSHOT = "plugin:entity_graph|graph_restore_snapshot";
const CMD_CLEAR_GRAPH = "plugin:entity_graph|graph_clear";

// ── Command implementations ───────────────────────────────────────────────────

/**
 * Upsert an entity in the Rust plugin state and immediately reflect the
 * change in the TS graph store so cross-view reactivity fires instantly.
 */
export async function upsertEntity(
  invoke: TauriInvokeFn,
  payload: UpsertEntityPayload,
): Promise<void> {
  await invoke(CMD_UPSERT_ENTITY, { payload });
  useGraphStore.getState().upsertEntity(payload.entityType, payload.entityId, payload.data);
}

/**
 * Remove an entity from the Rust plugin and the TS graph store.
 */
export async function removeEntity(
  invoke: TauriInvokeFn,
  payload: RemoveEntityPayload,
): Promise<void> {
  await invoke(CMD_REMOVE_ENTITY, { payload });
  useGraphStore.getState().removeEntity(payload.entityType, payload.entityId);
}

/**
 * Apply a UI-only patch overlay to an entity. The patch is NOT stored
 * canonically in the Rust side (patches are a TS-only concept); the command
 * still goes through for auditing/devtools purposes.
 */
export async function patchEntity(
  invoke: TauriInvokeFn,
  payload: PatchEntityPayload,
): Promise<void> {
  await invoke(CMD_PATCH_ENTITY, { payload });
  useGraphStore.getState().patchEntity(payload.entityType, payload.entityId, payload.patch);
}

/**
 * Set the ordered ID array for a list query key.
 */
export async function setList(
  invoke: TauriInvokeFn,
  payload: SetListPayload,
): Promise<void> {
  await invoke(CMD_SET_LIST, { payload });
  useGraphStore.getState().setListResult(payload.queryKey, payload.ids, {
    total: payload.total ?? null,
    nextCursor: payload.nextCursor ?? null,
    hasNextPage: payload.hasNextPage ?? false,
  });
}

/**
 * Read a single entity back from the Rust plugin state.
 * Used for hydration or debugging; prefer the reactive graph store for UI reads.
 */
export async function getEntity(
  invoke: TauriInvokeFn,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  const result = await invoke<{ data: Record<string, unknown> | null }>(CMD_GET_ENTITY, {
    entityType,
    entityId,
  });
  return result?.data ?? null;
}

/**
 * Read list state from the Rust plugin.
 */
export async function getList(
  invoke: TauriInvokeFn,
  queryKey: string,
): Promise<{ ids: string[]; total: number | null } | null> {
  const result = await invoke<{ ids: string[]; total: number | null }>(CMD_GET_LIST, {
    queryKey,
  });
  return result ?? null;
}

/**
 * Persist the current graph snapshot to the configured SQLite database.
 * The actual serialisation happens in Rust; the TS side sends the storage key.
 */
export async function persistSnapshot(
  invoke: TauriInvokeFn,
  payload: PersistSnapshotPayload = {},
): Promise<void> {
  const graphState = useGraphStore.getState();
  const snapshot = {
    entities: graphState.entities,
    patches: graphState.patches,
    lists: graphState.lists,
    entityStates: graphState.entityStates,
    syncMetadata: graphState.syncMetadata,
  };
  await invoke(CMD_PERSIST_SNAPSHOT, {
    payload: {
      storageKey: payload.storageKey,
      snapshot: JSON.stringify(snapshot),
    },
  });
}

/**
 * Restore a previously persisted snapshot from the Rust plugin into the TS graph store.
 */
export async function restoreSnapshot(
  invoke: TauriInvokeFn,
  payload: RestoreSnapshotPayload = {},
): Promise<void> {
  const result = await invoke<{ snapshot: string | null } | null>(CMD_RESTORE_SNAPSHOT, { payload });
  if (!result?.snapshot) return;

  const parsed = JSON.parse(result.snapshot) as {
    entities?: Record<string, Record<string, Record<string, unknown>>>;
    patches?: Record<string, Record<string, Record<string, unknown>>>;
    lists?: Record<string, { ids: string[]; total: number | null }>;
  };

  const store = useGraphStore.getState();

  if (parsed.entities) {
    for (const [type, byId] of Object.entries(parsed.entities)) {
      for (const [id, data] of Object.entries(byId)) {
        store.upsertEntity(type, id, data);
      }
    }
  }

  if (parsed.patches) {
    for (const [type, byId] of Object.entries(parsed.patches)) {
      for (const [id, patch] of Object.entries(byId)) {
        store.patchEntity(type, id, patch);
      }
    }
  }

  if (parsed.lists) {
    for (const [queryKey, listState] of Object.entries(parsed.lists)) {
      store.setListResult(queryKey, listState.ids, { total: listState.total ?? null });
    }
  }
}

/**
 * Clear all entities, patches, and lists from both the Rust plugin and the TS
 * graph store. Use with care — typically only during logout or test teardown.
 */
export async function clearGraph(invoke: TauriInvokeFn): Promise<void> {
  await invoke(CMD_CLEAR_GRAPH);
  // Reset the Zustand store state to empty maps.
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
}
