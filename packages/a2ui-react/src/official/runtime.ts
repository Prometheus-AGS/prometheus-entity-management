import {
  A2uiMessageListSchema,
  A2uiMessageListWrapperSchema,
  MessageProcessor as OfficialMessageProcessor,
} from "@a2ui/web_core/v0_9";
import type {
  A2uiClientAction,
  A2uiClientCapabilities,
  A2uiClientDataModel,
  A2uiMessage,
  Catalog,
  MessageProcessor,
  SurfaceModel,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import {
  createDenyAllA2uiActionPolicy,
  type A2uiActionDecision,
  type A2uiActionPolicy,
} from "../policy/action-policy.js";
import {
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createPrometheusA2uiCatalog,
} from "./catalog.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";
import {
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  normalizeA2uiV1Message,
  type PrometheusA2uiV1ActionMetadata,
  type PrometheusA2uiV1ActionResponse,
  type PrometheusA2uiV1FunctionCall,
} from "./v1-compat.js";

export type PrometheusA2uiErrorCode =
  | "invalid-message"
  | "unsupported-protocol-version"
  | "component-not-allowed"
  | "runtime-disposed";

export class PrometheusA2uiError extends Error {
  readonly code: PrometheusA2uiErrorCode;
  readonly cause?: unknown;

  constructor(code: PrometheusA2uiErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "PrometheusA2uiError";
    this.code = code;
    this.cause = cause;
  }
}

export type PrometheusA2uiMessageInput =
  | readonly unknown[]
  | { readonly messages: readonly unknown[] };

export interface CreatePrometheusA2uiRuntimeOptions {
  /** Explicit catalogs advertised to and accepted from agents. */
  catalogs?: readonly Catalog<PrometheusA2uiComponentImplementation>[];
  /** Defaults to a deny-all policy; applications must install authority. */
  actionPolicy?: A2uiActionPolicy;
  /** Receives the auditable outcome of every official client action. */
  onActionDecision?: (decision: A2uiActionDecision) => void | Promise<void>;
  /** Receives A2UI v1.0 renderer-to-agent action/function/error messages. */
  onRendererMessage?: (message: PrometheusA2uiRendererMessage) => void | Promise<void>;
  /** Application-owned implementation for v1.0 agent-initiated function calls. */
  onFunctionCall?: (call: PrometheusA2uiV1FunctionCall) => unknown | Promise<unknown>;
}

export type PrometheusA2uiRendererMessage =
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      action: A2uiClientAction & { wantResponse?: boolean; actionId?: string };
    }
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      functionResponse: { functionCallId: string; call: string; value: unknown };
    }
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      error: {
        code: string;
        message: string;
        functionCallId: string;
      };
    };

function parseMessages(input: PrometheusA2uiMessageInput): A2uiMessage[] {
  const parsed = Array.isArray(input)
    ? A2uiMessageListSchema.safeParse(input)
    : A2uiMessageListWrapperSchema.safeParse(input);

  if (!parsed.success) {
    throw new PrometheusA2uiError(
      "invalid-message",
      "Input does not match the official A2UI v0.9 message schema.",
      parsed.error,
    );
  }

  const messages = Array.isArray(parsed.data) ? parsed.data : parsed.data.messages;
  for (const message of messages) {
    if (message.version !== PROMETHEUS_A2UI_PROTOCOL_VERSION) {
      throw new PrometheusA2uiError(
        "unsupported-protocol-version",
        `Expected ${PROMETHEUS_A2UI_PROTOCOL_VERSION}; received ${message.version}.`,
      );
    }
  }
  return messages;
}

/**
 * Thin lifecycle wrapper around the official A2UI v0.9 MessageProcessor.
 * It adds exact-version enforcement, catalog/component allowlisting, policy
 * dispatch, and a React-compatible subscription snapshot—never a second
 * protocol parser or surface model.
 */
export class PrometheusA2uiRuntime {
  readonly processor: MessageProcessor<PrometheusA2uiComponentImplementation>;
  private readonly catalogs: readonly Catalog<PrometheusA2uiComponentImplementation>[];
  private readonly actionPolicy: A2uiActionPolicy;
  private readonly onActionDecision?: CreatePrometheusA2uiRuntimeOptions["onActionDecision"];
  private readonly onRendererMessage?: CreatePrometheusA2uiRuntimeOptions["onRendererMessage"];
  private readonly onFunctionCall?: CreatePrometheusA2uiRuntimeOptions["onFunctionCall"];
  private readonly listeners = new Set<() => void>();
  private readonly subscriptions: Array<{ unsubscribe(): void }> = [];
  private snapshot: readonly SurfaceModel<PrometheusA2uiComponentImplementation>[] = [];
  private disposed = false;
  private actionSequence = 0;
  private readonly surfaceCatalogs = new Map<string, string>();
  private readonly v1Surfaces = new Set<string>();
  private readonly v1Actions = new Map<string, PrometheusA2uiV1ActionMetadata>();
  private readonly pendingActions = new Map<
    string,
    { surfaceId: string; responsePath?: string }
  >();
  private readonly agUiActivitySurfaces = new Map<string, Set<string>>();

