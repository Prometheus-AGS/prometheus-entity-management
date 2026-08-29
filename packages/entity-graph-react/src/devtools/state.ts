export interface EntityGraphInspectorState {
  version: 1;
  workspace: "overview" | "entities" | "views" | "activity";
  storeId: string | null;
  entityType: string | null;
  entityId: string | null;
  viewId: string | null;
  eventSequence: number | null;
  search: string;
  entityFilter: "all" | "dirty" | "errors";
  activityFilter: "all" | "mutation" | "view" | "time-travel" | "diagnostic" | "lifecycle";
  valueTab: "original" | "patch" | "live" | "diff";
}

export interface EntityGraphInspectorStateAdapter {
  read(): Partial<EntityGraphInspectorState> | null;
  write(state: EntityGraphInspectorState): void;
  subscribe?(listener: () => void): () => void;
}

const workspaces = ["overview", "entities", "views", "activity"] as const;
const entityFilters = ["all", "dirty", "errors"] as const;
const activityFilters = ["all", "mutation", "view", "time-travel", "diagnostic", "lifecycle"] as const;
const valueTabs = ["original", "patch", "live", "diff"] as const;

function nullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === "string" ? value : undefined;
}

function enumValue<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && values.includes(value as T) ? value as T : undefined;
}

/** Validate a partial inspector display-state value without accepting unknown versions. */
export function normalizeEntityGraphInspectorState(
  value: unknown,
): Partial<EntityGraphInspectorState> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== undefined && candidate.version !== 1) return null;
  const eventSequence = candidate.eventSequence === null || (
    typeof candidate.eventSequence === "number" && Number.isSafeInteger(candidate.eventSequence)
  ) ? candidate.eventSequence as number | null : undefined;
  return {
    version: 1,
    ...(enumValue(workspaces, candidate.workspace) ? { workspace: enumValue(workspaces, candidate.workspace) } : {}),
    ...(nullableString(candidate.storeId) !== undefined ? { storeId: nullableString(candidate.storeId) } : {}),
    ...(nullableString(candidate.entityType) !== undefined ? { entityType: nullableString(candidate.entityType) } : {}),
    ...(nullableString(candidate.entityId) !== undefined ? { entityId: nullableString(candidate.entityId) } : {}),
    ...(nullableString(candidate.viewId) !== undefined ? { viewId: nullableString(candidate.viewId) } : {}),
    ...(eventSequence !== undefined ? { eventSequence } : {}),
    ...(typeof candidate.search === "string" ? { search: candidate.search } : {}),
    ...(enumValue(entityFilters, candidate.entityFilter)
      ? { entityFilter: enumValue(entityFilters, candidate.entityFilter) }
      : {}),
    ...(enumValue(activityFilters, candidate.activityFilter)
      ? { activityFilter: enumValue(activityFilters, candidate.activityFilter) }
      : {}),
    ...(enumValue(valueTabs, candidate.valueTab) ? { valueTab: enumValue(valueTabs, candidate.valueTab) } : {}),
  };
}

/** Serialize versioned inspector display state for a host-owned adapter or URL. */
export function serializeEntityGraphInspectorState(state: EntityGraphInspectorState): string {
  return JSON.stringify(state);
}

/** Parse and normalize serialized inspector display state. */
export function parseEntityGraphInspectorState(serialized: string): Partial<EntityGraphInspectorState> | null {
  try {
    return normalizeEntityGraphInspectorState(JSON.parse(serialized));
  } catch {
    return null;
  }
}

/** Create a URL query-parameter adapter for deep-linkable inspector display state. */
export function createEntityGraphInspectorUrlStateAdapter(
  parameter = "pemDevtools",
): EntityGraphInspectorStateAdapter {
  return {
    read() {
      if (typeof window === "undefined") return null;
      const value = new URL(window.location.href).searchParams.get(parameter);
      return value === null ? null : parseEntityGraphInspectorState(value);
    },
    write(state) {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const serialized = serializeEntityGraphInspectorState(state);
      if (url.searchParams.get(parameter) === serialized) return;
      url.searchParams.set(parameter, serialized);
      window.history.replaceState(window.history.state, "", url);
    },
    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
  };
}
