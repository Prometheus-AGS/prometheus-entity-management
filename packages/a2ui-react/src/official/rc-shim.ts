import { z } from "zod";
import { PROMETHEUS_A2UI_V1_PROTOCOL_VERSION } from "./catalog-core.js";
import { PrometheusA2uiError } from "./runtime-types.js";

/**
 * Opt-in input shim for the A2UI 1.0 **release candidate** dialect
 * (`version: "v1.0"`), kept for one minor line after 5.0.0 so producers can
 * migrate. Off by default (`acceptReleaseCandidateInput`). It translates RC
 * input into A2UI 1.0 final messages, which then take the ordinary 1.0 path:
 *
 * - surface messages: `version` → `"1.0"`; v0.9-style bindings (`{ path }`,
 *   `{ call, args }`) → 1.0 `{ "@path" }`, `{ "@call", args }`;
 * - `callFunction` → `callRendererFunction`; `actionResponse` →
 *   `agentFunctionResponse` (the RC `actionId` becomes the `functionCallId`);
 * - response-aware actions (`action.event.wantResponse` / `responsePath`),
 *   which 1.0 forbids, are stripped from the component and recorded. When such
 *   an action fires, the runtime sends it as a 1.0 `callAgentFunction` and
 *   writes the answer at the recorded `responsePath`.
 *
 * Output is always A2UI 1.0; nothing RC-shaped is ever sent to an agent.
 */

/** The A2UI 1.0 release-candidate wire version, accepted only through this shim. */
export const PROMETHEUS_A2UI_RC_PROTOCOL_VERSION = "v1.0" as const;

/** A response-aware RC action recorded for a component. */
export interface RcResponseAction {
  readonly surfaceId: string;
  readonly sourceComponentId: string;
  readonly responsePath?: string;
}

