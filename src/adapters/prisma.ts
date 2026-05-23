import { toPrismaOrderBy, toPrismaWhere } from "../view/prisma-compile";
import type { FilterSpec, SortSpec, ViewDescriptor } from "../view/types";
import type {
  BelongsToRelation,
  EntitySchema,
  HasManyRelation,
  ManyToManyRelation,
  RelationDescriptor,
} from "../crud/relations";
import type { EntityQueryOptions, ListFetchParams, ListQueryOptions, ListResponse } from "../engine";
import type { CRUDOptions } from "../crud/use-entity-crud";
import type { ViewFetchParams } from "../view/use-entity-view";
import type { EntityId, EntityType } from "../graph";

export { toPrismaWhere, toPrismaOrderBy } from "../view/prisma-compile";

/**
 * Options for {@link createPrismaEntityConfig}: one REST-backed resource aligned with Prisma-style `where` / `orderBy` / `include` payloads.
 */
export interface PrismaEntityConfigOptions<TEntity extends object> {
  /** Graph entity type key (e.g. `"Task"`). */
  type: string;
  /** Base REST URL for the collection (list) and detail as `${endpoint}/:id`. */
  endpoint: string;
  /** Primary key field on normalized entities (default `"id"`). */
  idField?: string;
  /**
   * Declarative relations (Prisma-flavored names) used to build {@link EntitySchema} and {@link toPrismaInclude}.
   * `type` is the **related** model; `foreignKey` is the FK or scalar list field name as in your API.
   */
  relations?: Record<
    string,
    {
      type: string;
      foreignKey: string;
      relation: "belongsTo" | "hasMany" | "manyToMany";
    }
  >;
}

function trimSlash(s: string) {
  return s.replace(/\/+$/, "");
}

function joinEndpoint(base: string, ...segments: string[]) {
  let u = trimSlash(base);
  for (const seg of segments) {
    if (!seg) continue;
    u += `/${String(seg).replace(/^\/+/, "")}`;
  }
  return u;
}

function defaultNormalize<TEntity extends object>(
  raw: TEntity,
  idField: string
): { id: EntityId; data: TEntity } {
  const id = (raw as Record<string, unknown>)[idField];
  return { id: id != null ? String(id) : "", data: raw };
}

/**
 * Appends Prisma-shaped `where` / `orderBy` as JSON query params (`where`, `orderBy`) plus `page`, `pageSize`, `cursor`.
 */
