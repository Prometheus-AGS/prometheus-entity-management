import type { Artifact } from "@a2a-js/sdk";
import {
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_A2UI_MEDIA_TYPE,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
} from "./types.js";

export interface PrometheusA2UIMessage {
  version: typeof PROMETHEUS_A2UI_PROTOCOL_VERSION;
  [key: string]: unknown;
}

export interface PrometheusA2UIArtifactPayload {
  protocol: typeof PROMETHEUS_A2UI_PROTOCOL_VERSION;
  extensionUri: typeof PROMETHEUS_A2UI_EXTENSION_URI;
  messages: readonly PrometheusA2UIMessage[];
}

/**
 * Carry already validated A2UI v0.9.1 messages in an official A2A data Part.
 * This is a Prometheus adapter contract, not a claim that the legacy upstream
 * A2UI-for-A2A v0.8 extension defines v0.9.1 transport semantics.
 */
export function createA2UIArtifact(
  messages: readonly PrometheusA2UIMessage[],
  options: { artifactId: string; name?: string; description?: string },
): Artifact {
  if (messages.length === 0) {
    throw new Error("An A2UI artifact must contain at least one message.");
  }
  if (messages.some((message) => message.version !== PROMETHEUS_A2UI_PROTOCOL_VERSION)) {
    throw new Error(`A2UI artifacts must use ${PROMETHEUS_A2UI_PROTOCOL_VERSION}.`);
  }

  const payload: PrometheusA2UIArtifactPayload = {
    protocol: PROMETHEUS_A2UI_PROTOCOL_VERSION,
    extensionUri: PROMETHEUS_A2UI_EXTENSION_URI,
    messages,
  };

  return {
    artifactId: options.artifactId,
    name: options.name ?? "Prometheus entity graph surface",
    description:
      options.description ??
      "Validated A2UI v0.9.1 messages carried through the Prometheus A2A adapter.",
    parts: [
      {
        content: { $case: "data", value: payload },
        mediaType: PROMETHEUS_A2UI_MEDIA_TYPE,
        filename: "",
        metadata: {
          extensionUri: PROMETHEUS_A2UI_EXTENSION_URI,
          protocolVersion: PROMETHEUS_A2UI_PROTOCOL_VERSION,
        },
      },
    ],
    metadata: {
      extensionUri: PROMETHEUS_A2UI_EXTENSION_URI,
      protocolVersion: PROMETHEUS_A2UI_PROTOCOL_VERSION,
    },
    extensions: [PROMETHEUS_A2UI_EXTENSION_URI],
  };
}

/** Stable no-model fixture used by CI and examples. */
export function createDeterministicA2UIMessages(
  body: string,
  surfaceId = "prometheus-entity-surface",
): readonly PrometheusA2UIMessage[] {
  return [
    {
      version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
      createSurface: {
        surfaceId,
        catalogId: PROMETHEUS_A2UI_CATALOG_ID,
        sendDataModel: true,
      },
    },
    {
      version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Card", child: "content" },
          { id: "content", component: "Column", children: ["heading", "body"] },
          { id: "heading", component: "Text", text: { path: "/heading" }, variant: "h2" },
          { id: "body", component: "Text", text: { path: "/body" }, variant: "body" },
        ],
      },
    },
    {
      version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
      updateDataModel: {
        surfaceId,
        path: "/",
        value: { heading: "Prometheus Entity Agent", body },
      },
    },
  ];
}