  constructor(options: CreatePrometheusA2uiRuntimeOptions = {}) {
    const catalogs = [...(options.catalogs ?? [createPrometheusA2uiCatalog()])];
    if (catalogs.length === 0) {
      throw new Error("At least one allowlisted A2UI catalog is required.");
    }
    if (new Set(catalogs.map((catalog) => catalog.id)).size !== catalogs.length) {
      throw new Error("A2UI catalog ids must be unique.");
    }

    this.catalogs = catalogs;
    this.actionPolicy = options.actionPolicy ?? createDenyAllA2uiActionPolicy();
    this.onActionDecision = options.onActionDecision;
    this.onRendererMessage = options.onRendererMessage;
    this.onFunctionCall = options.onFunctionCall;
    this.processor = new OfficialMessageProcessor(
      catalogs,
      async (action) => {
        const decision = await this.actionPolicy.handle(action);
        await this.onActionDecision?.(decision);
        if (decision.status === "executed") {
          await this.forwardV1Action(decision.action);
        }
      },
      { version: PROMETHEUS_A2UI_PROTOCOL_VERSION },
    );

    const update = () => this.refreshSnapshot();
    this.subscriptions.push(
      this.processor.onSurfaceCreated(update),
      this.processor.onSurfaceDeleted(update),
    );
    this.refreshSnapshot();
  }

  /** Validate and process official v0.9.1 or v1.0 RC messages in order. */
  processMessages(input: PrometheusA2uiMessageInput): void {
    this.assertActive();
    const rawMessages: readonly unknown[] = Array.isArray(input)
      ? input
      : (input as { readonly messages: readonly unknown[] }).messages;
    if (!Array.isArray(rawMessages)) {
      throw new PrometheusA2uiError("invalid-message", "A2UI input must contain messages.");
    }
    const messages: A2uiMessage[] = [];
    const protocolMessages: Array<
      PrometheusA2uiV1FunctionCall | PrometheusA2uiV1ActionResponse
    > = [];
    const nextSurfaceCatalogs = new Map(this.surfaceCatalogs);
    const nextV1Surfaces = new Set(this.v1Surfaces);
    const nextV1Actions = new Map(this.v1Actions);
    const clearSurfaceActions = (surfaceId: string): void => {
      for (const key of nextV1Actions.keys()) {
        if (key.startsWith(`${surfaceId}:`)) nextV1Actions.delete(key);
      }
    };

    try {
      for (const raw of rawMessages) {
        if (
          raw &&
          typeof raw === "object" &&
          (raw as { version?: unknown }).version === PROMETHEUS_A2UI_RC_PROTOCOL_VERSION
        ) {
          const normalized = normalizeA2uiV1Message(
            raw,
            this.catalogs[0]!.id,
            nextSurfaceCatalogs,
          );
          messages.push(...normalized.renderMessages);
          if (normalized.protocolMessage) protocolMessages.push(normalized.protocolMessage);
          if ("createSurface" in (raw as object)) {
            const create = (raw as { createSurface: { surfaceId: string; catalogId?: string } })
              .createSurface;
            nextSurfaceCatalogs.set(
              create.surfaceId,
              create.catalogId ?? this.catalogs[0]!.id,
            );
            nextV1Surfaces.add(create.surfaceId);
            clearSurfaceActions(create.surfaceId);
          } else if ("updateComponents" in (raw as object)) {
            const update = (raw as {
              updateComponents: {
                surfaceId: string;
                components: Array<{ id: string }>;
              };
            }).updateComponents;
            for (const component of update.components) {
              nextV1Actions.delete(`${update.surfaceId}:${component.id}`);
            }
          } else if ("deleteSurface" in (raw as object)) {
            const surfaceId = (raw as { deleteSurface: { surfaceId: string } }).deleteSurface
              .surfaceId;
            nextSurfaceCatalogs.delete(surfaceId);
            nextV1Surfaces.delete(surfaceId);
            clearSurfaceActions(surfaceId);
          }
          for (const metadata of normalized.actions) {
            nextV1Actions.set(
              `${metadata.surfaceId}:${metadata.sourceComponentId}`,
              metadata,
            );
          }
        } else {
          messages.push(...parseMessages([raw]));
        }
      }
    } catch (cause) {
      if (cause instanceof PrometheusA2uiError) throw cause;
      throw new PrometheusA2uiError(
        "invalid-message",
        "Input does not match the supported A2UI v0.9.1 or v1.0 RC schema.",
        cause,
      );
    }

    this.preflight(structuredClone(messages));

    for (const message of messages) {
      this.assertAllowedComponents(message);
      this.processor.processMessages([structuredClone(message)]);
    }
    this.surfaceCatalogs.clear();
    for (const [surfaceId, catalogId] of nextSurfaceCatalogs) {
      this.surfaceCatalogs.set(surfaceId, catalogId);
    }
    this.v1Surfaces.clear();
    for (const surfaceId of nextV1Surfaces) this.v1Surfaces.add(surfaceId);
    this.v1Actions.clear();
    for (const [key, metadata] of nextV1Actions) this.v1Actions.set(key, metadata);
    for (const message of protocolMessages) this.handleV1ProtocolMessage(message);
    this.refreshSnapshot();
  }

