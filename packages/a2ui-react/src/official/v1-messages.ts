import { AgentToRendererMessageSchema } from "@a2ui/web_core/v1_0";
import type { AgentToRendererMessage } from "@a2ui/web_core/v1_0" with { "resolution-mode": "import" };
import { PROMETHEUS_A2UI_V1_PROTOCOL_VERSION } from "./catalog-core.js";
import { PrometheusA2uiError } from "./runtime-types.js";

/** An A2UI 1.0 agent-to-renderer message, as the official 1.0 schema defines it. */
export type PrometheusA2uiV1Message = AgentToRendererMessage;

/**
 * Component envelope keys that A2UI spec PR #4044 renames to an `@` form
 * (`@catalogId`, `@metadata`, `@accessibility`, `@checks`). `@a2ui/web_core`
 * 0.15.0 reads only the bare form, so the `@` form is translated before
 * validation. The specification's transition rule applies: a component may use
 * either form, never both.
 */
const ENVELOPE_KEYS = ["catalogId", "metadata", "accessibility", "checks"] as const;

/** Whether an envelope announces A2UI 1.0 (`"1.0"`, no `v` prefix). */
export function isV1Envelope(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    (raw as { version?: unknown }).version === PROMETHEUS_A2UI_V1_PROTOCOL_VERSION
  );
}

function translateComponent(component: unknown): unknown {
  if (component === null || typeof component !== "object" || Array.isArray(component)) {
    return component;
  }
  const source = component as Record<string, unknown>;
  const translated: Record<string, unknown> = { ...source };
  for (const key of ENVELOPE_KEYS) {
    const prefixed = `@${key}`;
    if (!(prefixed in source)) continue;
    if (key in source) {
      throw new PrometheusA2uiError(
        "invalid-message",
        `A2UI 1.0 component ${String(source.id)} carries both ${key} and ${prefixed}.`,
      );
    }
    translated[key] = source[prefixed];
    delete translated[prefixed];
  }
  return translated;
}

function translateComponents(holder: unknown): unknown {
  if (holder === null || typeof holder !== "object") return holder;
  const record = holder as Record<string, unknown>;
  if (!Array.isArray(record.components)) return holder;
  return { ...record, components: record.components.map(translateComponent) };
}

/**
 * Validate one A2UI 1.0 envelope against the official schema, after translating
 * `@`-prefixed component envelope keys. Returns a fresh copy; the input is never
 * mutated.
 */
export function parseV1Message(raw: unknown): PrometheusA2uiV1Message {
  const message = structuredClone(raw) as Record<string, unknown>;
  if ("createSurface" in message) message.createSurface = translateComponents(message.createSurface);
  if ("updateComponents" in message) {
    message.updateComponents = translateComponents(message.updateComponents);
  }
  const parsed = AgentToRendererMessageSchema.safeParse(message);
  if (!parsed.success) {
    throw new PrometheusA2uiError(
      "invalid-message",
      "Input does not match the official A2UI 1.0 message schema.",
      parsed.error,
    );
  }
  // The translated copy, not `parsed.data`: schema parsing may drop the
  // catalog-specific component properties that the processor validates later.
  return message as PrometheusA2uiV1Message;
}

/**
 * Whether a held surface was created by an A2UI 1.0 message. The official
 * 0.15.0 surface model stores the wire form (`1.0`); `v1.0` is accepted too, so
 * either spelling of major version 1 counts.
 */
export function isV1Surface(surface: { readonly protocolVersion?: string | undefined }): boolean {
  return typeof surface.protocolVersion === "string" && /^v?1(\.|$)/.test(surface.protocolVersion);
}

/** The id of a surface's default catalog; a 1.0 surface may have none. */
export function defaultCatalogIdOf(surface: {
  readonly defaultCatalog?: { readonly id: string } | undefined;
}): string | undefined {
  return surface.defaultCatalog?.id;
}

/**
 * Whether a 1.0 message is a function message (`callRendererFunction`,
 * `agentFunctionResponse`) rather than a surface state message. Function
 * messages run in the official processor's RPC handler and never enter the
 * shadow preflight, where they would execute.
 */
export function isV1FunctionMessage(message: PrometheusA2uiV1Message): boolean {
  return "callRendererFunction" in message || "agentFunctionResponse" in message;
}
