import { useEffect, useMemo, useRef } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";

export interface RenderedGraphViewDefinition {
  viewId: string;
  label: string;
  kind: "entity" | "list";
  entityType: string;
  queryKey?: string | null;
}

export interface RenderedGraphViewSnapshot {
  token: symbol;
  definition: RenderedGraphViewDefinition;
  entityIds: readonly string[];
}

export type RenderedGraphViewEvent =
  | { state: "present"; snapshot: RenderedGraphViewSnapshot }
  | { state: "removed"; token: symbol };

interface StoreRenderedViewRegistry {
  registrations: Map<symbol, RenderedGraphViewSnapshot>;
  listeners: Set<(event: RenderedGraphViewEvent) => void>;
}

const renderedViews = new WeakMap<GraphStore, StoreRenderedViewRegistry>();

function registryFor(store: GraphStore): StoreRenderedViewRegistry {
  const existing = renderedViews.get(store);
  if (existing) return existing;
  const registry: StoreRenderedViewRegistry = {
    registrations: new Map(),
    listeners: new Set(),
  };
  renderedViews.set(store, registry);
  return registry;
}

function publish(registry: StoreRenderedViewRegistry, event: RenderedGraphViewEvent): void {
  for (const listener of registry.listeners) listener(event);
}

function registerRenderedGraphView(
  store: GraphStore,
  definition: RenderedGraphViewDefinition,
): { updateMembership(entityIds: readonly string[]): void; unregister(): void } {
  const registry = registryFor(store);
  const token = Symbol(definition.viewId);
  let active = true;
  let snapshot: RenderedGraphViewSnapshot = { token, definition, entityIds: [] };
  registry.registrations.set(token, snapshot);
  publish(registry, { state: "present", snapshot });

  return {
    updateMembership(entityIds) {
      if (!active) return;
      snapshot = { ...snapshot, entityIds: [...new Set(entityIds)] };
      registry.registrations.set(token, snapshot);
      publish(registry, { state: "present", snapshot });
    },
    unregister() {
      if (!active) return;
      active = false;
      registry.registrations.delete(token);
      publish(registry, { state: "removed", token });
    },
  };
}

export function observeRenderedGraphViews(
  store: GraphStore,
  listener: (event: RenderedGraphViewEvent) => void,
): () => void {
  const registry = registryFor(store);
  registry.listeners.add(listener);
  for (const snapshot of registry.registrations.values()) {
    listener({ state: "present", snapshot });
  }
  return () => registry.listeners.delete(listener);
}

export function useRenderedGraphViewRegistration(
  store: GraphStore,
  definition: RenderedGraphViewDefinition,
  entityIds: readonly string[],
  enabled = true,
): void {
  const stableDefinition = useMemo<RenderedGraphViewDefinition>(() => ({
    viewId: definition.viewId,
    label: definition.label,
    kind: definition.kind,
    entityType: definition.entityType,
    queryKey: definition.queryKey ?? null,
  }), [
    definition.entityType,
    definition.kind,
    definition.label,
    definition.queryKey,
    definition.viewId,
  ]);
  const registration = useRef<ReturnType<typeof registerRenderedGraphView> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const next = registerRenderedGraphView(store, stableDefinition);
    registration.current = next;
    return () => {
      if (registration.current === next) registration.current = null;
      next.unregister();
    };
  }, [enabled, stableDefinition, store]);

  useEffect(() => {
    registration.current?.updateMembership(entityIds);
  }, [entityIds]);
}