function listSearchParams(
  where: Record<string, unknown>,
  orderBy: Record<string, string>[] | undefined,
  p: ListFetchParams
): string {
  const sp = new URLSearchParams();
  if (Object.keys(where).length > 0) sp.set("where", JSON.stringify(where));
  if (orderBy && orderBy.length > 0) sp.set("orderBy", JSON.stringify(orderBy));
  if (p.page != null) sp.set("page", String(p.page));
  if (p.pageSize != null) sp.set("pageSize", String(p.pageSize));
  if (p.cursor) sp.set("cursor", p.cursor);
  if (p.params && typeof p.params === "object") {
    for (const [k, v] of Object.entries(p.params)) {
      if (v === undefined || v === null) continue;
      sp.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function readListResponse<T>(res: Response): Promise<ListResponse<T>> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = (await res.json()) as Record<string, unknown>;
  const items = (Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : []) as T[];
  return {
    items,
    total: typeof json.total === "number" ? json.total : undefined,
    nextCursor: typeof json.nextCursor === "string" ? json.nextCursor : undefined,
    prevCursor: typeof json.prevCursor === "string" ? json.prevCursor : undefined,
    hasNextPage: typeof json.hasNextPage === "boolean" ? json.hasNextPage : undefined,
    hasPrevPage: typeof json.hasPrevPage === "boolean" ? json.hasPrevPage : undefined,
    page: typeof json.page === "number" ? json.page : undefined,
    pageSize: typeof json.pageSize === "number" ? json.pageSize : undefined,
  };
}

/**
 * Converts registered {@link RelationDescriptor} entries into a Prisma `include` map (`true` for each relation name).
 */
export function toPrismaInclude(
  relations: Record<string, RelationDescriptor>
): Record<string, boolean | Record<string, unknown>> {
  const include: Record<string, boolean | Record<string, unknown>> = {};
  for (const name of Object.keys(relations)) include[name] = true;
  return include;
}

/**
 * Maps Prisma-style relation declarations from {@link PrismaEntityConfigOptions} into a single {@link EntitySchema}
 * for {@link registerSchema} / cascade invalidation. `hasMany` uses `listKeyPrefix: (id) => [targetType, { [foreignKey]: id }]`.
 * `manyToMany` uses `localArrayField: foreignKey` and a stable `listKeyPrefix` of `[targetType, relationName, id]`.
 */
export function prismaRelationsToSchema(
  type: string,
  relations: PrismaEntityConfigOptions<Record<string, unknown>>["relations"]
): EntitySchema {
  if (!relations || Object.keys(relations).length === 0) return { type: type as EntityType };

  const out: Record<string, RelationDescriptor> = {};
  for (const [name, rel] of Object.entries(relations)) {
    const targetType = rel.type as EntityType;
    switch (rel.relation) {
      case "belongsTo":
        out[name] = {
          cardinality: "belongsTo",
          foreignKey: rel.foreignKey,
          targetType,
        } satisfies BelongsToRelation;
        break;
      case "hasMany":
        out[name] = {
          cardinality: "hasMany",
          targetType,
          foreignKey: rel.foreignKey,
          listKeyPrefix: (parentId: EntityId) => [targetType, { [rel.foreignKey]: parentId }],
        } satisfies HasManyRelation;
        break;
      case "manyToMany":
        out[name] = {
          cardinality: "manyToMany",
          targetType,
          localArrayField: rel.foreignKey,
          listKeyPrefix: (thisId: EntityId) => [targetType, name, thisId],
        } satisfies ManyToManyRelation;
        break;
    }
  }
  return { type: type as EntityType, relations: out };
}

/**
 * Factory for REST-backed entity/list/CRUD options that serialize filters and sorts with {@link toPrismaWhere} / {@link toPrismaOrderBy}.
 *
 * - {@link PrismaEntityConfigOptions.endpoint `endpoint`} — GET list; GET `${endpoint}/:id` for detail.
 * - List/CRUD fetchers send `where` and `orderBy` as JSON query strings unless you override via {@link ListFetchParams.params}.
 */
export function createPrismaEntityConfig<TEntity extends object>(
  config: PrismaEntityConfigOptions<TEntity>
) {
  const { type, endpoint, idField = "id", relations } = config;
  const entityType = type as EntityType;

  const normalize = (raw: TEntity) => defaultNormalize(raw, idField);

  return {
    /**
     * Builds {@link EntityQueryOptions} for {@link useEntity} (GET `${endpoint}/:id`).
     */
    entity: (id: EntityId): EntityQueryOptions<TEntity, TEntity> => ({
      type: entityType,
      id,
      idField,
      fetch: async (entityId) => {
        const res = await fetch(joinEndpoint(endpoint, String(entityId)));
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<TEntity>;
      },
      normalize: (raw) => raw,
    }),

    /**
     * Builds {@link ListQueryOptions} for {@link useEntityList}. Encode `filter` / `sort` in the returned `queryKey` so
     * refetches track view changes; each fetch sends Prisma-shaped `where` / `orderBy` query params.
     */
    list: (params?: {
      page?: number;
      pageSize?: number;
      filter?: FilterSpec;
      sort?: SortSpec;
    }): ListQueryOptions<TEntity, TEntity> => {
      const filter = params?.filter;
      const sort = params?.sort;
      const queryKey: unknown[] = [entityType, endpoint, "list", filter ?? null, sort ?? null];
      return {
        type: entityType,
        queryKey,
        normalize,
        fetch: async (p: ListFetchParams) => {
          const where = filter ? toPrismaWhere(filter) : {};
          const orderBy = sort && sort.length > 0 ? toPrismaOrderBy(sort) : undefined;
          const qs = listSearchParams(where, orderBy, p);
          const res = await fetch(`${trimSlash(endpoint)}${qs}`);
          return readListResponse<TEntity>(res);
        },
      };
    },

    /**
     * Builds partial {@link CRUDOptions} for {@link useEntityCRUD}: wires list fetch (Prisma query params from `ViewDescriptor`)
     * and detail fetch. Supply `onCreate` / `onUpdate` / `onDelete` at the call site.
     */
    crud: (opts?: { initialView?: ViewDescriptor }): CRUDOptions<TEntity> => {
      const initialView = opts?.initialView ?? {};
      return {
        type: entityType,
        listQueryKey: [entityType, endpoint, "crud"],
        normalize,
        initialView,
        listFetch: async (p: ViewFetchParams) => {
          const where = p.view.filter ? toPrismaWhere(p.view.filter) : {};
          const orderBy = p.view.sort && p.view.sort.length > 0 ? toPrismaOrderBy(p.view.sort) : undefined;
          const qs = listSearchParams(where, orderBy, {});
          const res = await fetch(`${trimSlash(endpoint)}${qs}`);
          return readListResponse<TEntity>(res);
        },
        detailFetch: async (entityId) => {
          const res = await fetch(joinEndpoint(endpoint, String(entityId)));
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.json() as Promise<TEntity>;
        },
      };
    },

    /** Schemas to pass to {@link registerSchema} (one entry for this `type`). */
    schemas: (): EntitySchema[] => [prismaRelationsToSchema(type, relations)],
  };
}
