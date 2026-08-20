/**
 * Deterministic, keyless A2A v1 agent host for the showcase.
 *
 * The official Prometheus A2A server is Fetch/JSON-RPC native; the demo
 * drives it in-page (no HTTP hop, no model credential). All graph authority
 * flows through the application policy: entity/action/field allowlists,
 * tenant authorization, and fail-closed destructive approval.
 */
import {
  buildAgentCard,
  createA2AServer,
  createEntityGraphA2APolicy,
  type A2ACaller,
  type A2AServer,
} from "@prometheus-ags/entity-graph-a2a";
import { DEMO_TENANT } from "../lib/demo-data";
import { auditLog } from "../lib/audit-store";

export const AGENT_ENDPOINT = "https://agentic-a2ui.prometheus.local/a2a";
export const FIXED_CLOCK = "2026-08-20T00:00:00.000Z";

/** Demo callers. The tenant scope is the entire authorization boundary. */
export function demoCaller(tenantId: string): A2ACaller {
  return {
    id: `user-${tenantId}`,
    isAuthenticated: true,
    scopes: [`tenant:${tenantId}`],
  };
}

export interface AgentServerOptions {
  /** When false, destructive graph operations are refused (fail-closed demo default). */
  approveDestructive?: (context: { entityType?: string; operation: string }) => boolean;
  stepDelayMs?: number;
  clock?: () => string;
  idFactory?: () => string;
}

export function createShowcaseAgentServer(options: AgentServerOptions = {}): A2AServer {
  const policy = createEntityGraphA2APolicy({
    entities: {
      Task: {
        actions: ["upsert", "patch", "query", "snapshot"],
        fields: ["id", "tenantId", "projectId", "title", "status", "version"],
      },
      Project: {
        actions: ["query", "snapshot"],
        fields: ["id", "tenantId", "name", "status"],
      },
      "*": { actions: ["snapshot"], fields: [] },
    },
    authorize: (context) => {
      const callerTenant = context.caller.scopes
        .find((scope) => scope.startsWith("tenant:"))
        ?.slice("tenant:".length);
      const allowed = callerTenant === DEMO_TENANT;
      if (!allowed) {
        auditLog.recordDecision({
          channel: "a2a",
          action: "authorize",
          allowed: false,
          reason: `Caller tenant ${callerTenant ?? "none"} is outside ${DEMO_TENANT}.`,
          at: new Date().toISOString(),
        });
      }
      return allowed;
    },
    requestApproval: (context) => {
      const approved = options.approveDestructive?.({
        entityType: context.entityType,
        operation: context.operation,
      }) ?? false;
      auditLog.recordDecision({
        channel: "a2a",
        action: `${context.operation}:${context.entityType ?? "*"}`,
        allowed: approved,
        reason: approved
          ? "Destructive operation approved."
          : "Destructive operation requires out-of-band approval.",
        at: new Date().toISOString(),
      });
      return { allowed: approved };
    },
  });

  return createA2AServer({
    card: buildAgentCard({ url: AGENT_ENDPOINT }),
    policy,
    deterministicExecutor: {
      clock: options.clock ?? (() => FIXED_CLOCK),
      idFactory: options.idFactory ?? (() => globalThis.crypto.randomUUID()),
      stepDelayMs: options.stepDelayMs ?? 0,
    },
  });
}
