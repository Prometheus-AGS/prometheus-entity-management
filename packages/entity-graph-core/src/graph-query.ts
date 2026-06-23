import { useGraphStore } from "./graph";
import type { EntityId, EntitySnapshot, EntityType, QueryKey } from "./graph";

type GraphStore = ReturnType<typeof useGraphStore.getState>;

export type GraphIncludeMap = Record<string, GraphIncludeRelation>;

export type GraphIncludeRelation =
  | {
      type: EntityType;
      via: { kind: "field"; field: string };
      include?: GraphIncludeMap;
    }
  | {
      type: EntityType;
      via: { kind: "array"; field: string };
      include?: GraphIncludeMap;
    }
  | {
      type: EntityType;
      via: { kind: "list"; key: QueryKey | ((entity: Record<string, unknown>) => QueryKey | null | undefined) };
      include?: GraphIncludeMap;
    }
  | {
      type: EntityType;
      via: {
        kind: "resolver";
        resolve: (entity: Record<string, unknown>, store: GraphStore) => EntityId | EntityId[] | null | undefined;
      };
      include?: GraphIncludeMap;
    };

export interface GraphQueryOptions<TEntity extends object> {
  type: EntityType;
  id?: EntityId;
  ids?: EntityId[];
  listKey?: QueryKey;
  where?: (entity: EntitySnapshot<TEntity>) => boolean;
  sort?: (a: EntitySnapshot<TEntity>, b: EntitySnapshot<TEntity>) => number;
  include?: GraphIncludeMap;
  select?: ((entity: Record<string, unknown>) => unknown) | string[];
}

type ProjectedRow = Record<string, unknown>;

export function queryOnce<TEntity extends object>(
  opts: GraphQueryOptions<TEntity> & { id: EntityId },
): ProjectedRow | null;
export function queryOnce<TEntity extends object>(
  opts: GraphQueryOptions<TEntity>,
): ProjectedRow[];
export function queryOnce<TEntity extends object>(
  opts: GraphQueryOptions<TEntity>,
): ProjectedRow[] | ProjectedRow | null {
  const store = useGraphStore.getState();
  const ids = resolveCandidateIds(store, opts);
  let rows = ids
    .map((id) => store.readEntitySnapshot<TEntity>(opts.type, id))
    .filter((row): row is EntitySnapshot<TEntity> => row !== null);

  if (opts.where) rows = rows.filter(opts.where);
  if (opts.sort) rows = [...rows].sort(opts.sort);

  const projected = rows.map((row) => applySelection(projectRow(row, opts.include, store), opts.select));
  if (opts.id) return projected[0] ?? null;
  return projected;
}

export const selectGraph = queryOnce;

function resolveCandidateIds<TEntity extends object>(store: GraphStore, opts: GraphQueryOptions<TEntity>): EntityId[] {
  if (opts.id) return [opts.id];
  if (opts.ids) return opts.ids;
  if (opts.listKey) return store.lists[opts.listKey]?.ids ?? [];
  return Object.keys(store.entities[opts.type] ?? {});
}

function projectRow(
  row: EntitySnapshot<Record<string, unknown>>,
  include: GraphIncludeMap | undefined,
  store: GraphStore,
): ProjectedRow {
  if (!include) return row;

  const projected: ProjectedRow = { ...row };
  for (const [key, relation] of Object.entries(include)) {
    const related = resolveRelation(row, relation, store);
    projected[key] = related;
  }
  return projected;
}

function resolveRelation(
  entity: Record<string, unknown>,
  relation: GraphIncludeRelation,
  store: GraphStore,
): ProjectedRow | ProjectedRow[] | null {
  const include = relation.include;

  switch (relation.via.kind) {
    case "field": {
      const relatedId = entity[relation.via.field];
      if (typeof relatedId !== "string") return null;
      const related = store.readEntitySnapshot<Record<string, unknown>>(relation.type, relatedId);
      return related ? projectRow(related, include, store) : null;
    }
    case "array": {
      const ids = entity[relation.via.field];
      if (!Array.isArray(ids)) return [];
      return ids
        .map((id) => (typeof id === "string" ? store.readEntitySnapshot<Record<string, unknown>>(relation.type, id) : null))
        .filter((row): row is EntitySnapshot<Record<string, unknown>> => row !== null)
        .map((row) => projectRow(row, include, store));
    }
    case "list": {
      const key =
        typeof relation.via.key === "function"
          ? relation.via.key(entity)
          : relation.via.key;
      if (!key) return [];
      const ids = store.lists[key]?.ids ?? [];
      return ids
        .map((id) => store.readEntitySnapshot<Record<string, unknown>>(relation.type, id))
        .filter((row): row is EntitySnapshot<Record<string, unknown>> => row !== null)
        .map((row) => projectRow(row, include, store));
    }
    case "resolver": {
      const resolved = relation.via.resolve(entity, store);
      if (Array.isArray(resolved)) {
        return resolved
          .map((id) => store.readEntitySnapshot<Record<string, unknown>>(relation.type, id))
          .filter((row): row is EntitySnapshot<Record<string, unknown>> => row !== null)
          .map((row) => projectRow(row, include, store));
      }
      if (typeof resolved !== "string") return null;
      const related = store.readEntitySnapshot<Record<string, unknown>>(relation.type, resolved);
      return related ? projectRow(related, include, store) : null;
    }
  }
}

function applySelection(
  row: ProjectedRow,
  select: GraphQueryOptions<Record<string, unknown>>["select"],
): ProjectedRow {
  if (!select) return row;
  if (typeof select === "function") {
    const result = select(row as EntitySnapshot<Record<string, unknown>> & Record<string, unknown>);
    return (result && typeof result === "object" ? result : { value: result }) as ProjectedRow;
  }

  const picked: ProjectedRow = {};
  for (const key of select) {
    if (key in row) picked[key] = row[key];
  }
  return picked;
}
