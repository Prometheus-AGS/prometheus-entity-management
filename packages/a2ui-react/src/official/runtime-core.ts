import {
  MessageProcessor as OfficialMessageProcessor,
  extractEnvelopeErrorContext,
  mapErrorToRendererMessage,
} from "@a2ui/web_core/v0_9";
import type {
  A2uiClientAction,
  A2uiClientDataModel,
  A2uiMessage,
  Catalog,
  ComponentApi,
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
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
  type PrometheusA2uiProtocolVersion,
} from "./catalog-core.js";
import { RcInputShim, isRcEnvelope } from "./rc-shim.js";
import { ActionEnvelopeStore } from "./action-envelopes.js";
import { AgUiActivityProcessor } from "./agui-activity.js";
import {
  buildA2uiForwardedProps,
  type PrometheusA2uiActionEnvelope,
  type PrometheusA2uiForwardedProps,
  type PrometheusA2uiHeldVersions,
} from "./forwarded-props.js";
import {
  findCallViolation,
  findStateViolation,
  measureState,
  summarizeUsage,
  type LimitViolation,
} from "./limit-checks.js";
import {
  DEFAULT_PROMETHEUS_A2UI_LIMITS,
  resolvePrometheusA2uiLimits,
  type PrometheusA2uiLimitFault,
  type PrometheusA2uiLimits,
  type PrometheusA2uiLimitUsage,
} from "./limits.js";
import { parseMessages } from "./parse-messages.js";
import { parseStaleActionRejection } from "./stale-action.js";
import { uuidv7 } from "./uuid.js";
import { seedShadowProcessor } from "./shadow-seed.js";
import {
  exportSurface,
  type PrometheusA2uiSurfaceExport,
  type SurfaceExportOptions,
} from "./surface-export.js";
import {
  isV1Envelope,
  isV1FunctionMessage,
  isV1Surface,
  parseV1Message,
  type PrometheusA2uiV1Message,
} from "./v1-messages.js";

import {
  PrometheusA2uiError,
  toPrometheusA2uiError,
  type PrometheusA2uiRendererCapabilities,
  type PrometheusA2uiAgentFunctionCall,
  type PrometheusA2uiAgentFunctionOptions,
  type PrometheusA2uiRendererMessage,
  type CreatePrometheusA2uiRuntimeOptions,
  type PrometheusA2uiMessageInput,
} from "./runtime-types.js";

/** A message the official processor accepts: v0.9.1 or A2UI 1.0. */
type ProcessorMessage = A2uiMessage | PrometheusA2uiV1Message;

/**
 * Thin lifecycle wrapper around the official A2UI MessageProcessor. This core
 * has no renderer and no default catalog; `PrometheusA2uiRuntime` adds the React
 * one and the headless entry adds a renderer-free one.
 *
 * It adds exact-version enforcement, catalog/component allowlisting, policy
 * dispatch, and a React-compatible subscription snapshot—never a second
 * protocol parser or surface model.
 */
export class PrometheusA2uiRuntimeCore<Implementation extends ComponentApi> {
  readonly processor: MessageProcessor<Implementation>;
  private readonly catalogs: readonly Catalog<Implementation>[];
  private readonly actionPolicy: A2uiActionPolicy;
  private readonly onActionDecision?: CreatePrometheusA2uiRuntimeOptions["onActionDecision"];
  private readonly onRendererMessage?: CreatePrometheusA2uiRuntimeOptions["onRendererMessage"];
  private readonly onProducerFault?: CreatePrometheusA2uiRuntimeOptions["onProducerFault"];
  private readonly onActionEnvelope?: CreatePrometheusA2uiRuntimeOptions["onActionEnvelope"];
  private readonly actionEnvelopes = new ActionEnvelopeStore();
  private limits: Readonly<PrometheusA2uiLimits>;
  private readonly listeners = new Set<() => void>();
  private readonly subscriptions: Array<{ unsubscribe(): void }> = [];
  private snapshot: readonly SurfaceModel<Implementation>[] = [];
  /** Per-surface `onError` forwarding for 1.0 surfaces, keyed by surface id. */
  private readonly surfaceErrorSubscriptions = new Map<string, { unsubscribe(): void }>();
  /** Non-zero while `processMessages` drives the processor; `reportV1Failure` reports those errors. */
  private processingDepth = 0;
  private disposed = false;
  private readonly activity: AgUiActivityProcessor;
  /** Present only with `acceptReleaseCandidateInput`. */
  private readonly rcShim?: RcInputShim;

