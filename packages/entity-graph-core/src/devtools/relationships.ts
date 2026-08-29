import { getRegisteredSchemas, type RelationDescriptor } from "../crud/relations";
import { serializeKey } from "../engine";
import type { GraphState } from "../graph";
import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  type GraphDevtoolsRelationship,
  type GraphDevtoolsRelationshipsSnapshot,
} from "./protocol";

function mergedEntity(
  state: GraphState,
  type: string,
  id: string,
): Record<string, unknown> | null {
  const canonical = state.entities[type]?.[id];
  if (!canonical) return null;
  return { ...canonical, ...(state.patches[type]?.[id] ?? {}) };
}

function statusFor(state: GraphState, type: string, id: string): GraphDevtoolsRelationship["status"] {
  return state.entities[type]?.[id] ? "resolved" : "missing-target";
}

function edge(
  relation: string,
  descriptor: RelationDescriptor,
  direction: GraphDevtoolsRelationship["direction"],
  sourceType: string,
  sourceId: string,
  sourceField: string | null,
  targetType: string,
  targetId: string,
  state: GraphState,
): GraphDevtoolsRelationship {
  return {
    relation,
    cardinality: descriptor.cardinality,
    direction,
    source: { type: sourceType, id: sourceId, field: sourceField },
    target: { type: targetType, id: targetId },
    status: statusFor(state, targetType, targetId),
  };
}

function belongsToEdges(
  state: GraphState,
  schemaType: string,
  relation: string,
  descriptor: Extract<RelationDescriptor, { cardinality: "belongsTo" }>,
): GraphDevtoolsRelationship[] {
  const edges: GraphDevtoolsRelationship[] = [];
  for (const id of Object.keys(state.entities[schemaType] ?? {})) {
    const entity = mergedEntity(state, schemaType, id);
    const targetId = entity?.[descriptor.foreignKey];
    if (typeof targetId !== "string" || targetId.length === 0) continue;
    edges.push(edge(
      relation,
      descriptor,
      "outgoing",
      schemaType,
      id,
      descriptor.foreignKey,
      descriptor.targetType,
      targetId,
      state,
    ));
  }
  return edges;
}

function hasManyEdges(
  state: GraphState,
  schemaType: string,
  relation: string,
  descriptor: Extract<RelationDescriptor, { cardinality: "hasMany" }>,
): GraphDevtoolsRelationship[] {
  const edges: GraphDevtoolsRelationship[] = [];
  for (const parentId of Object.keys(state.entities[schemaType] ?? {})) {
    const childIds = new Set<string>();
    for (const childId of Object.keys(state.entities[descriptor.targetType] ?? {})) {
      const child = mergedEntity(state, descriptor.targetType, childId);
      if (child?.[descriptor.foreignKey] === parentId) childIds.add(childId);
    }
    const listKey = serializeKey(descriptor.listKeyPrefix(parentId) as unknown[]);
    for (const childId of state.lists[listKey]?.ids ?? []) {
      if (!state.entities[descriptor.targetType]?.[childId]) childIds.add(childId);
    }
    for (const childId of childIds) {
      edges.push(edge(
        relation,
        descriptor,
        "reverse",
        schemaType,
        parentId,
        null,
        descriptor.targetType,
        childId,
        state,
      ));
    }
  }
  return edges;
}

function manyToManyEdges(
  state: GraphState,
  schemaType: string,
  relation: string,
  descriptor: Extract<RelationDescriptor, { cardinality: "manyToMany" }>,
): GraphDevtoolsRelationship[] {
  const field = descriptor.localArrayField;
  if (!field) return [];
  const edges: GraphDevtoolsRelationship[] = [];
  for (const id of Object.keys(state.entities[schemaType] ?? {})) {
    const entity = mergedEntity(state, schemaType, id);
    const targetIds = entity?.[field];
    if (!Array.isArray(targetIds)) continue;
    for (const targetId of new Set(targetIds)) {
      if (typeof targetId !== "string" || targetId.length === 0) continue;
      edges.push(edge(
        relation,
        descriptor,
        "outgoing",
        schemaType,
        id,
        field,
        descriptor.targetType,
        targetId,
        state,
      ));
    }
  }
  return edges;
}

function compareRelationships(
  left: GraphDevtoolsRelationship,
  right: GraphDevtoolsRelationship,
): number {
  const leftKey = [
    left.source.type,
    left.source.id,
    left.relation,
    left.direction,
    left.target.type,
    left.target.id,
  ].join("\u0000");
  const rightKey = [
    right.source.type,
    right.source.id,
    right.relation,
    right.direction,
    right.target.type,
    right.target.id,
  ].join("\u0000");
  if (leftKey === rightKey) return 0;
  return leftKey < rightKey ? -1 : 1;
}

/** Project relationships exclusively from the existing CRUD schema registry and graph state. */
export function projectGraphDevtoolsRelationships(
  state: GraphState,
  storeId: string,
): GraphDevtoolsRelationshipsSnapshot {
  const relationships: GraphDevtoolsRelationship[] = [];
  for (const schema of getRegisteredSchemas()) {
    for (const [name, descriptor] of Object.entries(schema.relations ?? {})) {
      switch (descriptor.cardinality) {
        case "belongsTo":
          relationships.push(...belongsToEdges(state, schema.type, name, descriptor));
          break;
        case "hasMany":
          relationships.push(...hasManyEdges(state, schema.type, name, descriptor));
          break;
        case "manyToMany":
          relationships.push(...manyToManyEdges(state, schema.type, name, descriptor));
          break;
      }
    }
  }
  relationships.sort(compareRelationships);
  return {
    protocol: GRAPH_DEVTOOLS_PROTOCOL,
    version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
    storeId,
    capturedAt: new Date().toISOString(),
    relationships,
  };
}
