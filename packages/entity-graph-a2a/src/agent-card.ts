/**
 * agent-card.ts — AgentCard factory for the entity-graph A2A server.
 *
 * Builds the capability manifest that is served at /.well-known/agent.json so
 * that client agents can discover what graph operations this agent supports.
 *
 * Declared capabilities map 1-to-1 with the graph mutations and queries that
 * the default handler (handler.ts) can execute:
 *   - graph/upsert
 *   - graph/replace
 *   - graph/remove
 *   - graph/patch
 *   - graph/query
 *   - graph/snapshot
 */

import type { AgentCard, AgentCapability } from "./types.js";

// ── Built-in capability descriptors ──────────────────────────────────────────

const GRAPH_UPSERT_CAPABILITY: AgentCapability = {
  name: "graph/upsert",
  description: "Shallow-merge one or more entities into the canonical entity graph.",
  inputSchema: {
    type: "object",
    required: ["mutations"],
    properties: {
      mutations: {
        type: "array",
        items: {
          type: "object",
          required: ["op", "entityType", "id", "data"],
          properties: {
            op: { type: "string", const: "upsert" },
            entityType: { type: "string" },
            id: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      applied: { type: "integer" },
    },
  },
  tags: ["write", "graph"],
};

const GRAPH_REPLACE_CAPABILITY: AgentCapability = {
  name: "graph/replace",
  description: "Replace entity canonical data entirely (no merge — stale keys are dropped).",
  inputSchema: {
    type: "object",
    required: ["mutations"],
    properties: {
      mutations: {
        type: "array",
        items: {
          type: "object",
          required: ["op", "entityType", "id", "data"],
          properties: {
            op: { type: "string", const: "replace" },
            entityType: { type: "string" },
            id: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: { applied: { type: "integer" } },
  },
  tags: ["write", "graph"],
};

const GRAPH_REMOVE_CAPABILITY: AgentCapability = {
  name: "graph/remove",
  description: "Remove one or more entities from the canonical graph.",
  inputSchema: {
    type: "object",
    required: ["mutations"],
    properties: {
      mutations: {
        type: "array",
        items: {
          type: "object",
          required: ["op", "entityType", "id"],
          properties: {
            op: { type: "string", const: "remove" },
            entityType: { type: "string" },
            id: { type: "string" },
          },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: { applied: { type: "integer" } },
  },
  tags: ["write", "graph"],
};

const GRAPH_PATCH_CAPABILITY: AgentCapability = {
  name: "graph/patch",
  description: "Apply UI-only patch fields to one or more entities (not sent to server).",
  inputSchema: {
    type: "object",
    required: ["mutations"],
    properties: {
      mutations: {
        type: "array",
        items: {
          type: "object",
          required: ["op", "entityType", "id", "patch"],
          properties: {
            op: { type: "string", const: "patch" },
            entityType: { type: "string" },
            id: { type: "string" },
            patch: { type: "object" },
          },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: { applied: { type: "integer" } },
  },
  tags: ["write", "graph"],
};

const GRAPH_QUERY_CAPABILITY: AgentCapability = {
  name: "graph/query",
  description: "Read one entity or a list from the canonical entity graph.",
  inputSchema: {
    type: "object",
    required: ["entityType"],
    properties: {
      entityType: { type: "string" },
      id: { type: "string" },
      listKey: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 1000 },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "object" } },
      total: { type: "integer" },
    },
  },
  tags: ["read", "graph"],
};

const GRAPH_SNAPSHOT_CAPABILITY: AgentCapability = {
  name: "graph/snapshot",
  description: "Export the current entity graph as a structured snapshot artifact.",
  inputSchema: {
    type: "object",
    properties: {
      types: {
        type: "array",
        items: { type: "string" },
        description: "Entity types to include. Omit to export all types.",
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      entities: { type: "object" },
      exportedAt: { type: "string" },
    },
  },
  tags: ["read", "graph"],
};

/** All capabilities built into the default entity-graph A2A handler. */
export const DEFAULT_CAPABILITIES: AgentCapability[] = [
  GRAPH_UPSERT_CAPABILITY,
  GRAPH_REPLACE_CAPABILITY,
  GRAPH_REMOVE_CAPABILITY,
  GRAPH_PATCH_CAPABILITY,
  GRAPH_QUERY_CAPABILITY,
  GRAPH_SNAPSHOT_CAPABILITY,
];

// ── Factory ───────────────────────────────────────────────────────────────────

export interface BuildAgentCardOptions {
  name?: string;
  version?: string;
  description?: string;
  /** Base URL where the A2A server is reachable. Must be set for real deployments. */
  url: string;
  /** Additional capabilities beyond the built-in graph ones. */
  extraCapabilities?: AgentCapability[];
  /** Provider metadata. */
  provider?: AgentCard["provider"];
  /** Auth schemes. Defaults to [{ type: "none" }]. */
  auth?: AgentCard["auth"];
  tags?: string[];
}

/**
 * Build an AgentCard for the entity-graph A2A server.
 *
 * @example
 * ```ts
 * const card = buildAgentCard({ url: "https://api.example.com/a2a" });
 * // Serve at GET /.well-known/agent.json
 * ```
 */
export function buildAgentCard(opts: BuildAgentCardOptions): AgentCard {
  return {
    specVersion: "1.0",
    name: opts.name ?? "Entity Graph Agent",
    version: opts.version ?? "3.0.0-alpha.0",
    description:
      opts.description ??
      "A2A server exposing normalized entity graph read/write operations. " +
        "Clients can upsert, replace, remove, patch, and query entities " +
        "in the Prometheus entity graph over the A2A protocol.",
    url: opts.url,
    auth: opts.auth ?? [{ type: "none" }],
    capabilities: [...DEFAULT_CAPABILITIES, ...(opts.extraCapabilities ?? [])],
    provider: opts.provider,
    tags: opts.tags ?? ["entity-graph", "data", "storage"],
  };
}
