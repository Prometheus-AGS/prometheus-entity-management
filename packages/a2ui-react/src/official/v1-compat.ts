import type { A2uiMessage } from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import { z } from "zod";

/**
 * A2UI protocol version this build speaks on the wire.
 *
 * Surface messages are validated against this literal, so a peer announcing a
 * different version is rejected rather than partially parsed.
 */
export const PROMETHEUS_A2UI_RC_PROTOCOL_VERSION = "v1.0" as const;

const componentSchema = z
  .object({ id: z.string().min(1), component: z.string().min(1) })
  .passthrough();
const surfaceIdSchema = z.string().min(1);
const createSurfaceSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    createSurface: z
      .object({
        surfaceId: surfaceIdSchema,
        catalogId: z.string().min(1).optional(),
        sendDataModel: z.boolean().optional(),
        components: z.array(componentSchema).min(1).optional(),
        dataModel: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict();
const updateComponentsSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    updateComponents: z
      .object({
        surfaceId: surfaceIdSchema,
        components: z.array(componentSchema).min(1),
      })
      .strict(),
  })
  .strict();
const updateDataModelSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    updateDataModel: z
      .object({
        surfaceId: surfaceIdSchema,
        path: z.string().optional(),
        value: z.unknown(),
      })
      .strict(),
  })
  .strict();
const deleteSurfaceSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    deleteSurface: z.object({ surfaceId: surfaceIdSchema }).strict(),
  })
  .strict();
const callFunctionSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    functionCallId: z.string().min(1),
    wantResponse: z.boolean().optional(),
    callFunction: z
      .object({
        call: z.string().min(1),
        catalogId: z.string().min(1).optional(),
        args: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough(),
  })
  .strict();
const actionResponseSchema = z
  .object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    actionId: z.string().min(1),
    actionResponse: z
      .object({ value: z.unknown().optional(), error: z.unknown().optional() })
      .strict()
      .refine((value) => ("value" in value) !== ("error" in value)),
  })
  .strict();

export const prometheusA2uiV1MessageSchema = z.union([
  createSurfaceSchema,
  updateComponentsSchema,
  updateDataModelSchema,
  deleteSurfaceSchema,
  callFunctionSchema,
  actionResponseSchema,
]);

export type PrometheusA2uiV1Message = z.infer<typeof prometheusA2uiV1MessageSchema>;
export type PrometheusA2uiV1FunctionCall = z.infer<typeof callFunctionSchema>;
export type PrometheusA2uiV1ActionResponse = z.infer<typeof actionResponseSchema>;

export interface PrometheusA2uiV1ActionMetadata {
  surfaceId: string;
  sourceComponentId: string;
  wantResponse: boolean;
  responsePath?: string;
}

export interface NormalizedA2uiV1Message {
  renderMessages: A2uiMessage[];
  protocolMessage?: PrometheusA2uiV1FunctionCall | PrometheusA2uiV1ActionResponse;
  actions: PrometheusA2uiV1ActionMetadata[];
}

function normalizeComponents(
  surfaceId: string,
  components: Array<Record<string, unknown>>,
  catalogId: string,
): { components: Array<Record<string, unknown>>; actions: PrometheusA2uiV1ActionMetadata[] } {
  const actions: PrometheusA2uiV1ActionMetadata[] = [];
  const normalized = components.map((input) => {
    const component = structuredClone(input);
    if (component.catalogId !== undefined && component.catalogId !== catalogId) {
      throw new Error(
        `A2UI v1.0 component ${String(component.id)} requests unsupported catalog ${String(component.catalogId)}.`,
      );
    }
    delete component.catalogId;
    const action = component.action;
    if (action && typeof action === "object" && "event" in action) {
      const event = (action as { event?: unknown }).event;
      if (event && typeof event === "object") {
        const eventRecord = event as Record<string, unknown>;
        const wantResponse = eventRecord.wantResponse === true;
        const responsePath =
          typeof eventRecord.responsePath === "string" ? eventRecord.responsePath : undefined;
        if (wantResponse || responsePath) {
          actions.push({
            surfaceId,
            sourceComponentId: String(component.id),
            wantResponse,
            ...(responsePath ? { responsePath } : {}),
          });
        }
        delete eventRecord.wantResponse;
        delete eventRecord.responsePath;
      }
    }
    return component;
  });
  return { components: normalized, actions };
}

