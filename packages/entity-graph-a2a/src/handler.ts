/**
 * handler.ts — Default A2A task handler for the entity graph.
 *
 * Routes incoming A2A task messages to entity graph operations:
 *
 *   GraphMutationPart  → createGraphTransaction (upsert / replace / remove / patch / clearPatch)
 *   GraphQueryPart     → useGraphStore.getState() read (entity or list)
 *   text Part          → echo reply (pass-through for conversational messages)
 *   data Part          → treated as a batch of mutations if it contains a "mutations" array
 *
 * Returns:
 *   - TaskStatus "completed" on success
 *   - TaskStatus "failed" on error
 *   - Artifact of type "graph-snapshot" containing affected entity ids
 *   - Artifact of type "data" for query results
 *
 * Architecture: this handler ONLY talks to the entity graph via the core store.
 * It never imports hooks or UI code — it is pure server-side logic.
 */

import {
  useGraphStore,
  createGraphTransaction,
} from "@prometheus-ags/entity-graph-core";
import type { GraphState } from "@prometheus-ags/entity-graph-core";
import type {
  A2ATaskHandler,
  Artifact,
  DataPart,
  GraphMutation,
  GraphMutationPart,
  GraphQueryPart,
  Message,
  Part,
  TaskHandlerContext,
  TaskHandlerResult,
} from "./types.js";

// ── Mutation applicator ───────────────────────────────────────────────────────

/**
 * Apply a single graph mutation via a GraphTransaction.
 * Returns true on success, throws on unknown op.
 */
function applyMutation(
  tx: ReturnType<typeof createGraphTransaction>,
  mut: GraphMutation,
): void {
  switch (mut.op) {
    case "upsert":
      tx.upsertEntity(mut.entityType, mut.id, mut.data);
      break;
    case "replace":
      tx.replaceEntity(mut.entityType, mut.id, mut.data);
      break;
    case "remove":
      tx.removeEntity(mut.entityType, mut.id);
      break;
    case "patch":
      tx.patchEntity(mut.entityType, mut.id, mut.patch);
      break;
    case "clearPatch":
      tx.clearPatch(mut.entityType, mut.id);
      break;
    default: {
      // Exhaustiveness guard — unknown op is a terminal error.
      const never: never = mut;
      throw new Error(`Unknown graph mutation op: ${(never as { op: string }).op}`);
    }
  }
}

// ── Query resolver ────────────────────────────────────────────────────────────

interface QueryResult {
  entities: Record<string, unknown>[];
  total: number;
}

function resolveGraphQuery(part: GraphQueryPart, state: GraphState): QueryResult {
  const entityBucket = state.entities[part.entityType] ?? {};

  // Single-entity lookup.
  if (part.id !== undefined) {
    const entity = entityBucket[part.id];
    if (entity === undefined) {
      return { entities: [], total: 0 };
    }
    const patches = state.patches[part.entityType]?.[part.id] ?? {};
    return {
      entities: [{ ...entity, ...patches }],
      total: 1,
    };
  }

  // List lookup via listKey.
  if (part.listKey !== undefined) {
    const listState = state.lists[part.listKey];
    if (listState === undefined) {
      return { entities: [], total: 0 };
    }
    const ids = part.limit !== undefined ? listState.ids.slice(0, part.limit) : listState.ids;
    const rows = ids
      .map((id) => {
        const entity = entityBucket[id];
        if (entity === undefined) return null;
        const patches = state.patches[part.entityType]?.[id] ?? {};
        return { ...entity, ...patches };
      })
      .filter((row): row is Record<string, unknown> => row !== null);
    return { entities: rows, total: listState.total ?? rows.length };
  }

  // No id or listKey — return all entities of this type.
  const allEntities = Object.entries(entityBucket).map(([id, entity]) => {
    const patches = state.patches[part.entityType]?.[id] ?? {};
    return { ...entity, ...patches };
  });
  const sliced =
    part.limit !== undefined ? allEntities.slice(0, part.limit) : allEntities;
  return { entities: sliced, total: allEntities.length };
}

// ── Artifact builders ─────────────────────────────────────────────────────────

function makeMutationArtifact(
  appliedCount: number,
  affectedIds: string[],
): Artifact {
  return {
    id: `mutation-result-${Date.now()}`,
    type: "graph-snapshot",
    name: "Graph Mutation Result",
    description: `Applied ${appliedCount} mutation(s) to the entity graph.`,
    content: { applied: appliedCount, affectedIds },
    mimeType: "application/json",
    createdAt: new Date().toISOString(),
  };
}

