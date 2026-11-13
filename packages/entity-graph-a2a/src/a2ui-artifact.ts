import type { Artifact, Message, Part } from "@a2a-js/sdk";
import {
  A2UI_RENDERER_CAPABILITIES_KEY,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_A2UI_MEDIA_TYPE,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
} from "./types.js";

/** One A2UI 1.0 message (agent-to-renderer or renderer-to-agent). */
export interface PrometheusA2UIMessage {
  version: typeof PROMETHEUS_A2UI_PROTOCOL_VERSION;
  [key: string]: unknown;
}

/**
 * @deprecated The official extension carries the message list itself as the
 * DataPart's `data`; there is no wrapper object any more. Kept as a type alias
 * of the list for one minor line.
 */
export type PrometheusA2UIArtifactPayload = readonly PrometheusA2UIMessage[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** An A2A DataPart carrying a list of A2UI messages, as the A2UI extension v1.0 encodes it. */
export function createA2UIDataPart(messages: readonly PrometheusA2UIMessage[]): Part {
  return {
    content: { $case: "data", value: [...messages] },
    mediaType: PROMETHEUS_A2UI_MEDIA_TYPE,
    filename: "",
    metadata: { mimeType: PROMETHEUS_A2UI_MEDIA_TYPE },
  };
}

/**
 * Carry already validated A2UI 1.0 messages in an A2A artifact, encoded as the
 * official A2UI A2A extension v1.0 defines (one DataPart whose `data` is the
 * message list, `metadata.mimeType` = `application/a2ui+json`).
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
  return {
    artifactId: options.artifactId,
    name: options.name ?? "Prometheus entity graph surface",
    description: options.description ?? "A2UI 1.0 messages carried over A2A.",
    parts: [createA2UIDataPart(messages)],
    metadata: { extensionUri: PROMETHEUS_A2UI_EXTENSION_URI },
    extensions: [PROMETHEUS_A2UI_EXTENSION_URI],
  };
}

/** Whether a Part is an A2UI DataPart (by `metadata.mimeType` or the A2A `mediaType`). */
export function isA2UIDataPart(part: Part): boolean {
  if (part.content?.$case !== "data") return false;
  return (
    part.mediaType === PROMETHEUS_A2UI_MEDIA_TYPE ||
    (isRecord(part.metadata) && part.metadata.mimeType === PROMETHEUS_A2UI_MEDIA_TYPE)
  );
}

/**
 * The A2UI messages a message carries, in order, from every A2UI DataPart.
 * The list is not transactional: the caller processes each message on its own.
 * A part whose `data` is not a list is ignored.
 */
export function extractA2UIMessages(message: Pick<Message, "parts">): Record<string, unknown>[] {
  const messages: Record<string, unknown>[] = [];
  for (const part of message.parts) {
    if (!isA2UIDataPart(part) || part.content?.$case !== "data") continue;
    const data: unknown = part.content.value;
    if (!Array.isArray(data)) continue;
    for (const item of data) if (isRecord(item)) messages.push(item);
  }
  return messages;
}

/**
 * The A2UI 1.0 renderer capabilities this turn's message offers, or `undefined`.
 * Per the A2UI A2A extension, capabilities are scoped to the message's turn: a
 * message without a `1.0` entry offers no A2UI, and the agent must not send A2UI
 * in reply to it.
 */
export function rendererCapabilitiesOf(
  message: Pick<Message, "metadata">,
): Record<string, unknown> | undefined {
  const metadata = message.metadata;
  if (!isRecord(metadata)) return undefined;
  const capabilities = metadata[A2UI_RENDERER_CAPABILITIES_KEY];
  if (!isRecord(capabilities)) return undefined;
  const v1 = capabilities[PROMETHEUS_A2UI_PROTOCOL_VERSION];
  return isRecord(v1) ? v1 : undefined;
}

/**
 * Whether this turn offers A2UI 1.0 for a catalog. A capabilities entry that
 * lists `supportedCatalogIds` must include the catalog; one without the list
 * offers A2UI 1.0 without restricting catalogs.
 */
export function offersA2UICatalog(message: Pick<Message, "metadata">, catalogId: string): boolean {
  const capabilities = rendererCapabilitiesOf(message);
  if (!capabilities) return false;
  const supported = capabilities.supportedCatalogIds;
  // Absent: no restriction. A list: it must name the catalog. Anything else is malformed and offers nothing.
  if (supported === undefined) return true;
  return Array.isArray(supported) && supported.includes(catalogId);
}

/** Stable no-model fixture used by examples and the reference agent. */
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
          // A2UI 1.0 basic Text allows only the caption and body variants.
          { id: "heading", component: "Text", text: { "@path": "/heading" } },
          { id: "body", component: "Text", text: { "@path": "/body" }, variant: "body" },
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
