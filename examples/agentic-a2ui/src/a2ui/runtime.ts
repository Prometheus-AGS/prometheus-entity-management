/**
 * A2UI runtime wiring: the official renderer plus the Prometheus
 * entity-graph action policy bound to the canonical graph store.
 *
 * Authority is application-owned and fail-closed: entity/action/field
 * allowlists, tenant matching against the selected session tenant, and an
 * explicit human approval dialog for destructive actions.
 */
import { create } from "zustand";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import {
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiRuntime,
  ENTITY_GRAPH_A2UI_ACTIONS,
  type A2uiApprovalRequest,
  type PrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import { DEMO_TENANT } from "../lib/demo-data";
import { auditLog } from "../lib/audit-store";

interface SessionState {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  tenantId: DEMO_TENANT,
  setTenantId: (tenantId) => set({ tenantId }),
}));

interface PendingApproval {
  request: A2uiApprovalRequest;
  resolve: (approved: boolean) => void;
}

interface ApprovalState {
  pending: PendingApproval | null;
  request: (request: A2uiApprovalRequest) => Promise<boolean>;
  respond: (approved: boolean) => void;
}

/** Human approval bridge: the policy awaits an explicit dialog decision. */
export const useApprovalStore = create<ApprovalState>((set, get) => ({
  pending: null,
  request: (request) =>
    new Promise<boolean>((resolve) => {
      set({ pending: { request, resolve } });
    }),
  respond: (approved) => {
    const pending = get().pending;
    if (!pending) return;
    set({ pending: null });
    pending.resolve(approved);
  },
}));

export function createShowcaseA2uiRuntime(): PrometheusA2uiRuntime {
  const actionPolicy = createEntityGraphA2uiActionPolicy({
    graphStore,
    entities: {
      Task: {
        // `remove` is intentionally absent: surface delete actions are denied.
        actions: [
          ENTITY_GRAPH_A2UI_ACTIONS.upsert,
          ENTITY_GRAPH_A2UI_ACTIONS.patch,
          ENTITY_GRAPH_A2UI_ACTIONS.replace,
        ],
        fields: ["id", "tenantId", "projectId", "title", "status", "version"],
      },
    },
    authorize: (context) => {
      const sessionTenant = useSessionStore.getState().tenantId;
      const allowed = context.tenantId === sessionTenant && sessionTenant === DEMO_TENANT;
      if (!allowed) {
        return {
          allowed: false,
          reason: `Tenant ${context.tenantId ?? "none"} does not match session tenant ${sessionTenant}.`,
        };
      }
      return { allowed: true };
    },
    requestApproval: (request) => useApprovalStore.getState().request(request),
    onDecision: (decision) => {
      auditLog.recordDecision({
        channel: "a2ui",
        action: decision.action?.name ?? "unknown",
        allowed: decision.status === "executed",
        reason:
          decision.status === "denied"
            ? `${decision.code}: ${decision.reason}`
            : "Executed by policy.",
        at: new Date().toISOString(),
      });
    },
  });

  return createPrometheusA2uiRuntime({ actionPolicy });
}