  constructor(options: CreatePrometheusA2uiRuntimeOptions<Implementation>) {
    const catalogs = [...(options.catalogs ?? [])];
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
    this.onProducerFault = options.onProducerFault;
    this.onActionEnvelope = options.onActionEnvelope;
    this.limits = resolvePrometheusA2uiLimits(DEFAULT_PROMETHEUS_A2UI_LIMITS, options.limits);
    this.activity = new AgUiActivityProcessor({
      limits: () => this.limits,
      processMessages: (messages) => this.processMessages(messages),
      getSurface: (surfaceId) => this.processor.model.getSurface(surfaceId),
      rejectLimit: (violation) => this.rejectLimit(violation),
      onProducerFault: options.onProducerFault,
      onConflict: options.onConflict,
      onResyncNeeded: options.onResyncNeeded,
    });
    if (options.acceptReleaseCandidateInput) {
      const v1Catalog = catalogs.find(
        (catalog) => catalog.protocolVersion === PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
      );
      if (!v1Catalog) {
        throw new Error("acceptReleaseCandidateInput needs an A2UI 1.0 catalog.");
      }
      this.rcShim = new RcInputShim(v1Catalog.id);
    }
    this.processor = new OfficialMessageProcessor(
      catalogs,
      async (action) => {
        const decision = await this.actionPolicy.handle(action);
        await this.onActionDecision?.(decision);
        if (decision.status === "executed") {
          await this.forwardV1Action(decision.action);
          await this.emitActionEnvelope(decision.action);
        }
      },
      {
        version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
        // 1.0 renderer-to-agent traffic from the official RPC handler:
        // `rendererFunctionResponse` and `callAgentFunction`.
        outboundListener: (message) => this.sendRendererMessage(message as PrometheusA2uiRendererMessage),
      },
    );

    const update = () => this.refreshSnapshot();
    this.subscriptions.push(
      this.processor.onSurfaceCreated((surface) => {
        this.forwardSurfaceErrors(surface as SurfaceModel<Implementation>);
        update();
      }),
      this.processor.onSurfaceDeleted((surfaceId) => {
        this.surfaceErrorSubscriptions.get(surfaceId)?.unsubscribe();
        this.surfaceErrorSubscriptions.delete(surfaceId);
        update();
      }),
    );
    this.refreshSnapshot();
  }

