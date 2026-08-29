import { EMPTY_LIST_STATE, type GraphState } from "../graph";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  type GraphDevtoolsViewDefinition,
  type GraphDevtoolsViewEvent,
  type GraphDevtoolsViewMembership,
  type GraphDevtoolsViewRecord,
  type GraphDevtoolsViewsSnapshot,
} from "./protocol";
import {
  graphDevtoolsEntityIdentitiesForStateKey,
  graphDevtoolsEntityIdentityKey,
  parseGraphDevtoolsEntityIdentityKey,
} from "./inspection";

export interface GraphDevtoolsViewRegistration {
  readonly viewId: string;
  updateMembership(entityIds: readonly string[]): void;
  unregister(): void;
}

export interface GraphDevtoolsViewRegistry {
  register(definition: GraphDevtoolsViewDefinition): GraphDevtoolsViewRegistration;
  getSnapshot(): GraphDevtoolsViewsSnapshot;
  getViewIdsByEntity(): ReadonlyMap<string, readonly string[]>;
  dispose(): void;
}

interface ViewRegistrationState {
  entityIds: string[];
  renderCount: number;
  lastRenderedAt: string | null;
}

interface ViewEntry {
  definition: GraphDevtoolsViewDefinition;
  registeredAt: string;
  registrations: Map<symbol, ViewRegistrationState>;
}

function orderedUnique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function membershipFor(entry: ViewEntry): GraphDevtoolsViewMembership[] {
  const entityIds = new Set<string>();
  for (const registration of entry.registrations.values()) {
    for (const id of registration.entityIds) entityIds.add(id);
  }
  return [...entityIds].map((id) => ({ type: entry.definition.entityType, id }));
}

