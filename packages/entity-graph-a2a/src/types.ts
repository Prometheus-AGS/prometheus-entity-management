import type { Message } from "@a2a-js/sdk";

/** Stable Prometheus extension layered on official A2A structured data parts. */
export const PROMETHEUS_GRAPH_EXTENSION_URI =
  "https://prometheus-ags.github.io/prometheus-entity-management/extensions/entity-graph/v1";

/** Prometheus adapter contract for carrying validated A2UI v0.9.1 messages. */
export const PROMETHEUS_A2UI_EXTENSION_URI =
  "https://prometheus-ags.github.io/prometheus-entity-management/extensions/a2ui/v0.9.1";

export const PROMETHEUS_A2UI_PROTOCOL_VERSION = "v0.9.1" as const;
export const PROMETHEUS_A2UI_MEDIA_TYPE = "application/json+a2ui" as const;
export const PROMETHEUS_A2UI_CATALOG_ID = "urn:prometheus-ags:a2ui:catalog:v3";

/** A graph mutation transported inside an official A2A structured-data Part. */
export type GraphMutation =
  | { op: "upsert"; entityType: string; id: string; data: Record<string, unknown> }
  | { op: "replace"; entityType: string; id: string; data: Record<string, unknown> }
  | { op: "remove"; entityType: string; id: string }
  | { op: "patch"; entityType: string; id: string; patch: Record<string, unknown> }
  | { op: "clearPatch"; entityType: string; id: string };

export interface GraphMutateRequest {
  kind: "prometheus.entity-graph.request";
  version: "1.0";
  operation: "mutate";
  mutations: GraphMutation[];
}

export interface GraphQueryRequest {
  kind: "prometheus.entity-graph.request";
  version: "1.0";
  operation: "query";
  entityType: string;
  id?: string;
  listKey?: string;
  limit?: number;
}

export interface GraphSnapshotRequest {
  kind: "prometheus.entity-graph.request";
  version: "1.0";
  operation: "snapshot";
  entityTypes?: string[];
}

export type EntityGraphA2ARequest =
  | GraphMutateRequest
  | GraphQueryRequest
  | GraphSnapshotRequest;

export interface EntityGraphMutationResult {
  kind: "prometheus.entity-graph.result";
  version: "1.0";
  operation: "mutate";
  applied: number;
  affectedEntityIds: string[];
}

export interface EntityGraphQueryResult {
  kind: "prometheus.entity-graph.result";
  version: "1.0";
  operation: "query" | "snapshot";
  entities: Record<string, unknown>[] | Record<string, Record<string, unknown>>;
  total: number;
}

/** Authenticated identity made available to request and graph policy. */
export interface A2ACaller {
  id: string;
  isAuthenticated: boolean;
  scopes: readonly string[];
  claims?: Readonly<Record<string, unknown>>;
}

export interface A2AAuthenticationContext {
  request: Request;
}

/** Authentication adapter. Returning null rejects the HTTP request as unauthenticated. */
export interface A2AAuthenticator {
  authenticate(context: A2AAuthenticationContext):
    | Promise<A2ACaller | null>
    | A2ACaller
    | null;
}

export interface A2APolicyDecision {
  allowed: boolean;
  /** Private audit reason; never reflected verbatim to untrusted callers. */
  reason?: string;
}

export interface A2ARequestPolicyContext {
  caller: A2ACaller;
  method: string;
  tenantId?: string;
  message?: Message;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface A2AGraphPolicyContext {
  caller: A2ACaller;
  tenantId?: string;
  operation: "query" | "snapshot" | GraphMutation["op"];
  entityType?: string;
  entityId?: string;
  fields: readonly string[];
  message: Message;
}

/** Application authority. Protocol validity never implies graph authority. */
export interface A2AApplicationPolicy {
  authorizeRequest(context: A2ARequestPolicyContext):
    | Promise<A2APolicyDecision>
    | A2APolicyDecision;
  authorizeGraphOperation(context: A2AGraphPolicyContext):
    | Promise<A2APolicyDecision>
    | A2APolicyDecision;
  /** Out-of-band approval hook for replace/remove operations. */
  requestApproval?(context: A2AGraphPolicyContext):
    | Promise<A2APolicyDecision>
    | A2APolicyDecision;
}

export interface EntityGraphA2APolicyRule {
  actions: readonly A2AGraphPolicyContext["operation"][];
  /** Empty or omitted means no entity fields are permitted. */
  fields?: readonly string[];
}

export interface CreateEntityGraphA2APolicyOptions {
  entities: Readonly<Record<string, EntityGraphA2APolicyRule>>;
  authorize?: (
    context: A2ARequestPolicyContext | A2AGraphPolicyContext,
  ) => Promise<boolean> | boolean;
  requestApproval?: A2AApplicationPolicy["requestApproval"];
}

export interface DeterministicExecutorOptions {
  policy?: A2AApplicationPolicy;
  clock?: () => string;
  idFactory?: () => string;
  /** Async checkpoint between working and result; useful for cancellation tests. */
  stepDelayMs?: number;
}

/** Wire envelope returned by the official JSON-RPC transport handler. */
export interface A2AJsonRpcResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
  error?: unknown;
}

export interface A2AServerCallOptions {
  caller?: A2ACaller;
  headers?: Readonly<Record<string, string>>;
  requestedVersion?: string;
  requestedExtensions?: readonly string[];
  tenantId?: string;
}

export interface ExternalA2AExecutorOptions {
  /** Base URL used for standard AgentCard discovery. */
  baseUrl: string;
  fetch?: typeof fetch;
  serviceParameters?: Readonly<Record<string, string>>;
}