  /**
   * Validate and process official A2UI messages in order: v0.9.1 envelopes and
   * A2UI 1.0 envelopes (`version: "1.0"`). 1.0 envelopes go to the official
   * processor's own 1.0 adapter unchanged, after `@`-prefixed component
   * envelope keys are translated. Surface state messages are applied atomically
   * (a shadow preflight first); 1.0 function messages then run in the official
   * processor's RPC handler.
   */
  processMessages(input: PrometheusA2uiMessageInput): void {
    this.assertActive();
    const rawMessages: readonly unknown[] = Array.isArray(input)
      ? input
      : (input as { readonly messages: readonly unknown[] }).messages;
    if (!Array.isArray(rawMessages)) {
      throw new PrometheusA2uiError("invalid-message", "A2UI input must contain messages.");
    }
    const callViolation = findCallViolation(rawMessages, this.limits);
    if (callViolation) this.rejectLimit(callViolation);
    const stateMessages: ProcessorMessage[] = [];
    const functionMessages: PrometheusA2uiV1Message[] = [];
    // Every message in input order: a function message sees the state the messages before it built.
    const ordered: Array<{ readonly fn: boolean; readonly message: ProcessorMessage | PrometheusA2uiV1Message }> = [];
    const rcCommits: Array<() => void> = [];
    // The message being parsed or applied, so a refusal is reported against the envelope that failed.
    let failing: unknown;

    try {
      for (const raw of rawMessages) {
        failing = raw;
        if (isRcEnvelope(raw)) {
          if (!this.rcShim) {
            throw new PrometheusA2uiError(
              "unsupported-protocol-version",
              'A2UI 1.0 release-candidate input ("v1.0") is accepted only with acceptReleaseCandidateInput.',
            );
          }
          const translation = this.rcShim.translate(raw);
          rcCommits.push(() => translation.commit());
          const message = parseV1Message(translation.message);
          const fn = isV1FunctionMessage(message);
          if (fn) functionMessages.push(message);
          else stateMessages.push(message);
          ordered.push({ fn, message });
        } else if (isV1Envelope(raw)) {
          const message = parseV1Message(raw);
          const fn = isV1FunctionMessage(message);
          if (fn) functionMessages.push(message);
          else stateMessages.push(message);
          ordered.push({ fn, message });
        } else {
          for (const message of parseMessages([raw])) {
            stateMessages.push(message);
            ordered.push({ fn: false, message });
          }
        }
      }
    } catch (cause) {
      const error =
        cause instanceof PrometheusA2uiError
          ? cause
          : new PrometheusA2uiError("invalid-message", "Input does not match the supported A2UI v0.9.1 or 1.0 schema.", cause);
      // A refused 1.0 batch is reported to the agent even when it fails before parsing completes.
      this.reportV1Failure((failing !== undefined ? [failing] : rawMessages) as readonly ProcessorMessage[], error);
      throw error;
    }

    this.processingDepth += 1;
    failing = undefined;
    try {
      this.preflight(structuredClone(stateMessages));

      for (const { fn, message } of ordered) {
        failing = message;
        if (!fn) this.assertAllowedComponents(message as ProcessorMessage);
        this.processor.processMessages([structuredClone(message)] as never);
      }
    } catch (cause) {
      // Official processor errors carry the A2UI error code; keep it.
      const error = toPrometheusA2uiError(cause);
      // Preflight failures have no single failing message: report against the batch.
      this.reportV1Failure(failing !== undefined ? [failing as ProcessorMessage] : [...stateMessages, ...functionMessages], error);
      throw error;
    } finally {
      this.processingDepth -= 1;
      this.refreshSnapshot();
    }
    for (const commit of rcCommits) commit();
  }

  /**
   * Consume the AG-UI A2UI activity convention: `ACTIVITY_SNAPSHOT`, activity
   * type `a2ui-surface`, operations in `content.a2ui_operations`, plus
   * `ACTIVITY_DELTA` and `MESSAGES_SNAPSHOT`. Delivery is idempotent: a
   * redelivered activity changes nothing, and a surface is only ever deleted by
   * an explicit `deleteSurface` operation. See `agui-activity.ts`.
   */
  processAgUiEvent(input: unknown): boolean {
    this.assertActive();
    return this.activity.handleEvent(input);
  }

  /**
   * The version held for each surface with versioned state. A host that
   * reconnects reports these upstream so the agent resends only what is missing.
   */
  getHeldVersions(): PrometheusA2uiHeldVersions {
    this.assertActive();
    return this.activity.heldVersions();
  }

  /** `forwardedProps` for the next run input, reporting the held versions. */
  getResyncForwardedProps(): PrometheusA2uiForwardedProps {
    return buildA2uiForwardedProps({ resync: { held: this.getHeldVersions() } });
  }

  getSurface(id: string): SurfaceModel<Implementation> | undefined {
    this.assertActive();
    return this.processor.model.getSurface(id);
  }