const componentSchema = z.object({ id: z.string().min(1), component: z.string().min(1) }).passthrough();
const surfaceIdSchema = z.string().min(1);
const rcSchema = z.union([
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    createSurface: z.object({
      surfaceId: surfaceIdSchema,
      catalogId: z.string().min(1).optional(),
      sendDataModel: z.boolean().optional(),
      components: z.array(componentSchema).min(1).optional(),
      dataModel: z.record(z.string(), z.unknown()).optional(),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    updateComponents: z.object({
      surfaceId: surfaceIdSchema,
      components: z.array(componentSchema).min(1),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    updateDataModel: z.object({
      surfaceId: surfaceIdSchema,
      path: z.string().optional(),
      value: z.unknown(),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    deleteSurface: z.object({ surfaceId: surfaceIdSchema }).strict(),
  }).strict(),
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    functionCallId: z.string().min(1),
    wantResponse: z.boolean().optional(),
    callFunction: z.object({
      call: z.string().min(1),
      catalogId: z.string().min(1).optional(),
      args: z.record(z.string(), z.unknown()).optional(),
    }).passthrough(),
  }).strict(),
  z.object({
    version: z.literal(PROMETHEUS_A2UI_RC_PROTOCOL_VERSION),
    actionId: z.string().min(1),
    actionResponse: z
      .object({ value: z.unknown().optional(), error: z.unknown().optional() })
      .strict()
      .refine((value) => ("value" in value) !== ("error" in value)),
  }).strict(),
]);

/** Whether an envelope announces the RC dialect. */
export function isRcEnvelope(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    (raw as { version?: unknown }).version === PROMETHEUS_A2UI_RC_PROTOCOL_VERSION
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const CALL_KEYS = new Set(["call", "args", "returnType", "catalogId"]);

/** v0.9-style bindings → 1.0 `@path` / `@call`. Any other value is copied. */
function toV1Bindings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toV1Bindings);
  if (!isRecord(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && typeof value.path === "string") return { "@path": value.path };
  if (typeof value.call === "string" && keys.every((key) => CALL_KEYS.has(key))) {
    const { call, args, ...rest } = value;
    return {
      "@call": call,
      ...rest,
      ...(args === undefined ? {} : { args: toV1Bindings(args) }),
    };
  }
  return Object.fromEntries(keys.map((key) => [key, toV1Bindings(value[key])]));
}

/** Map key for a component's recorded action; a JSON tuple, so ids containing `:` cannot collide. */
function actionKey(surfaceId: string, componentId: string): string {
  return JSON.stringify([surfaceId, componentId]);
}

interface ComponentTranslation {
  readonly components: Record<string, unknown>[];
  readonly actions: RcResponseAction[];
}

function translateComponents(surfaceId: string, components: readonly Record<string, unknown>[]): ComponentTranslation {
  const actions: RcResponseAction[] = [];
  const translated = components.map((input) => {
    const { id, component, catalogId, ...properties } = structuredClone(input);
    const action = properties.action;
    if (isRecord(action) && isRecord(action.event)) {
      const event = action.event;
      if (event.wantResponse === true || typeof event.responsePath === "string") {
        actions.push({
          surfaceId,
          sourceComponentId: String(id),
          ...(typeof event.responsePath === "string" ? { responsePath: event.responsePath } : {}),
        });
      }
      delete event.wantResponse;
      delete event.responsePath;
    }
    return {
      id,
      component,
      ...(catalogId === undefined ? {} : { catalogId }),
      ...(toV1Bindings(properties) as Record<string, unknown>),
    };
  });
  return { components: translated, actions };
}

/** One translated RC envelope, plus the action bookkeeping to commit once it is applied. */
export interface RcTranslation {
  readonly message: Record<string, unknown>;
  commit(): void;
}

export class RcInputShim {
  private readonly responseActions = new Map<string, RcResponseAction>();

  /** @param defaultCatalogId The 1.0 catalog an RC `createSurface` without a catalog falls back to, as the RC did. */
  constructor(private readonly defaultCatalogId: string) {}

  /** The response-aware action recorded for a component, if any. */
  responseAction(surfaceId: string, componentId: string): RcResponseAction | undefined {
    return this.responseActions.get(actionKey(surfaceId, componentId));
  }

  /** Translate one RC envelope to A2UI 1.0. Throws `invalid-message` for anything the RC schema rejects. */
  translate(raw: unknown): RcTranslation {
    const parsed = rcSchema.safeParse(raw);
    if (!parsed.success) {
      throw new PrometheusA2uiError(
        "invalid-message",
        "Input does not match the A2UI 1.0 release-candidate schema.",
        parsed.error,
      );
    }
    const rc = parsed.data as Record<string, unknown>;
    const version = PROMETHEUS_A2UI_V1_PROTOCOL_VERSION;
    const noop = (): void => undefined;

    if ("callFunction" in rc) {
      const call = rc.callFunction as { call: string; catalogId?: string; args?: Record<string, unknown> };
      return {
        message: {
          version,
          callRendererFunction: {
            functionCallId: rc.functionCallId,
            callFunction: {
              "@call": call.call,
              ...(call.catalogId === undefined ? {} : { catalogId: call.catalogId }),
              ...(call.args === undefined ? {} : { args: toV1Bindings(call.args) }),
            },
          },
        },
        commit: noop,
      };
    }
    if ("actionResponse" in rc) {
      const response = rc.actionResponse as { value?: unknown; error?: unknown };
      return {
        message: {
          version,
          agentFunctionResponse: {
            functionCallId: rc.actionId,
            ...("value" in response ? { value: response.value } : { error: response.error }),
          },
        },
        commit: noop,
      };
    }
    if ("deleteSurface" in rc) {
      const { surfaceId } = rc.deleteSurface as { surfaceId: string };
      return { message: { version, deleteSurface: { surfaceId } }, commit: () => this.forgetSurface(surfaceId) };
    }
    if ("updateDataModel" in rc) {
      const update = rc.updateDataModel as { surfaceId: string; path?: string; value: unknown };
      return {
        message: { version, updateDataModel: { ...update, path: update.path ?? "/" } },
        commit: noop,
      };
    }
    if ("updateComponents" in rc) {
      const update = rc.updateComponents as { surfaceId: string; components: Record<string, unknown>[] };
      const translated = translateComponents(update.surfaceId, update.components);
      return {
        message: { version, updateComponents: { surfaceId: update.surfaceId, components: translated.components } },
        commit: () => {
          for (const component of update.components) {
            this.responseActions.delete(actionKey(update.surfaceId, String(component.id)));
          }
          this.record(translated.actions);
        },
      };
    }
    const create = rc.createSurface as {
      surfaceId: string;
      catalogId?: string;
      sendDataModel?: boolean;
      components?: Record<string, unknown>[];
      dataModel?: Record<string, unknown>;
    };
    const translated = create.components
      ? translateComponents(create.surfaceId, create.components)
      : { components: [], actions: [] };
    return {
      message: {
        version,
        createSurface: {
          surfaceId: create.surfaceId,
          catalogId: create.catalogId ?? this.defaultCatalogId,
          ...(create.sendDataModel === undefined ? {} : { sendDataModel: create.sendDataModel }),
          ...(translated.components.length > 0 ? { components: translated.components } : {}),
          ...(create.dataModel === undefined ? {} : { dataModel: create.dataModel }),
        },
      },
      commit: () => {
        this.forgetSurface(create.surfaceId);
        this.record(translated.actions);
      },
    };
  }

  clear(): void {
    this.responseActions.clear();
  }

  private record(actions: readonly RcResponseAction[]): void {
    for (const action of actions) {
      this.responseActions.set(actionKey(action.surfaceId, action.sourceComponentId), action);
    }
  }

  private forgetSurface(surfaceId: string): void {
    for (const [key, action] of this.responseActions) {
      if (action.surfaceId === surfaceId) this.responseActions.delete(key);
    }
  }
}