  /** Consume the AG-UI 0.0.59 A2UI activity snapshot convention. */
  processAgUiEvent(input: unknown): boolean {
    this.assertActive();
    if (!input || typeof input !== "object") return false;
    const event = input as Record<string, unknown>;
    if (event.type !== "ACTIVITY_SNAPSHOT" || event.activityType !== "a2ui-surface") {
      return false;
    }
    if (typeof event.messageId !== "string" || !event.content || typeof event.content !== "object") {
      throw new PrometheusA2uiError("invalid-message", "Malformed AG-UI A2UI activity.");
    }
    const operations = (event.content as Record<string, unknown>).a2ui_operations;
    if (!Array.isArray(operations)) {
      throw new PrometheusA2uiError(
        "invalid-message",
        "AG-UI A2UI activity omitted content.a2ui_operations.",
      );
    }
    if (event.replace === false && this.agUiActivitySurfaces.has(event.messageId)) {
      return true;
    }
    const surfaces = new Set<string>();
    const normalized = operations.map((operation) => {
      if (!operation || typeof operation !== "object") return operation;
      const message = structuredClone(operation) as Record<string, unknown>;
      if (message.version === "v0.9") message.version = PROMETHEUS_A2UI_PROTOCOL_VERSION;
      for (const key of ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"]) {
        const value = message[key];
        if (value && typeof value === "object") {
          const surfaceId = (value as Record<string, unknown>).surfaceId;
          if (typeof surfaceId === "string") surfaces.add(surfaceId);
        }
      }
      return message;
    });
    const prior = this.agUiActivitySurfaces.get(event.messageId) ?? new Set<string>();
    const deletes = [...prior]
      .filter((surfaceId) => this.getSurface(surfaceId))
      .map((surfaceId) => ({
        version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
        deleteSurface: { surfaceId },
      }));
    this.processMessages([...deletes, ...normalized]);
    this.agUiActivitySurfaces.set(event.messageId, surfaces);
    return true;
  }

  getSurface(id: string): SurfaceModel<PrometheusA2uiComponentImplementation> | undefined {
    this.assertActive();
    return this.processor.model.getSurface(id);
  }

  getSurfaces = (): readonly SurfaceModel<PrometheusA2uiComponentImplementation>[] => this.snapshot;

  getClientCapabilities(options?: { includeInlineCatalogs?: boolean }): A2uiClientCapabilities {
    this.assertActive();
    return this.processor.getClientCapabilities({
      ...options,
      version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
    });
  }

  getClientDataModel(): A2uiClientDataModel | undefined {
    this.assertActive();
    return this.processor.getClientDataModel(PROMETHEUS_A2UI_PROTOCOL_VERSION);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.assertActive();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions.length = 0;
    this.processor.model.dispose();
    this.snapshot = [];
    this.listeners.clear();
    this.pendingActions.clear();
    this.agUiActivitySurfaces.clear();
  }

  private async forwardV1Action(action: A2uiClientAction): Promise<void> {
    if (!this.v1Surfaces.has(action.surfaceId)) return;
    const metadata = this.v1Actions.get(`${action.surfaceId}:${action.sourceComponentId}`);
    const actionId = metadata?.wantResponse
      ? `${action.surfaceId}:${action.sourceComponentId}:${++this.actionSequence}`
      : undefined;
    if (actionId) {
      this.pendingActions.set(actionId, {
        surfaceId: action.surfaceId,
        ...(metadata?.responsePath ? { responsePath: metadata.responsePath } : {}),
      });
    }
    await this.onRendererMessage?.({
      version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
      action: {
        ...action,
        ...(metadata?.wantResponse ? { wantResponse: true, actionId } : {}),
      },
    });
  }