  /**
   * Export a surface as messages that rebuild it in a fresh runtime, in the
   * protocol version it was created with: catalog, `sendDataModel`, every
   * component (with its own catalog where it differs), the data model and, for
   * a v0.9.1 surface, its theme (A2UI 1.0 has none). Components unreachable from `root` are
   * pruned and reported in `orphans`; pass `{ pruneOrphans: false }` to keep
   * them. Exporting the rebuilt surface again yields the same messages.
   */
  exportSurfaceMessages(
    surfaceId: string,
    options: SurfaceExportOptions = {},
  ): PrometheusA2uiSurfaceExport {
    this.assertActive();
    const surface = this.processor.model.getSurface(surfaceId);
    if (!surface) {
      throw new PrometheusA2uiError("surface-not-found", `No A2UI surface is held for ${surfaceId}.`);
    }
    return exportSurface({
      surfaceId,
      surface,
      v1: isV1Surface(surface),
      options,
    });
  }

  getSurfaces = (): readonly SurfaceModel<Implementation>[] => this.snapshot;

  /**
   * Renderer capabilities, keyed by protocol version, for every protocol version
   * the runtime's catalogs declare (`v0.9.1`, and `1.0` with a 1.0 catalog).
   * The 1.0 entry carries `supportedCatalogIds` and, when requested, the inline
   * catalogs.
   */
  getClientCapabilities(options?: { includeInlineCatalogs?: boolean }): PrometheusA2uiRendererCapabilities {
    this.assertActive();
    const versions = [...new Set(this.catalogs.map((catalog) => catalog.protocolVersion))].filter(
      (version): version is string => typeof version === "string",
    );
    return this.processor.getRendererCapabilities({
      ...options,
      versions: versions.length > 0 ? versions : [PROMETHEUS_A2UI_PROTOCOL_VERSION],
    });
  }

  /**
   * The data model of surfaces created with `sendDataModel`, in the shape of a
   * protocol version: v0.9.1 (`{ version, surfaces }`, the default) or 1.0
   * (`a2uiRendererDataModel`).
   */
  getClientDataModel(version?: typeof PROMETHEUS_A2UI_PROTOCOL_VERSION): A2uiClientDataModel | undefined;
  getClientDataModel(version: typeof PROMETHEUS_A2UI_V1_PROTOCOL_VERSION): Record<string, unknown> | undefined;
  getClientDataModel(version: PrometheusA2uiProtocolVersion): A2uiClientDataModel | Record<string, unknown> | undefined;
  getClientDataModel(
    version: PrometheusA2uiProtocolVersion = PROMETHEUS_A2UI_PROTOCOL_VERSION,
  ): A2uiClientDataModel | Record<string, unknown> | undefined {
    this.assertActive();
    return this.processor.getRendererDataModel(version) as A2uiClientDataModel | Record<string, unknown> | undefined;
  }

  /**
   * Change some limits while the runtime is running. Applies to future calls
   * only and never evicts a surface already held. A cap lowered below what is
   * held refuses calls that would grow past it, but still allows calls that
   * shrink or hold steady, so the host can get back under the cap.
   */
  setLimits(overrides: Partial<PrometheusA2uiLimits>): void {
    this.assertActive();
    this.limits = resolvePrometheusA2uiLimits(this.limits, overrides);
  }

  /** Held usage against each state limit, for hosts that show how close they are. */
  getLimitUsage(): PrometheusA2uiLimitUsage {
    this.assertActive();
    return summarizeUsage(
      measureState(this.processor.model.surfacesMap),
      this.limits,
      this.activity.usage(),
    );
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
    for (const subscription of this.surfaceErrorSubscriptions.values()) subscription.unsubscribe();
    this.surfaceErrorSubscriptions.clear();
    // Disposes the surfaces and rejects pending RPC calls, so no
    // callAgentFunction promise outlives the runtime.
    this.processor.dispose();
    this.rcShim?.clear();
    this.snapshot = [];
    this.listeners.clear();
    this.activity.clear();
    this.actionEnvelopes.clear();
  }

