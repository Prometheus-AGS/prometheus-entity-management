/**
 * graph-server.ts
 *
 * A lightweight server-side entity graph instance backed by the vanilla
 * `useGraphStore` from entity-graph-core. This is the authoritative store
 * for the SSE server — it holds all entity data and notifies the SSE layer
 * whenever entities change.
 *
 * Layering rule: this module is Layer 1 (graph + engine). It never touches
 * HTTP or SSE — that concern belongs to sse-server.ts.
 */

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import type { GraphState, EntityType, EntityId } from "@prometheus-ags/entity-graph-core";
import type { EntityChangedEvent } from "./types.js";

type ChangeListener = (event: EntityChangedEvent) => void;

/**
 * Thin wrapper around the core `useGraphStore` that adds a change-listener
 * bus. The SSE server subscribes once and fans out to connected clients.
 *
 * There is intentionally no class hierarchy here — the graph is still owned
 * by the vanilla Zustand store from the core package. This module only adds
 * the notification bus.
 */
export function createServerGraph() {
  const listeners = new Set<ChangeListener>();

  function onEntityChanged(listener: ChangeListener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function notifyListeners(event: EntityChangedEvent): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Prevent one bad listener from breaking the rest.
      }
    }
  }

  /** Upsert an entity into the graph and notify listeners. */
  function upsertEntity(
    type: EntityType,
    id: EntityId,
    data: Record<string, unknown>
  ): void {
    useGraphStore.getState().upsertEntity(type, id, data);
    const resolved = readEntity(type, id);
    notifyListeners({ op: "upsert", type, id, entity: resolved ?? data });
  }

  /** Replace (full-write) an entity and notify listeners. */
  function replaceEntity(
    type: EntityType,
    id: EntityId,
    data: Record<string, unknown>
  ): void {
    useGraphStore.getState().replaceEntity(type, id, data);
    notifyListeners({ op: "upsert", type, id, entity: data });
  }

  /** Remove an entity from the graph and notify listeners. */
  function removeEntity(type: EntityType, id: EntityId): void {
    useGraphStore.getState().removeEntity(type, id);
    notifyListeners({ op: "delete", type, id });
  }

  /**
   * Read an entity from the graph with patches merged in.
   * Returns `undefined` if the entity does not exist.
   */
  function readEntity(
    type: EntityType,
    id: EntityId
  ): Record<string, unknown> | undefined {
    const state = useGraphStore.getState() as GraphState;
    const canonical = state.entities[type]?.[id];
    if (!canonical) return undefined;
    const patch = state.patches[type]?.[id] ?? {};
    return { ...canonical, ...patch };
  }

  /**
   * Read all entities of a type. Returns an array of merged snapshots
   * (canonical + patch). IDs are injected under the `id` key when not
   * already present.
   */
  function readEntities(type: EntityType): Array<Record<string, unknown>> {
    const state = useGraphStore.getState() as GraphState;
    const typeMap = state.entities[type] ?? {};
    return Object.entries(typeMap).map(([id, data]) => {
      const patch = state.patches[type]?.[id] ?? {};
      return { id, ...data, ...patch };
    });
  }

  /** Direct access to the raw store for advanced use-cases (adapters, devtools). */
  function getStore() {
    return useGraphStore;
  }

  return {
    upsertEntity,
    replaceEntity,
    removeEntity,
    readEntity,
    readEntities,
    getStore,
    onEntityChanged,
  };
}

export type ServerGraph = ReturnType<typeof createServerGraph>;
