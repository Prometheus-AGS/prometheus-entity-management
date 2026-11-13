import type { Message } from "@a2a-js/sdk";

/** Stable Prometheus extension layered on official A2A structured data parts. */
export const PROMETHEUS_GRAPH_EXTENSION_URI =
  "https://prometheus-ags.github.io/prometheus-entity-management/extensions/entity-graph/v1";

/**
 * The official A2UI A2A extension (A2UI extension spec v1.0). Requesting it
 * tells the agent the renderer supports the A2UI 1.0 schema; activation is
 * optional, because per-turn `a2uiRendererCapabilities` metadata negotiates
 * A2UI on its own.
 */
export const PROMETHEUS_A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v1.0";

/** The A2UI wire version carried over A2A. */
export const PROMETHEUS_A2UI_PROTOCOL_VERSION = "1.0" as const;

/** The MIME type that marks an A2A DataPart as A2UI (`DataPart.metadata.mimeType`). */
export const PROMETHEUS_A2UI_MEDIA_TYPE = "application/a2ui+json" as const;

/** The Prometheus A2UI 1.0 catalog the reference agent generates against. */
export const PROMETHEUS_A2UI_CATALOG_ID = "urn:prometheus-ags:a2ui:catalog:a2ui-1.0";

/** `message.metadata` key carrying the renderer's version-keyed capabilities for this turn. */
export const A2UI_RENDERER_CAPABILITIES_KEY = "a2uiRendererCapabilities" as const;

/** `message.metadata` key carrying the renderer's synced data model. */
export const A2UI_RENDERER_DATA_MODEL_KEY = "a2uiRendererDataModel" as const;

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

/** Context for an A2UI message a client (renderer) sent to the agent. */
export interface A2UIInboundContext {
  caller: A2ACaller;
  tenantId?: string;
  /** The A2A message that carried it. */
  message: Message;
}

/**
 * Application-owned handling of A2UI renderer-to-agent messages (`action`,
 * `callAgentFunction`, `rendererFunctionResponse`, `error`) arriving over A2A.
 * Without it, every inbound A2UI message is refused.
 */
export interface A2UIInboundHandler {
  /** Decide each message before it is handled; denial is the default answer to anything unexpected. */
  authorize(message: Readonly<Record<string, unknown>>, context: A2UIInboundContext):
    | Promise<boolean>
    | boolean;
  /**
   * Handle an authorized message. A2UI messages returned are sent back to the
   * renderer, only if this turn offered A2UI 1.0 capabilities.
   */
  handle(message: Readonly<Record<string, unknown>>, context: A2UIInboundContext):
    | Promise<readonly Record<string, unknown>[] | void>
    | readonly Record<string, unknown>[]
    | void;
}

export interface DeterministicExecutorOptions {
  policy?: A2AApplicationPolicy;
  /** Inbound A2UI messages; absent means every inbound A2UI message is refused. */
  a2uiInbound?: A2UIInboundHandler;
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