  /**
   * Apply what a server returned when it rejected an action as stale: the
   * operations since the version the client held, with the versions they bring
   * each surface to. They go through the same ordering and limits as any
   * activity, so a repeated rejection changes nothing. A rejection that carries
   * no operations cannot repair the surface, so it requests a resync. The wire
   * shape is documented in `stale-action.ts`.
   */
  applyStaleActionRejection(input: unknown): void {
    this.assertActive();
    const parsed = parseStaleActionRejection(input);
    if ("problem" in parsed) throw new PrometheusA2uiError("invalid-message", parsed.problem);
    const { actionId, operations, versions } = parsed.rejection;
    const messageId = `stale-action:${actionId}`;
    if (operations.length > 0) {
      this.activity.applyOperations(messageId, operations, versions);
      return;
    }
    const surfaceId = this.actionEnvelopes.get(actionId)?.surfaceId;
    const held = surfaceId ? this.activity.heldKey(surfaceId) : undefined;
    this.activity.requestResync(
      "stale-action",
      messageId,
      surfaceId ? [{ surfaceId, ...(held ? { held } : {}) }] : [],
    );
  }

  /**
   * Resend an executed action under the same `actionId`. The runtime owns the
   * retry: a host that resent on its own would mint a new id and defeat the
   * server's idempotency. The resent envelope is the original, so its
   * `heldVersion` and data model are those from when the action fired. Returns
   * `false` when the id is unknown (never emitted here, or forgotten past the
   * retained-action bound) or no `onActionEnvelope` handler is installed.
   */
  async retryAction(actionId: string): Promise<boolean> {
    this.assertActive();
    const envelope = this.actionEnvelopes.get(actionId);
    if (!envelope || !this.onActionEnvelope) return false;
    await this.onActionEnvelope(envelope);
    return true;
  }

  /**
   * Hand an executed action to the host as an envelope for the agent, for
   * v0.9.1 and v1.0 surfaces alike. The id is minted once per interaction and
   * kept by `retryAction`. The raw A2UI action is not modified; the v1.0
   * correlation id some actions carry is a separate id with a separate job.
   */
  private async emitActionEnvelope(action: A2uiClientAction): Promise<void> {
    if (!this.onActionEnvelope) return;
    const held = this.activity.heldKey(action.surfaceId);
    const surface = this.processor.model.getSurface(action.surfaceId);
    const actionId = uuidv7();
    const envelope: PrometheusA2uiActionEnvelope = {
      actionId,
      surfaceId: action.surfaceId,
      forwardedProps: buildA2uiForwardedProps({
        action: {
          userAction: action,
          actionId,
          ...(held ? { heldVersion: { epoch: held.epoch, version: held.version } } : {}),
          ...(surface?.sendDataModel ? { dataModel: this.getClientDataModel() } : {}),
        },
      }),
    };
    this.actionEnvelopes.retain(envelope);
    await this.onActionEnvelope(envelope);
  }

  /**
   * Ask the agent to run a function (`callAgentFunction`) and resolve with its
   * `agentFunctionResponse`. Needs `onRendererMessage` to reach the agent, and
   * the agent's answer fed back through `processMessages`. With `writeTo`, the
   * answer is written into the surface's data model under the resource limits.
   */
  async callAgentFunction<Result = unknown>(
    surfaceId: string,
    call: PrometheusA2uiAgentFunctionCall,
    options: PrometheusA2uiAgentFunctionOptions = {},
  ): Promise<Result> {
    this.assertActive();
    const value = await this.processor.callAgentFunction<Result>(
      surfaceId,
      {
        "@call": call.call,
        ...(call.args === undefined ? {} : { args: call.args }),
        ...(call.catalogId === undefined ? {} : { catalogId: call.catalogId }),
      } as never,
      options.timeoutMs === undefined ? undefined : { timeoutMs: options.timeoutMs },
    );
    if (options.writeTo !== undefined && !this.disposed) {
      this.writeAgentAnswer(surfaceId, options.writeTo, value);
    }
    return value;
  }

