import {
  A2uiMessageListSchema,
  A2uiMessageListWrapperSchema,
  MessageProcessor as OfficialMessageProcessor,
} from "@a2ui/web_core/v0_9";
import type {
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
}

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
  private readonly listeners = new Set<() => void>();
  private readonly subscriptions: Array<{ unsubscribe(): void }> = [];
  private snapshot: readonly SurfaceModel<PrometheusA2uiComponentImplementation>[] = [];
  private disposed = false;

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
    this.processor = new OfficialMessageProcessor(
      catalogs,
      async (action) => {
        const decision = await this.actionPolicy.handle(action);
        await this.onActionDecision?.(decision);
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

  /** Validate and process official v0.9.1 messages in order. */
  processMessages(input: PrometheusA2uiMessageInput): void {
    this.assertActive();
    const messages = parseMessages(input);
    this.preflight(structuredClone(messages));

    for (const message of messages) {
      this.assertAllowedComponents(message);
      this.processor.processMessages([structuredClone(message)]);
    }
    this.refreshSnapshot();
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