function makeQueryArtifact(result: QueryResult): Artifact {
  return {
    id: `query-result-${Date.now()}`,
    type: "data",
    name: "Graph Query Result",
    description: `Returned ${result.entities.length} of ${result.total} entity(ies).`,
    content: result,
    mimeType: "application/json",
    createdAt: new Date().toISOString(),
  };
}

function makeGraphSnapshotArtifact(
  state: GraphState,
  types?: string[],
): Artifact {
  const scopedEntities: Record<string, Record<string, unknown>> = {};
  const typesToExport = types ?? Object.keys(state.entities);
  for (const t of typesToExport) {
    if (state.entities[t] !== undefined) {
      scopedEntities[t] = state.entities[t] as Record<string, unknown>;
    }
  }
  return {
    id: `snapshot-${Date.now()}`,
    type: "graph-snapshot",
    name: "Entity Graph Snapshot",
    content: { entities: scopedEntities, exportedAt: new Date().toISOString() },
    mimeType: "application/json",
    createdAt: new Date().toISOString(),
  };
}

// ── Part processors ───────────────────────────────────────────────────────────

interface PartProcessResult {
  artifacts: Artifact[];
  replyText?: string;
}

function processMutationPart(part: GraphMutationPart): PartProcessResult {
  const tx = createGraphTransaction();
  const affectedIds: string[] = [];

  try {
    for (const mut of part.mutations) {
      applyMutation(tx, mut);
      if ("id" in mut) {
        affectedIds.push(`${mut.entityType}:${mut.id}`);
      }
    }
    tx.commit();
    return {
      artifacts: [makeMutationArtifact(part.mutations.length, affectedIds)],
    };
  } catch (err) {
    tx.rollback();
    throw err;
  }
}

function processQueryPart(part: GraphQueryPart): PartProcessResult {
  const state = useGraphStore.getState();
  const result = resolveGraphQuery(part, state);
  return { artifacts: [makeQueryArtifact(result)] };
}

function processDataPart(part: DataPart): PartProcessResult {
  // Treat data parts with a "mutations" array as a batch mutation.
  const maybeMutations = part.data["mutations"];
  if (Array.isArray(maybeMutations) && maybeMutations.length > 0) {
    const syntheticPart: GraphMutationPart = {
      type: "graph/mutation",
      mutations: maybeMutations as GraphMutation[],
    };
    return processMutationPart(syntheticPart);
  }
  // Otherwise treat as a snapshot export request.
  const types = Array.isArray(part.data["types"])
    ? (part.data["types"] as string[])
    : undefined;
  const state = useGraphStore.getState();
  return { artifacts: [makeGraphSnapshotArtifact(state, types)] };
}

function processPart(part: Part): PartProcessResult {
  switch (part.type) {
    case "graph/mutation":
      return processMutationPart(part);
    case "graph/query":
      return processQueryPart(part);
    case "data":
      return processDataPart(part);
    case "text":
      return {
        artifacts: [],
        replyText: `Acknowledged: ${part.text}`,
      };
    case "file":
      // File parts are not processed by the default handler.
      return { artifacts: [], replyText: "File parts are not supported by the default handler." };
    default: {
      const never: never = part;
      throw new Error(`Unrecognized part type: ${(never as { type: string }).type}`);
    }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * DefaultEntityGraphHandler — routes A2A task messages to graph operations.
 *
 * @example
 * ```ts
 * import { createA2AServer } from "@prometheus-ags/entity-graph-a2a";
 * import { DefaultEntityGraphHandler } from "@prometheus-ags/entity-graph-a2a";
 *
 * const server = createA2AServer({
 *   card: buildAgentCard({ url: "https://my-agent.example.com/a2a" }),
 *   handler: new DefaultEntityGraphHandler(),
 * });
 * ```
 */
export class DefaultEntityGraphHandler implements A2ATaskHandler {
  async handle(ctx: TaskHandlerContext): Promise<TaskHandlerResult> {
    const allArtifacts: Artifact[] = [];
    const replyLines: string[] = [];

    for (const part of ctx.message.parts) {
      const result = processPart(part);
      allArtifacts.push(...result.artifacts);
      if (result.replyText !== undefined) {
        replyLines.push(result.replyText);
      }
    }

    const reply: Message | undefined =
      replyLines.length > 0
        ? {
            role: "agent",
            parts: [{ type: "text", text: replyLines.join("\n") }],
          }
        : undefined;

    return {
      status: { state: "completed" },
      artifacts: allArtifacts,
      reply,
    };
  }
}
