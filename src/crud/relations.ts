import { useGraphStore } from "../graph";
import { serializeKey } from "../engine";
import type { EntityType, EntityId } from "../graph";

export type RelationCardinality = "belongsTo" | "hasMany" | "manyToMany";
/**
 * FK edge: this entity points at one parent row. Used to invalidate parent aggregates and optional list keys when the FK changes.
 */
export interface BelongsToRelation { cardinality: "belongsTo"; foreignKey: string; targetType: EntityType; invalidateTargetLists?: string[]; }
/**
 * Inverse collection: children carry `foreignKey` pointing here; `listKeyPrefix` builds the child list query key for a given parent id.
 */
export interface HasManyRelation { cardinality: "hasMany"; targetType: EntityType; foreignKey: string; listKeyPrefix: (parentId: EntityId) => unknown[]; }
/**
 * Join-style relation stored as an id array on this entity; invalidates partner lists derived via `listKeyPrefix` for each touched id.
 */
export interface ManyToManyRelation { cardinality: "manyToMany"; targetType: EntityType; localArrayField?: string; listKeyPrefix: (thisId: EntityId) => unknown[]; }
export type RelationDescriptor = BelongsToRelation | HasManyRelation | ManyToManyRelation;
/**
 * Declarative relation metadata for one `EntityType`: optional named relations and list key prefixes to invalidate on any mutation.
 */
export interface EntitySchema { type: EntityType; relations?: Record<string, RelationDescriptor>; globalListKeys?: string[]; }
/**
 * Snapshot diff passed to cascade rules after CRUD: compare `previous` vs `next` to find FK moves, array membership changes, etc.
 */
export interface CascadeContext { type: EntityType; id: EntityId; previous: Record<string, unknown> | null; next: Record<string, unknown> | null; op: "create" | "update" | "delete"; }

const schemaRegistry = new Map<EntityType, EntitySchema>();
/** Register or replace schema for `schema.type` (typically at app init). */
export function registerSchema(schema: EntitySchema) { schemaRegistry.set(schema.type, schema); }
/** Lookup schema for cascade/join reads; returns null if unregistered. */
export function getSchema(type: EntityType) { return schemaRegistry.get(type) ?? null; }

/**
 * After a successful mutation, mark related entities/lists stale so hooks refetch without manually hunting query keys.
 * Traverses registered schemas (including reverse `hasMany`) so denormalized UIs stay eventually consistent with the graph.
 */
export function cascadeInvalidation(ctx: CascadeContext) {
  const schema = schemaRegistry.get(ctx.type); if (!schema) return;
  const store = useGraphStore.getState();
  if (schema.globalListKeys) for (const key of schema.globalListKeys) store.invalidateLists(key);
  if (!schema.relations) return;
  for (const [, relation] of Object.entries(schema.relations)) {
    switch (relation.cardinality) {
      case "belongsTo": {
        const prevFk = ctx.previous?.[relation.foreignKey] as EntityId | null;
        const nextFk = ctx.next?.[relation.foreignKey] as EntityId | null;
        if (prevFk && prevFk !== nextFk && relation.invalidateTargetLists) for (const kp of relation.invalidateTargetLists) store.invalidateLists((k) => k.startsWith(kp) && k.includes(prevFk));
        if (nextFk && relation.invalidateTargetLists) for (const kp of relation.invalidateTargetLists) store.invalidateLists((k) => k.startsWith(kp) && k.includes(nextFk));
        if (prevFk) store.invalidateEntity(relation.targetType, prevFk);
        if (nextFk) store.invalidateEntity(relation.targetType, nextFk);
        break;
      }
      case "hasMany": store.invalidateLists(serializeKey(relation.listKeyPrefix(ctx.id) as unknown[])); break;
      case "manyToMany": {
        const prevIds = ctx.previous?.[relation.localArrayField ?? ""] as EntityId[] | null;
        const nextIds = ctx.next?.[relation.localArrayField ?? ""] as EntityId[] | null;
        for (const relatedId of new Set([...(prevIds ?? []), ...(nextIds ?? [])])) store.invalidateLists(serializeKey(relation.listKeyPrefix(relatedId) as unknown[]));
        break;
      }
    }
  }
  for (const [, otherSchema] of schemaRegistry) {
    if (!otherSchema.relations) continue;
    for (const [, rel] of Object.entries(otherSchema.relations)) {
      if (rel.targetType !== ctx.type) continue;
      if (rel.cardinality === "hasMany") store.invalidateLists(serializeKey(rel.listKeyPrefix(ctx.id) as unknown[]));
    }
  }
}

/**
 * Resolve relation **placeholders** for detail panels: joins graph reads for belongs-to targets, has-many id lists, or many-to-many id arrays.
 * Returns plain objects suitable for rendering; does not mutate the graph.
 */
export function readRelations(type: EntityType, entity: Record<string, unknown>): Record<string, unknown> {
  const schema = schemaRegistry.get(type); if (!schema?.relations) return {};
  const store = useGraphStore.getState(); const result: Record<string, unknown> = {};
  for (const [name, relation] of Object.entries(schema.relations)) {
    switch (relation.cardinality) {
      case "belongsTo": { const fkValue = entity[relation.foreignKey] as EntityId | null; result[name] = fkValue ? store.readEntity(relation.targetType, fkValue) : null; break; }
      case "hasMany": { const listKey = serializeKey(relation.listKeyPrefix(entity.id as EntityId) as unknown[]); const listState = store.lists[listKey]; result[name] = listState ? listState.ids.map((id) => store.readEntity(relation.targetType, id)).filter(Boolean) : []; break; }
      case "manyToMany": { const ids = entity[relation.localArrayField ?? ""] as EntityId[] | null; result[name] = ids ? ids.map((id) => store.readEntity(relation.targetType, id)).filter(Boolean) : []; break; }
    }
  }
  return result;
}