  private handleV1ProtocolMessage(
    message: PrometheusA2uiV1FunctionCall | PrometheusA2uiV1ActionResponse,
  ): void {
    if ("actionResponse" in message) {
      const responseMessage = message as PrometheusA2uiV1ActionResponse;
      const pending = this.pendingActions.get(responseMessage.actionId);
      if (!pending) return;
      this.pendingActions.delete(responseMessage.actionId);
      if (pending.responsePath && "value" in responseMessage.actionResponse) {
        this.processor.processMessages([
          {
            version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
            updateDataModel: {
              surfaceId: pending.surfaceId,
              path: pending.responsePath,
              value: responseMessage.actionResponse.value,
            },
          },
        ]);
      }
      return;
    }

    const functionMessage = message as PrometheusA2uiV1FunctionCall;

    void Promise.resolve()
      .then(async () => {
        if (!this.onFunctionCall) throw new Error("No application function handler is installed.");
        const value = await this.onFunctionCall(functionMessage);
        if (functionMessage.wantResponse !== false) {
          await this.onRendererMessage?.({
            version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
            functionResponse: {
              functionCallId: functionMessage.functionCallId,
              call: functionMessage.callFunction.call,
              value,
            },
          });
        }
      })
      .catch(async (cause: unknown) => {
        if (functionMessage.wantResponse !== false) {
          await this.onRendererMessage?.({
            version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
            error: {
              code: "FUNCTION_FAILED",
              message: cause instanceof Error ? cause.message : String(cause),
              functionCallId: functionMessage.functionCallId,
            },
          });
        }
      });
  }

  private preflight(messages: readonly A2uiMessage[]): void {
    const shadow = new OfficialMessageProcessor(
      [...this.catalogs],
      async () => undefined,
      { version: PROMETHEUS_A2UI_PROTOCOL_VERSION },
    );

    try {
      for (const [surfaceId, surface] of this.processor.model.surfacesMap) {
        shadow.processMessages([
          {
            version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
            createSurface: {
              surfaceId,
              catalogId: surface.catalog.id,
              theme: structuredClone(surface.theme),
              sendDataModel: surface.sendDataModel,
            },
          },
        ]);

        const components = [...surface.componentsModel.entries].map(
          ([id, component]) => ({
            ...structuredClone(component.properties),
            id,
            component: component.type,
          }),
        );
        if (components.length > 0) {
          shadow.processMessages([
            {
              version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
              updateComponents: { surfaceId, components },
            },
          ]);
        }

        const data = surface.dataModel.get("/");
        if (data !== undefined) {
          shadow.processMessages([
            {
              version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
              updateDataModel: {
                surfaceId,
                path: "/",
                value: structuredClone(data),
              },
            },
          ]);
        }
      }

      for (const message of messages) {
        this.assertAllowedComponents(message, shadow);
        shadow.processMessages([message]);
      }
    } finally {
      shadow.model.dispose();
    }
  }

  private assertAllowedComponents(
    message: A2uiMessage,
    processor: MessageProcessor<PrometheusA2uiComponentImplementation> =
      this.processor,
  ): void {
    if (!("updateComponents" in message)) return;
    const surface = processor.model.getSurface(message.updateComponents.surfaceId);
    if (!surface) return; // The official processor emits the canonical state error.

    for (const component of message.updateComponents.components) {
      if (!surface.catalog.components.has(component.component)) {
        throw new PrometheusA2uiError(
          "component-not-allowed",
          `Component is not allowlisted by catalog ${surface.catalog.id}: ${component.component}`,
        );
      }
    }
  }

  private refreshSnapshot(): void {
    if (this.disposed) return;
    const next = [...this.processor.model.surfacesMap.values()];
    const unchanged =
      next.length === this.snapshot.length &&
      next.every((surface, index) => surface === this.snapshot[index]);
    if (unchanged) return;
    this.snapshot = Object.freeze(next);
    for (const listener of this.listeners) listener();
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new PrometheusA2uiError(
        "runtime-disposed",
        "The Prometheus A2UI runtime has been disposed.",
      );
    }
  }
}

export function createPrometheusA2uiRuntime(
  options: CreatePrometheusA2uiRuntimeOptions = {},
): PrometheusA2uiRuntime {
  return new PrometheusA2uiRuntime(options);
}