function viewRecord(entry: ViewEntry, state: GraphState): GraphDevtoolsViewRecord {
  const membership = membershipFor(entry);
  const registrations = [...entry.registrations.values()];
  const lastRenderedAt = registrations
    .map((registration) => registration.lastRenderedAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null;
  const queryKey = entry.definition.queryKey ?? null;
  const listState = queryKey === null ? EMPTY_LIST_STATE : (state.lists[queryKey] ?? EMPTY_LIST_STATE);

  return {
    ...entry.definition,
    queryKey,
    registeredAt: entry.registeredAt,
    lastRenderedAt,
    renderCount: registrations.reduce((total, registration) => total + registration.renderCount, 0),
    subscriberCount: registrations.length,
    membership,
    list: entry.definition.kind === "list"
      ? {
          visibleCount: membership.length,
          graphCount: listState.ids.length,
          total: listState.total,
          isFetching: listState.isFetching,
          isFetchingMore: listState.isFetchingMore,
          stale: listState.stale,
          hasNextPage: listState.hasNextPage,
          hasPreviousPage: listState.hasPrevPage,
        }
      : null,
  };
}

function allEntityIdentities(
  state: GraphState,
  memberships: ReadonlyMap<string, readonly string[]>,
): Array<{ type: string; id: string }> {
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
  for (const key of [
    ...Object.keys(state.entityStates),
    ...Object.keys(state.syncMetadata),
  ]) {
    for (const identity of graphDevtoolsEntityIdentitiesForStateKey(state, key)) {
      identities.set(graphDevtoolsEntityIdentityKey(identity.type, identity.id), identity);
    }
  }
  for (const key of memberships.keys()) {
    const identity = parseGraphDevtoolsEntityIdentityKey(key);
    if (identity) identities.set(key, identity);
  }
  return [...identities.values()].sort((left, right) => {
    if (left.type !== right.type) return left.type < right.type ? -1 : 1;
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  });
}

export function createGraphDevtoolsViewRegistry(
  storeId: string,
  getState: () => GraphState,
  onViewChange: (change: GraphDevtoolsViewEvent["payload"]) => void,
): GraphDevtoolsViewRegistry {
  const entries = new Map<string, ViewEntry>();
  let disposed = false;

  const viewIdsByEntity = (): Map<string, string[]> => {
    const result = new Map<string, string[]>();
    for (const [viewId, entry] of entries) {
      for (const membership of membershipFor(entry)) {
        const key = graphDevtoolsEntityIdentityKey(membership.type, membership.id);
        const viewIds = result.get(key) ?? [];
        viewIds.push(viewId);
        result.set(key, viewIds);
      }
    }
    for (const viewIds of result.values()) viewIds.sort();
    return result;
  };

  return {
    register(definition) {
      if (disposed) return { viewId: definition.viewId, updateMembership() {}, unregister() {} };
      const token = Symbol(definition.viewId);
      let entry = entries.get(definition.viewId);
      const isNew = entry === undefined;
      if (!entry) {
        entry = {
          definition: { ...definition, queryKey: definition.queryKey ?? null },
          registeredAt: new Date().toISOString(),
          registrations: new Map(),
        };
        entries.set(definition.viewId, entry);
      }
      entry.registrations.set(token, { entityIds: [], renderCount: 0, lastRenderedAt: null });
      if (isNew) onViewChange({ state: "registered", viewId: definition.viewId, membershipCount: 0 });

      let unregistered = false;
      return {
        viewId: definition.viewId,
        updateMembership(entityIds) {
          if (disposed || unregistered) return;
          const currentEntry = entries.get(definition.viewId);
          const registration = currentEntry?.registrations.get(token);
          if (!currentEntry || !registration) return;
          const before = membershipFor(currentEntry);
          registration.entityIds = orderedUnique(entityIds);
          registration.renderCount += 1;
          registration.lastRenderedAt = new Date().toISOString();
          const after = membershipFor(currentEntry);
          const beforeKeys = before.map(({ type, id }) => graphDevtoolsEntityIdentityKey(type, id));
          const afterKeys = after.map(({ type, id }) => graphDevtoolsEntityIdentityKey(type, id));
          if (!sameValues(beforeKeys, afterKeys)) {
            onViewChange({
              state: "membership-changed",
              viewId: definition.viewId,
              membershipCount: after.length,
            });
          }
        },
        unregister() {
          if (disposed || unregistered) return;
          unregistered = true;
          const currentEntry = entries.get(definition.viewId);
          if (!currentEntry) return;
          const before = membershipFor(currentEntry);
          currentEntry.registrations.delete(token);
          if (currentEntry.registrations.size === 0) {
            entries.delete(definition.viewId);
            onViewChange({ state: "unregistered", viewId: definition.viewId, membershipCount: 0 });
            return;
          }
          const after = membershipFor(currentEntry);
          const beforeKeys = before.map(({ type, id }) => graphDevtoolsEntityIdentityKey(type, id));
          const afterKeys = after.map(({ type, id }) => graphDevtoolsEntityIdentityKey(type, id));
          if (!sameValues(beforeKeys, afterKeys)) {
            onViewChange({
              state: "membership-changed",
              viewId: definition.viewId,
              membershipCount: after.length,
            });
          }
        },
      };
    },
    getSnapshot() {
      const state = getState();
      const memberships = viewIdsByEntity();
      return {
        protocol: GRAPH_DEVTOOLS_PROTOCOL,
        version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
        storeId,
        capturedAt: new Date().toISOString(),
        views: [...entries.values()]
          .map((entry) => viewRecord(entry, state))
          .sort((left, right) => left.viewId < right.viewId ? -1 : left.viewId > right.viewId ? 1 : 0),
        entityViewMembership: allEntityIdentities(state, memberships).map(({ type, id }) => ({
          type,
          id,
          viewIds: [...(memberships.get(graphDevtoolsEntityIdentityKey(type, id)) ?? [])],
        })),
      };
    },
    getViewIdsByEntity() {
      return viewIdsByEntity();
    },
    dispose() {
      disposed = true;
      entries.clear();
    },
  };
}