export function normalizeA2uiV1Message(
  input: unknown,
  defaultCatalogId: string,
  surfaceCatalogs: ReadonlyMap<string, string>,
): NormalizedA2uiV1Message {
  const message = prometheusA2uiV1MessageSchema.parse(input);
  if ("callFunction" in message || "actionResponse" in message) {
    return { renderMessages: [], protocolMessage: message, actions: [] };
  }
  if ("createSurface" in message) {
    const surface = message.createSurface;
    const catalogId = surface.catalogId ?? defaultCatalogId;
    const renderMessages: A2uiMessage[] = [
      {
        version: "v0.9.1",
        createSurface: {
          surfaceId: surface.surfaceId,
          catalogId,
          ...(surface.sendDataModel === undefined
            ? {}
            : { sendDataModel: surface.sendDataModel }),
        },
      },
    ];
    const normalized = surface.components
      ? normalizeComponents(surface.surfaceId, surface.components, catalogId)
      : { components: [], actions: [] };
    if (normalized.components.length > 0) {
      renderMessages.push({
        version: "v0.9.1",
        updateComponents: {
          surfaceId: surface.surfaceId,
          components: normalized.components,
        },
      } as A2uiMessage);
    }
    if (surface.dataModel !== undefined) {
      renderMessages.push({
        version: "v0.9.1",
        updateDataModel: {
          surfaceId: surface.surfaceId,
          path: "/",
          value: surface.dataModel,
        },
      });
    }
    return { renderMessages, actions: normalized.actions };
  }
  if ("updateComponents" in message) {
    const surface = message.updateComponents;
    const catalogId = surfaceCatalogs.get(surface.surfaceId) ?? defaultCatalogId;
    const normalized = normalizeComponents(surface.surfaceId, surface.components, catalogId);
    return {
      renderMessages: [
        {
          version: "v0.9.1",
          updateComponents: {
            surfaceId: surface.surfaceId,
            components: normalized.components,
          },
        } as A2uiMessage,
      ],
      actions: normalized.actions,
    };
  }
  if ("updateDataModel" in message) {
    return {
      renderMessages: [
        {
          version: "v0.9.1",
          updateDataModel: {
            ...message.updateDataModel,
            path: message.updateDataModel.path ?? "/",
          },
        },
      ],
      actions: [],
    };
  }
  return {
    renderMessages: [
      { version: "v0.9.1", deleteSurface: message.deleteSurface },
    ],
    actions: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The inverse of the metadata stripping done when a v1.0 surface is normalized:
 * put each action's `wantResponse` and `responsePath` back on the `event` of the
 * component that carries it, where the producer wrote them. A component with no
 * recorded metadata is returned unchanged, and the input is never mutated.
 *
 * Only a `wantResponse` of `true` is recorded when a surface is normalized, so
 * an explicit `wantResponse: false` is restored as an absent field, which means
 * the same thing.
 */
export function restoreV1ActionMetadata<Component extends Record<string, unknown>>(
  components: readonly Component[],
  actions: readonly PrometheusA2uiV1ActionMetadata[],
): Component[] {
  const bySource = new Map(actions.map((action) => [action.sourceComponentId, action] as const));
  return components.map((component) => {
    const metadata = bySource.get(String(component.id));
    const action = component.action;
    if (!metadata || !isRecord(action) || !isRecord(action.event)) return component;
    return {
      ...component,
      action: {
        ...action,
        event: {
          ...action.event,
          ...(metadata.wantResponse ? { wantResponse: true } : {}),
          ...(metadata.responsePath ? { responsePath: metadata.responsePath } : {}),
        },
      },
    };
  });
}
