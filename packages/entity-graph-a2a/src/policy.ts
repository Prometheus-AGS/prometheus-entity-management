import type {
  A2AApplicationPolicy,
  A2AAuthenticator,
  A2ACaller,
  A2AGraphPolicyContext,
  A2APolicyDecision,
  A2ARequestPolicyContext,
  CreateEntityGraphA2APolicyOptions,
} from "./types.js";

const ALLOW: A2APolicyDecision = Object.freeze({ allowed: true });
const DENY: A2APolicyDecision = Object.freeze({
  allowed: false,
  reason: "No application authority was configured for this operation.",
});

export const ANONYMOUS_A2A_CALLER: A2ACaller = Object.freeze({
  id: "anonymous",
  isAuthenticated: false,
  scopes: Object.freeze([]),
});

/** Protocol operations remain usable, while every graph read/write fails closed. */
export function createDefaultDenyA2APolicy(): A2AApplicationPolicy {
  return {
    authorizeRequest: () => ALLOW,
    authorizeGraphOperation: () => DENY,
  };
}

/** Deny both protocol dispatch and graph access. */
export function createDenyAllA2APolicy(): A2AApplicationPolicy {
  return {
    authorizeRequest: () => DENY,
    authorizeGraphOperation: () => DENY,
  };
}

/**
 * Build an explicit entity/action/field policy.
 * Replace and remove additionally require out-of-band approval.
 */
export function createEntityGraphA2APolicy(
  options: CreateEntityGraphA2APolicyOptions,
): A2AApplicationPolicy {
  const authorizeApplication = async (
    context: A2ARequestPolicyContext | A2AGraphPolicyContext,
  ): Promise<boolean> => (await options.authorize?.(context)) ?? true;

  return {
    async authorizeRequest(context) {
      return (await authorizeApplication(context))
        ? ALLOW
        : { allowed: false, reason: "Caller is outside the application policy." };
    },
    async authorizeGraphOperation(context) {
      if (!(await authorizeApplication(context))) {
        return { allowed: false, reason: "Caller is outside the application policy." };
      }

      if (context.operation === "snapshot") {
        const rule = options.entities[context.entityType ?? "*"];
        const allowed = rule?.actions.includes("snapshot") ?? false;
        return allowed
          ? ALLOW
          : { allowed: false, reason: "Snapshot access is not allowlisted." };
      }

      const rule = context.entityType
        ? options.entities[context.entityType]
        : undefined;
      if (!rule || !rule.actions.includes(context.operation)) {
        return { allowed: false, reason: "Entity action is not allowlisted." };
      }

      const allowedFields = new Set(rule.fields ?? []);
      if (context.fields.some((field) => !allowedFields.has(field))) {
        return { allowed: false, reason: "One or more entity fields are not allowlisted." };
      }
      return ALLOW;
    },
    requestApproval: options.requestApproval,
  };
}

export interface CreateBearerTokenAuthenticatorOptions {
  verify(token: string):
    | Promise<Omit<A2ACaller, "isAuthenticated"> | null>
    | Omit<A2ACaller, "isAuthenticated">
    | null;
}

/** Parse a Bearer credential and delegate verification without logging the token. */
export function createBearerTokenAuthenticator(
  options: CreateBearerTokenAuthenticatorOptions,
): A2AAuthenticator {
  return {
    async authenticate({ request }) {
      const authorization = request.headers.get("authorization");
      if (!authorization) return null;
      const match = /^Bearer[ \t]+([^\s]+)$/i.exec(authorization);
      if (!match) return null;
      const caller = await options.verify(match[1]);
      return caller ? { ...caller, isAuthenticated: true } : null;
    },
  };
}
