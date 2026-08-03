import { z } from "zod";
import {
  graphStore as defaultGraphStore,
  type GraphStore,
} from "@prometheus-ags/entity-graph-core";
import {
  createA2uiActionPolicy,
  type A2uiActionDecision,
  type A2uiActionPolicy,
  type A2uiApprovalRequest,
  type A2uiAuthorizationDecision,
  type A2uiActionRule,
} from "./action-policy.js";

export const ENTITY_GRAPH_A2UI_ACTIONS = {
  upsert: "prometheus.entity.upsert",
  replace: "prometheus.entity.replace",
  remove: "prometheus.entity.remove",
  patch: "prometheus.entity.patch",
  unpatch: "prometheus.entity.unpatch",
  clearPatch: "prometheus.entity.clear-patch",
} as const;

export type EntityGraphA2uiActionName =
  (typeof ENTITY_GRAPH_A2UI_ACTIONS)[keyof typeof ENTITY_GRAPH_A2UI_ACTIONS];

export interface EntityGraphA2uiEntityPolicy {
  /** Exact graph actions allowed for this entity type. */
  actions: readonly EntityGraphA2uiActionName[];
  /** Exact fields the agent may write or unpatch. */
  fields: readonly string[];
}

export interface EntityGraphA2uiAuthorizationContext {
  actionName: EntityGraphA2uiActionName;
  entityType: string;
  entityId: string;
  tenantId?: string;
  fields: readonly string[];
  rawContext: Record<string, unknown>;
}

export interface CreateEntityGraphA2uiActionPolicyOptions {
  /** Inject a store for isolation/testing; defaults to the canonical graph. */
  graphStore?: GraphStore;
  /** Entity/action/field allowlist. Missing entity types fail closed. */
  entities: Readonly<Record<string, EntityGraphA2uiEntityPolicy>>;
  /** Application-owned tenant/scope authorization. Required and fail-closed. */
  authorize: (
    context: EntityGraphA2uiAuthorizationContext,
  ) => A2uiAuthorizationDecision | Promise<A2uiAuthorizationDecision>;
  /** Required at runtime for destructive `replace` and `remove` actions. */
  requestApproval?: (request: A2uiApprovalRequest) => boolean | Promise<boolean>;
  onDecision?: (decision: A2uiActionDecision) => void | Promise<void>;
}

const identitySchema = {
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
};

const dataContextSchema = z
  .object({
    ...identitySchema,
    data: z.record(z.unknown()),
  })
  .strict();

const identityContextSchema = z.object(identitySchema).strict();

const keysContextSchema = z
  .object({
    ...identitySchema,
    keys: z.array(z.string().min(1)).min(1),
  })
  .strict();

function uniqueFields(fields: readonly string[]): readonly string[] {
  return [...new Set(fields)].sort();
}

/**
 * Build the stable surface-action to normalized-entity bridge.
 *
 * The helper owns store writes; renderer components only emit official A2UI
 * actions through their hooks/runtime.
 */
export function createEntityGraphA2uiActionPolicy(
  options: CreateEntityGraphA2uiActionPolicyOptions,
): A2uiActionPolicy {
  const store = options.graphStore ?? defaultGraphStore;

  const authorize = async (
    actionName: EntityGraphA2uiActionName,
    context: Record<string, unknown>,
    fields: readonly string[],
  ): Promise<A2uiAuthorizationDecision> => {
    const entityType = String(context.entityType);
    const entityId = String(context.entityId);
    const entityPolicy = options.entities[entityType];

    if (!entityPolicy) {
      return { allowed: false, reason: `Entity type is not allowlisted: ${entityType}` };
    }
    if (!entityPolicy.actions.includes(actionName)) {
      return { allowed: false, reason: `Action is not allowed for ${entityType}: ${actionName}` };
    }

    const allowedFields = new Set(entityPolicy.fields);
    const deniedField = fields.find((field) => !allowedFields.has(field));
    if (deniedField) {
      return {
        allowed: false,
        reason: `Field is not allowlisted for ${entityType}: ${deniedField}`,
      };
    }

    return options.authorize({
      actionName,
      entityType,
      entityId,
      tenantId: typeof context.tenantId === "string" ? context.tenantId : undefined,
      fields: uniqueFields(fields),
      rawContext: context,
    });
  };

  const dataRule = (
    name: EntityGraphA2uiActionName,
    destructive: boolean,
    execute: (state: ReturnType<GraphStore["getState"]>, type: string, id: string, data: Record<string, unknown>) => void,
  ): A2uiActionRule => ({
    name,
    contextSchema: dataContextSchema,
    destructive,
    authorize: (_action, context) => {
      const data = context.data as Record<string, unknown>;
      return authorize(name, context, Object.keys(data));
    },
    execute: (_action, context) => {
      execute(
        store.getState(),
        String(context.entityType),
        String(context.entityId),
        context.data as Record<string, unknown>,
      );
    },
  });

  const identityRule = (
    name: EntityGraphA2uiActionName,
    destructive: boolean,
    execute: (state: ReturnType<GraphStore["getState"]>, type: string, id: string) => void,
  ): A2uiActionRule => ({
    name,
    contextSchema: identityContextSchema,
    destructive,
    authorize: (_action, context) => authorize(name, context, []),
    execute: (_action, context) => {
      execute(store.getState(), String(context.entityType), String(context.entityId));
    },
  });

  const rules: A2uiActionRule[] = [
    dataRule(ENTITY_GRAPH_A2UI_ACTIONS.upsert, false, (state, type, id, data) => {
      state.upsertEntity(type, id, data);
    }),
    dataRule(ENTITY_GRAPH_A2UI_ACTIONS.replace, true, (state, type, id, data) => {
      state.replaceEntity(type, id, data);
    }),
    dataRule(ENTITY_GRAPH_A2UI_ACTIONS.patch, false, (state, type, id, data) => {
      state.patchEntity(type, id, data);
    }),
    identityRule(ENTITY_GRAPH_A2UI_ACTIONS.remove, true, (state, type, id) => {
      state.removeEntity(type, id);
      state.removeIdFromAllLists(type, id);
    }),
    identityRule(ENTITY_GRAPH_A2UI_ACTIONS.clearPatch, false, (state, type, id) => {
      state.clearPatch(type, id);
    }),
    {
      name: ENTITY_GRAPH_A2UI_ACTIONS.unpatch,
      contextSchema: keysContextSchema,
      authorize: (_action, context) => {
        const keys = context.keys as string[];
        return authorize(
          ENTITY_GRAPH_A2UI_ACTIONS.unpatch,
          context,
          keys,
        );
      },
      execute: (_action, context) => {
        store.getState().unpatchEntity(
          String(context.entityType),
          String(context.entityId),
          context.keys as string[],
        );
      },
    },
  ];

  return createA2uiActionPolicy({
    rules,
    requestApproval: options.requestApproval,
    onDecision: options.onDecision,
  });
}