  /**
   * Write an agent's answer through the public path so the limits apply. The
   * call that produced it already succeeded, so a failed write must not fail
   * it: a limit rejection reports itself, anything else is reported here.
   */
  private writeAgentAnswer(surfaceId: string, path: string, value: unknown): void {
    try {
      this.processMessages([
        { version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION, updateDataModel: { surfaceId, path, value } },
      ]);
    } catch (cause) {
      const code = cause instanceof PrometheusA2uiError ? cause.code : "processing-error";
      if (code !== "limit-exceeded") {
        this.onProducerFault?.({
          kind: "batch-refused",
          surfaceIds: [surfaceId],
          code,
          message: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }
  }

  /**
   * An executed action on a 1.0 surface goes to the agent as a 1.0 `action`
   * message, or, for a response-aware RC action recorded by the RC shim, as a
   * `callAgentFunction` whose answer is written at the recorded path (D2a).
   */
  private async forwardV1Action(action: A2uiClientAction): Promise<void> {
    const surface = this.processor.model.getSurface(action.surfaceId);
    if (!surface || !isV1Surface(surface)) return;
    const responseAction = this.rcShim?.responseAction(action.surfaceId, action.sourceComponentId);
    if (responseAction) {
      void this.callAgentFunction(
        action.surfaceId,
        { call: action.name, args: action.context },
        responseAction.responsePath === undefined ? {} : { writeTo: responseAction.responsePath },
      ).catch((cause: unknown) => {
        if (this.disposed) return; // Rejected by dispose(); nothing to report.
        this.onProducerFault?.({
          kind: "batch-refused",
          surfaceIds: [action.surfaceId],
          code: "processing-error",
          message: cause instanceof Error ? cause.message : String(cause),
        });
      });
      return;
    }
    const { catalogId: _catalogId, ...wire } = action as A2uiClientAction & { catalogId?: string };
    await this.sendRendererMessage({ version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION, action: wire } as never);
  }

  /**
   * Send a 1.0 `error` for errors a 1.0 surface raises outside message
   * processing, such as a failed function call in an action
   * (`EXPRESSION_ERROR`). The official processor only emits these on the
   * surface; the renderer must report them to the agent. Errors raised while
   * `processMessages` runs are reported once, by `reportV1Failure`.
   */
  private forwardSurfaceErrors(surface: SurfaceModel<Implementation>): void {
    if (!isV1Surface(surface)) return;
    const subscription = surface.onError.subscribe((error) => {
      if (this.processingDepth > 0 || !this.onRendererMessage) return;
      const { code, message, path } = error as { code?: unknown; message?: unknown; path?: unknown };
      this.reportToAgent({
        version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
        error: {
          code: typeof code === "string" ? code : "EXPRESSION_ERROR",
          message: typeof message === "string" ? message : "An error occurred on the surface.",
          surfaceId: surface.id,
          ...(typeof path === "string" ? { path } : {}),
        },
      } as PrometheusA2uiRendererMessage);
    });
    this.surfaceErrorSubscriptions.get(surface.id)?.unsubscribe();
    this.surfaceErrorSubscriptions.set(surface.id, subscription);
  }

  /** Send a 1.0 `error` for a refused call that carried a 1.0 message, so the agent can repair it. */
  private reportV1Failure(messages: readonly ProcessorMessage[], error: unknown): void {
    const first = messages.find((message) => isV1Envelope(message));
    if (!first || !this.onRendererMessage) return;
    try {
      const cause = error instanceof PrometheusA2uiError && error.cause instanceof Error ? error.cause : error;
      const rendererError = mapErrorToRendererMessage(
        cause instanceof Error ? cause : new Error(String(cause)),
        extractEnvelopeErrorContext(first, PROMETHEUS_A2UI_V1_PROTOCOL_VERSION),
      );
      this.reportToAgent(rendererError as PrometheusA2uiRendererMessage);
    } catch {
      // Reporting must never mask the original error.
    }
  }

  private async sendRendererMessage(message: PrometheusA2uiRendererMessage): Promise<void> {
    if (this.disposed) return;
    await this.onRendererMessage?.(message);
  }

  /**
   * Fire-and-forget delivery of an error report. The error itself is already
   * thrown to the caller or raised on the surface; a transport that rejects
   * while reporting it must not become an unhandled rejection.
   */
  private reportToAgent(message: PrometheusA2uiRendererMessage): void {
    this.sendRendererMessage(message).catch(() => undefined);
  }

  private preflight(messages: readonly ProcessorMessage[]): void {
    const shadow = new OfficialMessageProcessor<Implementation>(
      [...this.catalogs],
      async () => undefined,
      { version: PROMETHEUS_A2UI_PROTOCOL_VERSION },
    );

    try {
      seedShadowProcessor(shadow, this.processor.model.surfacesMap);

      for (const message of messages) {
        this.assertAllowedComponents(message, shadow);
        shadow.processMessages([message] as never);
      }

      // Limits are checked on the state this call WOULD produce, measured on the
      // shadow, so a rejection happens before the live processor is touched.
      const stateViolation = findStateViolation(
        measureState(shadow.model.surfacesMap),
        this.limits,
        () => measureState(this.processor.model.surfacesMap),
      );
      if (stateViolation) this.rejectLimit(stateViolation);
    } finally {
      shadow.model.dispose();
    }
  }

  /** Report a producer fault and refuse the call; every surface stays unchanged. */
  private rejectLimit(violation: LimitViolation): never {
    const fault: PrometheusA2uiLimitFault = { kind: "limit-exceeded", ...violation };
    this.onProducerFault?.(fault);
    const where = violation.surfaceId === undefined ? "" : ` on surface ${violation.surfaceId}`;
    throw new PrometheusA2uiError(
      "limit-exceeded",
      `A2UI limit ${violation.limit} exceeded${where}: attempted ${violation.attempted}, maximum ${violation.max}.`,
    );
  }

  /**
   * Refuse components the resolved catalog does not allow, with this package's
   * `component-not-allowed` code. A 1.0 component resolves to the catalog it
   * names, else to its surface's default catalog; an unresolvable catalog is
   * left to the official processor, which emits the canonical catalog error.
   */
  private assertAllowedComponents(
    message: ProcessorMessage,
    processor: MessageProcessor<Implementation> = this.processor,
  ): void {
    const holder =
      "updateComponents" in message
        ? message.updateComponents
        : "createSurface" in message
          ? (message.createSurface as { surfaceId: string; catalogId?: string; components?: unknown })
          : undefined;
    if (!holder || !Array.isArray((holder as { components?: unknown }).components)) return;
    const surface = processor.model.getSurface(holder.surfaceId);
    const createCatalogId =
      "createSurface" in message ? (holder as { catalogId?: string }).catalogId : undefined;
    const fallback =
      surface?.defaultCatalog ??
      (createCatalogId === undefined ? undefined : this.catalogs.find((c) => c.id === createCatalogId));

    for (const component of (holder as { components: Array<{ component: string; catalogId?: string }> })
      .components) {
      const catalog =
        component.catalogId === undefined
          ? fallback
          : this.catalogs.find((candidate) => candidate.id === component.catalogId);
      if (!catalog) continue;
      if (!catalog.components.has(component.component)) {
        throw new PrometheusA2uiError(
          "component-not-allowed",
          `Component is not allowlisted by catalog ${catalog.id}: ${component.component}`,
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
