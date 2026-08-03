import {
  A2A_PROTOCOL_VERSION,
  type AgentCard,
  type AgentExtension,
  type AgentProvider,
  type AgentSkill,
  type SecurityRequirement,
  type SecurityScheme,
} from "@a2a-js/sdk";
import {
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_A2UI_MEDIA_TYPE,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PROMETHEUS_GRAPH_EXTENSION_URI,
} from "./types.js";

export const DEFAULT_AGENT_SKILLS: readonly AgentSkill[] = Object.freeze([
  {
    id: "prometheus.entity-graph.mutate",
    name: "Entity graph mutation",
    description:
      "Apply an application-authorized batch of normalized entity upsert, replace, remove, patch, or clear-patch operations.",
    tags: ["entity-graph", "mutation", "normalized-data"],
    examples: ["Upsert an allowlisted project entity."],
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    securityRequirements: [],
  },
  {
    id: "prometheus.entity-graph.query",
    name: "Entity graph query",
    description:
      "Read an application-authorized entity, ID-backed list, or graph snapshot from the canonical normalized graph.",
    tags: ["entity-graph", "query", "normalized-data"],
    examples: ["Read the allowlisted project with id project-1."],
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    securityRequirements: [],
  },
  {
    id: "prometheus.a2ui.reference-surface",
    name: "Deterministic A2UI reference surface",
    description:
      "Produce repeatable A2UI v0.9.1 artifact messages without a model API key.",
    tags: ["a2ui", "reference-agent", "deterministic"],
    examples: ["Show the deterministic Prometheus entity surface."],
    inputModes: ["text/plain"],
    outputModes: [PROMETHEUS_A2UI_MEDIA_TYPE],
    securityRequirements: [],
  },
]);

export const DEFAULT_AGENT_EXTENSIONS: readonly AgentExtension[] = Object.freeze([
  {
    uri: PROMETHEUS_GRAPH_EXTENSION_URI,
    description:
      "Prometheus v1 entity-graph requests and results in official A2A structured-data Parts.",
    required: false,
    params: { version: "1.0" },
  },
  {
    uri: PROMETHEUS_A2UI_EXTENSION_URI,
    description:
      "Prometheus-owned adapter for validated A2UI v0.9.1 messages; this does not impersonate the legacy upstream A2UI v0.8 A2A extension.",
    required: false,
    params: {
      protocolVersion: PROMETHEUS_A2UI_PROTOCOL_VERSION,
      supportedCatalogIds: [PROMETHEUS_A2UI_CATALOG_ID],
      mediaType: PROMETHEUS_A2UI_MEDIA_TYPE,
    },
  },
]);

export interface BuildAgentCardOptions {
  /** Absolute JSON-RPC endpoint URL advertised to clients. */
  url: string;
  name?: string;
  version?: string;
  description?: string;
  documentationUrl?: string;
  iconUrl?: string;
  provider?: AgentProvider;
  skills?: readonly AgentSkill[];
  extensions?: readonly AgentExtension[];
  /** Enable an HTTP Bearer declaration without embedding credentials. */
  authentication?: "none" | "bearer";
  bearerFormat?: string;
  securitySchemes?: Readonly<Record<string, SecurityScheme>>;
  securityRequirements?: readonly SecurityRequirement[];
}

/** Build an official A2A v1 AgentCard that advertises JSON-RPC only. */
export function buildAgentCard(options: BuildAgentCardOptions): AgentCard {
  const endpoint = new URL(options.url);
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    throw new Error("A2A AgentCard endpoints must use HTTPS outside local development.");
  }

  const authentication = options.authentication ?? "none";
  const securitySchemes: Record<string, SecurityScheme> = {
    ...(options.securitySchemes ?? {}),
  };
  const securityRequirements = [...(options.securityRequirements ?? [])];
  if (authentication === "bearer") {
    securitySchemes.bearer = {
      scheme: {
        $case: "httpAuthSecurityScheme",
        value: {
          description: "Bearer credential verified by the host application.",
          scheme: "Bearer",
          bearerFormat: options.bearerFormat ?? "JWT",
        },
      },
    };
    if (securityRequirements.length === 0) {
      securityRequirements.push({ schemes: { bearer: { list: [] } } });
    }
  }

  const skills = (options.skills ?? DEFAULT_AGENT_SKILLS).map((skill) => ({
    ...skill,
    securityRequirements:
      skill.securityRequirements.length > 0
        ? [...skill.securityRequirements]
        : [...securityRequirements],
  }));

  return {
    name: options.name ?? "Prometheus Entity Graph Agent",
    description:
      options.description ??
      "A policy-gated A2A v1 JSON-RPC agent for the Prometheus normalized entity graph and deterministic A2UI artifacts.",
    supportedInterfaces: [
      {
        url: endpoint.toString(),
        protocolBinding: "JSONRPC",
        protocolVersion: A2A_PROTOCOL_VERSION,
        tenant: "",
      },
    ],
    provider: options.provider ?? {
      organization: "Prometheus AGS",
      url: "https://github.com/prometheus-ags",
    },
    version: options.version ?? "3.0.0-rc.1",
    documentationUrl:
      options.documentationUrl ??
      "https://github.com/prometheus-ags/prometheus-entity-management/tree/main/packages/entity-graph-a2a",
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extensions: [...(options.extensions ?? DEFAULT_AGENT_EXTENSIONS)],
      extendedAgentCard: false,
    },
    securitySchemes,
    securityRequirements,
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json", PROMETHEUS_A2UI_MEDIA_TYPE],
    skills,
    signatures: [],
    iconUrl: options.iconUrl,
  };
}
