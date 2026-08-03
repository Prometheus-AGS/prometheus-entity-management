import { A2uiClientActionSchema } from "@a2ui/web_core/v0_9";
import type { A2uiClientAction } from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import type { z } from "zod";

export type A2uiActionDeniedCode =
  | "invalid-action"
  | "unknown-action"
  | "invalid-context"
  | "unauthorized"
  | "approval-required"
  | "approval-denied"
  | "execution-failed";

export type A2uiAuthorizationDecision =
  | boolean
  | { allowed: boolean; reason?: string };

export interface A2uiApprovalRequest {
  action: A2uiClientAction;
  context: Record<string, unknown>;
  rule: A2uiActionRule;
}

export interface A2uiActionRule<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Exact official action name. Wildcards are intentionally unsupported. */
  name: string;
  /** Application-owned context schema evaluated after official action validation. */
  contextSchema: z.ZodType<TContext>;
  /** Destructive rules require an approval callback before execution. */
  destructive?: boolean;
  /** Tenant/scope/resource authorization. Absence means deny. */
  authorize?: (
    action: A2uiClientAction,
    context: TContext,
  ) => A2uiAuthorizationDecision | Promise<A2uiAuthorizationDecision>;
  /** Store, adapter, or transport operation. */
  execute: (action: A2uiClientAction, context: TContext) => unknown | Promise<unknown>;
}

export type A2uiActionDecision =
  | {
      status: "executed";
      action: A2uiClientAction;
      result: unknown;
    }
  | {
      status: "denied";
      action: A2uiClientAction | null;
      code: A2uiActionDeniedCode;
      reason: string;
      cause?: unknown;
    };

export interface A2uiActionPolicy {
  handle(action: unknown): Promise<A2uiActionDecision>;
}

export interface A2uiActionPolicyOptions {
  rules: readonly A2uiActionRule[];
  requestApproval?: (request: A2uiApprovalRequest) => boolean | Promise<boolean>;
  onDecision?: (decision: A2uiActionDecision) => void | Promise<void>;
}

function authorizationAllowed(decision: A2uiAuthorizationDecision): boolean {
  return typeof decision === "boolean" ? decision : decision.allowed;
}

function authorizationReason(decision: A2uiAuthorizationDecision): string | undefined {
  return typeof decision === "boolean" ? undefined : decision.reason;
}

/** Build a default-deny policy for official A2UI client actions. */
export function createA2uiActionPolicy(options: A2uiActionPolicyOptions): A2uiActionPolicy {
  const rules = new Map<string, A2uiActionRule>();
  for (const rule of options.rules) {
    if (rules.has(rule.name)) {
      throw new Error(`Duplicate A2UI action rule: ${rule.name}`);
    }
    rules.set(rule.name, rule);
  }

  const finish = async (decision: A2uiActionDecision): Promise<A2uiActionDecision> => {
    await options.onDecision?.(decision);
    return decision;
  };

  return {
    async handle(input: unknown): Promise<A2uiActionDecision> {
      const parsedAction = A2uiClientActionSchema.safeParse(input);
      if (!parsedAction.success) {
        return finish({
          status: "denied",
          action: null,
          code: "invalid-action",
          reason: "The action does not match the official A2UI v0.9.1 action schema.",
          cause: parsedAction.error,
        });
      }

      const action = parsedAction.data;
      const rule = rules.get(action.name);
      if (!rule) {
        return finish({
          status: "denied",
          action,
          code: "unknown-action",
          reason: `A2UI action is not allowlisted: ${action.name}`,
        });
      }

      const parsedContext = rule.contextSchema.safeParse(action.context);
      if (!parsedContext.success) {
        return finish({
          status: "denied",
          action,
          code: "invalid-context",
          reason: `A2UI action context is invalid for ${action.name}.`,
          cause: parsedContext.error,
        });
      }

      // Rules without explicit authorization are denied even when their name
      // and schema match. Protocol validity never grants application authority.
      if (!rule.authorize) {
        return finish({
          status: "denied",
          action,
          code: "unauthorized",
          reason: `A2UI action has no application authorization rule: ${action.name}`,
        });
      }

      const authorization = await rule.authorize(action, parsedContext.data);
      if (!authorizationAllowed(authorization)) {
        return finish({
          status: "denied",
          action,
          code: "unauthorized",
          reason:
            authorizationReason(authorization) ??
            `A2UI action was denied by application policy: ${action.name}`,
        });
      }

      if (rule.destructive) {
        if (!options.requestApproval) {
          return finish({
            status: "denied",
            action,
            code: "approval-required",
            reason: `A2UI action requires explicit approval: ${action.name}`,
          });
        }

        const approved = await options.requestApproval({
          action,
          context: parsedContext.data,
          rule,
        });
        if (!approved) {
          return finish({
            status: "denied",
            action,
            code: "approval-denied",
            reason: `A2UI action approval was denied: ${action.name}`,
          });
        }
      }

      try {
        return finish({
          status: "executed",
          action,
          result: await rule.execute(action, parsedContext.data),
        });
      } catch (cause) {
        return finish({
          status: "denied",
          action,
          code: "execution-failed",
          reason: `A2UI action execution failed: ${action.name}`,
          cause,
        });
      }
    },
  };
}

/** Policy used when an application has not installed any action authority. */
export function createDenyAllA2uiActionPolicy(
  onDecision?: A2uiActionPolicyOptions["onDecision"],
): A2uiActionPolicy {
  return createA2uiActionPolicy({ rules: [], onDecision });
}
