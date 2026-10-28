import { MessageProcessor as OfficialMessageProcessor } from "@a2ui/web_core/v0_9";
import type {
  A2uiClientAction,
  A2uiClientCapabilities,
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
import { PROMETHEUS_A2UI_PROTOCOL_VERSION } from "./catalog-core.js";
import { classifyDelta, parseDelta, type ParsedDelta } from "./activity-delta.js";
import { canonicalize, describeOperation, digestOf, parseSurfaceVersions, type SurfaceVersion } from "./activity-keys.js";
import { ActivityLedger } from "./activity-ledger.js";
import { ActionEnvelopeStore } from "./action-envelopes.js";
import { DeltaBuffer, type BufferedDelta, type GiveUpReason } from "./delta-buffer.js";
import {
  buildA2uiForwardedProps,
  type PrometheusA2uiActionEnvelope,
  type PrometheusA2uiForwardedProps,
  type PrometheusA2uiHeldVersions,
  type PrometheusA2uiResyncReason,
  type PrometheusA2uiResyncRequest,
  type PrometheusA2uiResyncSurface,
} from "./forwarded-props.js";
import { planActivity, type ActivityPlan, type LiveSurfaceView } from "./activity-plan.js";
import type { PrometheusA2uiDataConflict } from "./data-reconcile.js";
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
  type PrometheusA2uiProducerFault,
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
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  normalizeA2uiV1Message,
  type PrometheusA2uiV1ActionMetadata,
  type PrometheusA2uiV1ActionResponse,
  type PrometheusA2uiV1FunctionCall,
} from "./v1-compat.js";

import {
  PrometheusA2uiError,
  type CreatePrometheusA2uiRuntimeOptions,
  type PrometheusA2uiMessageInput,
  type PrometheusA2uiRendererMessage,
} from "./runtime-types.js";

/**
 * Thin lifecycle wrapper around the official A2UI v0.9 MessageProcessor. This core
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
  private readonly onFunctionCall?: CreatePrometheusA2uiRuntimeOptions["onFunctionCall"];
  private readonly onProducerFault?: CreatePrometheusA2uiRuntimeOptions["onProducerFault"];
  private readonly onConflict?: CreatePrometheusA2uiRuntimeOptions["onConflict"];
  private readonly onResyncNeeded?: CreatePrometheusA2uiRuntimeOptions["onResyncNeeded"];
  private readonly onActionEnvelope?: CreatePrometheusA2uiRuntimeOptions["onActionEnvelope"];
  private readonly actionEnvelopes = new ActionEnvelopeStore();
  private limits: Readonly<PrometheusA2uiLimits>;
  private readonly listeners = new Set<() => void>();
  private readonly subscriptions: Array<{ unsubscribe(): void }> = [];
  private snapshot: readonly SurfaceModel<Implementation>[] = [];
  private disposed = false;
  private actionSequence = 0;
  private readonly surfaceCatalogs = new Map<string, string>();
  private readonly v1Surfaces = new Set<string>();
  private readonly v1Actions = new Map<string, PrometheusA2uiV1ActionMetadata>();
  private readonly pendingActions = new Map<
    string,
    { surfaceId: string; responsePath?: string }
  >();
  private readonly ledger = new ActivityLedger(() => this.limits);
  private readonly deltaBuffer = new DeltaBuffer(
    () => this.limits,
    (entry, reason) => this.giveUpOnDelta(entry, reason),
  );
  private draining = false;

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
    this.onFunctionCall = options.onFunctionCall;
    this.onProducerFault = options.onProducerFault;
    this.onConflict = options.onConflict;
    this.onResyncNeeded = options.onResyncNeeded;
    this.onActionEnvelope = options.onActionEnvelope;
    this.limits = resolvePrometheusA2uiLimits(DEFAULT_PROMETHEUS_A2UI_LIMITS, options.limits);
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
    const callViolation = findCallViolation(rawMessages, this.limits);
    if (callViolation) this.rejectLimit(callViolation);
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

  /**
   * Consume the AG-UI A2UI activity convention: `ACTIVITY_SNAPSHOT`, activity
   * type `a2ui-surface`, operations in `content.a2ui_operations`. Delivery is
   * idempotent: a redelivered activity changes nothing, and a surface is only
   * ever deleted by an explicit `deleteSurface` operation.
   */
  processAgUiEvent(input: unknown): boolean {
    this.assertActive();
    if (!input || typeof input !== "object") return false;
    const event = input as Record<string, unknown>;
    if (event.type === "MESSAGES_SNAPSHOT") return this.applyMessagesSnapshot(event);
    if (event.type === "ACTIVITY_DELTA") return this.applyDelta(event);
    if (event.type !== "ACTIVITY_SNAPSHOT" || event.activityType !== "a2ui-surface") {
      return false;
    }
    if (typeof event.messageId !== "string" || !event.content || typeof event.content !== "object") {
      throw new PrometheusA2uiError("invalid-message", "Malformed AG-UI A2UI activity.");
    }
    this.applyActivity(
      event.messageId,
      event.content as Record<string, unknown>,
      event.replace === false,
    );
    return true;
  }

  /**
   * A `MESSAGES_SNAPSHOT` that carries activity messages is the complete set of
   * activity messages. Each A2UI activity goes through the same idempotent path
   * as `ACTIVITY_SNAPSHOT`, so a replay of a thread changes nothing already
   * applied. A tracked message the snapshot leaves out is forgotten as a
   * message only: its surfaces, held versions and tombstones stay, because
   * surfaces live until an explicit `deleteSurface`. A snapshot with no
   * activity messages says nothing about them and is not handled.
   */
  private applyMessagesSnapshot(event: Record<string, unknown>): boolean {
    if (!Array.isArray(event.messages)) {
      throw new PrometheusA2uiError("invalid-message", "Malformed AG-UI messages snapshot.");
    }
    const activities = event.messages.filter(
      (message): message is Record<string, unknown> =>
        message !== null &&
        typeof message === "object" &&
        (message as { role?: unknown }).role === "activity",
    );
    if (activities.length === 0) return false;

    const present = new Set<string>();
    for (const message of activities) {
      if (typeof message.id === "string") present.add(message.id);
      if (message.activityType !== "a2ui-surface") continue;
      if (typeof message.id !== "string" || !message.content || typeof message.content !== "object") {
        throw new PrometheusA2uiError("invalid-message", "Malformed AG-UI A2UI activity message.");
      }
      this.applyActivity(message.id, message.content as Record<string, unknown>, false);
    }
    this.ledger.untrackAbsent(present);
    return true;
  }

  /**
   * Plan one activity, apply it through `processMessages` (so limits, schema,
   * catalog checks and atomicity all apply), and only then commit the ledger.
   * A rejected call therefore leaves both the surfaces and the ledger unchanged.
   */
  private applyActivity(
    messageId: string,
    content: Record<string, unknown>,
    ignoreIfKnown: boolean,
  ): void {
    const operations = content.a2ui_operations;
    if (!Array.isArray(operations)) {
      throw new PrometheusA2uiError(
        "invalid-message",
        "AG-UI A2UI activity omitted content.a2ui_operations.",
      );
    }
    if (ignoreIfKnown && this.ledger.hasMessage(messageId)) return;

    const versions = parseSurfaceVersions(content.surfaceVersions);
    if ("problem" in versions) throw new PrometheusA2uiError("invalid-message", versions.problem);
    this.applyOperations(messageId, operations, versions.versions);
  }

  /**
   * `ACTIVITY_DELTA` for an A2UI activity. A delta applies on top of the version
   * it names and produces the next one; see `activity-delta.ts` for the accepted
   * patch subset. Deltas without a version, or using any other operation, are
   * rejected.
   */
  private applyDelta(event: Record<string, unknown>): boolean {
    if (event.activityType !== "a2ui-surface") return false;
    if (typeof event.messageId !== "string") {
      throw new PrometheusA2uiError("invalid-message", "Malformed AG-UI A2UI activity delta.");
    }
    const parsed = parseDelta(event.patch);
    if ("problem" in parsed) throw new PrometheusA2uiError("invalid-message", parsed.problem);
    // The call caps apply before the delta can be buffered: a waiting delta is held
    // memory, and it would otherwise only meet the caps once it was applied.
    const violation = findCallViolation(parsed.delta.operations, this.limits);
    if (violation) this.rejectLimit(violation);
    this.deliverDelta(event.messageId, parsed.delta, false);
    return true;
  }

  /** The versioned state a live surface holds, or `undefined` if it has none. */
  private heldKey(surfaceId: string): SurfaceVersion | undefined {
    return this.processor.model.getSurface(surfaceId) ? this.ledger.heldKey(surfaceId) : undefined;
  }

  /**
   * Apply a delta now if it is next in order, drop it if it is already behind
   * the held version, and otherwise hold it until the missing version arrives.
   */
  private deliverDelta(
    messageId: string,
    delta: ParsedDelta,
    alreadyBuffered: boolean,
  ): "applied" | "waiting" | "stale" {
    const state = classifyDelta(delta, (surfaceId) => this.heldKey(surfaceId));
    if (state.kind === "stale") return "stale";
    if (state.kind === "waiting") {
      if (!alreadyBuffered) {
        const fingerprint = digestOf(
          canonicalize([[...delta.bases], delta.operations]),
        );
        if (!this.deltaBuffer.has(messageId, fingerprint)) {
          this.deltaBuffer.add({ messageId, delta, fingerprint, needs: state.needs });
        }
      }
      return "waiting";
    }
    this.applyOperations(messageId, state.operations, state.versions);
    return "applied";
  }

  private applyOperations(
    messageId: string,
    operations: readonly unknown[],
    versions: ReadonlyMap<string, SurfaceVersion>,
  ): void {
    const normalized = operations.map((operation) => {
      if (!operation || typeof operation !== "object") return operation;
      const message = structuredClone(operation) as Record<string, unknown>;
      if (message.version === "v0.9") message.version = PROMETHEUS_A2UI_PROTOCOL_VERSION;
      return message;
    });
    // Size caps first: planning clones, canonicalizes and digests every operation.
    const violation = findCallViolation(normalized, this.limits);
    if (violation) this.rejectLimit(violation);

    let plan: ActivityPlan | undefined;
    try {
      plan = planActivity({
        messageId,
        operations: normalized,
        versions,
        ledger: this.ledger,
        live: this.liveView(),
      });
      for (const fault of plan.faults) this.onProducerFault?.(fault);
      if (plan.operations.length > 0) this.processMessages(plan.operations);
    } catch (raw) {
      // The producer sent this batch and the runtime refused it, so the
      // surface is stuck at its last version unless the host resyncs.
      const cause =
        raw instanceof RangeError
          ? new PrometheusA2uiError("invalid-message", "Activity content is nested too deeply.", raw)
          : raw;
      this.reportRefused(messageId, plan ?? this.unplannedSurfaces(normalized, versions), cause);
      throw cause;
    }

    for (const [surfaceId, base] of plan.dataBases) this.ledger.commitDataBase(surfaceId, base);
    for (const surface of plan.surfaces) {
      const applied = { key: surface.key, digest: surface.digest };
      if (surface.deleted) {
        this.ledger.recordDeleted(messageId, surface.surfaceId, applied);
      } else {
        this.ledger.recordApplied(messageId, surface.surfaceId, { ...applied, role: surface.role });
      }
    }
    this.ledger.touchMessage(messageId);
    for (const conflict of plan.conflicts) this.onConflict?.(conflict);
    this.drainBuffer();
  }

  /**
   * The version held for each surface with versioned state. A host that
   * reconnects reports these upstream so the agent resends only what is missing.
   */
  getHeldVersions(): PrometheusA2uiHeldVersions {
    this.assertActive();
    return Object.fromEntries(
      [...this.ledger.heldKeys()]
        .filter(([surfaceId]) => this.processor.model.getSurface(surfaceId) !== undefined)
        .map(([surfaceId, key]) => [surfaceId, { epoch: key.epoch, version: key.version }]),
    );
  }

  /** `forwardedProps` for the next run input, reporting the held versions. */
  getResyncForwardedProps(): PrometheusA2uiForwardedProps {
    return buildA2uiForwardedProps({ resync: { held: this.getHeldVersions() } });
  }

  /** A buffered delta timed out or was pushed out: nothing more is coming, so ask for help. */
  private giveUpOnDelta(entry: BufferedDelta, reason: GiveUpReason): void {
    const resyncReason: PrometheusA2uiResyncReason =
      reason === "overflow"
        ? "buffer-overflow"
        : entry.needs.some((need) => need.held === undefined)
          ? "missing-surface"
          : "gap";
    this.requestResync(
      resyncReason,
      entry.messageId,
      entry.needs.map((need) => ({
        surfaceId: need.surfaceId,
        ...(need.held ? { held: need.held } : {}),
        expected: need.expected,
      })),
    );
  }

  /** The surfaces an activity names, for reporting a refusal that happened before planning finished. */
  private unplannedSurfaces(
    operations: readonly unknown[],
    versions: ReadonlyMap<string, SurfaceVersion>,
  ): ActivityPlan {
    const ids = new Set<string>();
    for (const operation of operations) {
      const ref = describeOperation(operation);
      if (ref) ids.add(ref.surfaceId);
    }
    return {
      operations: [],
      faults: [],
      conflicts: [],
      dataBases: new Map(),
      surfaces: [...ids].map((surfaceId) => ({
        surfaceId,
        key: versions.get(surfaceId),
        digest: "",
        role: "updated" as const,
        deleted: false,
      })),
    };
  }

  /** Report a refused batch as a fault (unless a limit already did) and ask for a resync. */
  private reportRefused(messageId: string, plan: ActivityPlan, cause: unknown): void {
    const code = cause instanceof PrometheusA2uiError ? cause.code : "processing-error";
    const surfaceIds = plan.surfaces.map((surface) => surface.surfaceId);
    if (code !== "limit-exceeded") {
      this.onProducerFault?.({
        kind: "batch-refused",
        surfaceIds,
        code,
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
    this.requestResync(
      "refused",
      messageId,
      plan.surfaces.map((surface) => {
        const held = this.heldKey(surface.surfaceId);
        return {
          surfaceId: surface.surfaceId,
          ...(held ? { held } : {}),
          ...(surface.key ? { expected: surface.key } : {}),
        };
      }),
    );
  }

  private requestResync(
    reason: PrometheusA2uiResyncReason,
    messageId: string,
    surfaces: readonly PrometheusA2uiResyncSurface[],
  ): void {
    this.onResyncNeeded?.({ reason, messageId, surfaces, held: this.getHeldVersions() });
  }

  /**
   * After something was applied, apply any buffered delta that is now next in
   * order, repeating until none can progress. A drained delta that fails is
   * already reported through its fault and resync request; its error is not
   * rethrown into the unrelated call that happened to unblock it.
   */
  private drainBuffer(): void {
    if (this.draining) return;
    this.draining = true;
    try {
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (const entry of this.deltaBuffer.pending()) {
          const state = classifyDelta(entry.delta, (surfaceId) => this.heldKey(surfaceId));
          if (state.kind === "waiting") continue;
          this.deltaBuffer.remove(entry);
          progressed = true;
          if (state.kind !== "ready") continue;
          try {
            this.applyOperations(entry.messageId, state.operations, state.versions);
          } catch {
            // Reported by applyOperations before it rethrows.
          }
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private liveView(): LiveSurfaceView {
    return {
      has: (surfaceId) => this.processor.model.getSurface(surfaceId) !== undefined,
      config: (surfaceId) => {
        const surface = this.processor.model.getSurface(surfaceId);
        return surface
          ? {
              catalogId: surface.catalog.id,
              theme: surface.theme,
              sendDataModel: surface.sendDataModel,
            }
          : undefined;
      },
      data: (surfaceId, pointer) => {
        try {
          return this.processor.model.getSurface(surfaceId)?.dataModel.get(pointer);
        } catch {
          // The official model refuses to read keys such as `constructor`; nothing
          // readable is held there, so reconciliation treats the leaf as absent.
          return undefined;
        }
      },
    };
  }

  getSurface(id: string): SurfaceModel<Implementation> | undefined {
    this.assertActive();
    return this.processor.model.getSurface(id);
  }

  /**
   * Export a surface as messages that rebuild it in a fresh runtime: catalog,
   * theme, `sendDataModel`, every component (with its own catalog where it
   * differs), the data model and, for a v1.0 surface, its `wantResponse` and
   * `responsePath` action metadata. Components unreachable from `root` are
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
      v1: this.v1Surfaces.has(surfaceId),
      actions: [...this.v1Actions.values()].filter((action) => action.surfaceId === surfaceId),
      options,
    });
  }

  getSurfaces = (): readonly SurfaceModel<Implementation>[] => this.snapshot;

  getClientCapabilities(options?: { includeInlineCatalogs?: boolean }): A2uiClientCapabilities {
    this.assertActive();
    // web_core 0.12.0 types the result as a version-keyed record; requesting
    // exactly v0.9.1 yields the `{ "v0.9.1": ... }` v0.9 capabilities shape.
    return this.processor.getRendererCapabilities({
      ...options,
      versions: [PROMETHEUS_A2UI_PROTOCOL_VERSION],
    }) as A2uiClientCapabilities;
  }

  getClientDataModel(): A2uiClientDataModel | undefined {
    this.assertActive();
    // With an explicit version, web_core 0.12.0 returns `{ version, surfaces }`
    // echoing that version, which is the v0.9 client data model shape.
    return this.processor.getRendererDataModel(PROMETHEUS_A2UI_PROTOCOL_VERSION) as
      | A2uiClientDataModel
      | undefined;
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
    return summarizeUsage(measureState(this.processor.model.surfacesMap), this.limits, {
      trackedMessages: this.ledger.trackedMessages,
      tombstones: this.ledger.tombstoneCount,
      bufferedDeltas: this.deltaBuffer.size,
    });
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
    this.deltaBuffer.clear();
    this.actionEnvelopes.clear();
    this.ledger.clear();
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
      this.applyOperations(messageId, operations, versions);
      return;
    }
    const surfaceId = this.actionEnvelopes.get(actionId)?.surfaceId;
    const held = surfaceId ? this.heldKey(surfaceId) : undefined;
    this.requestResync(
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
    const held = this.heldKey(action.surfaceId);
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
        try {
          // Through the public path so the limits apply: an action-response
          // value is producer input and would otherwise bypass the data cap.
          this.processMessages([
            {
              version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
              updateDataModel: {
                surfaceId: pending.surfaceId,
                path: pending.responsePath,
                value: responseMessage.actionResponse.value,
              },
            },
          ]);
        } catch (cause) {
          // The outer batch is already applied, so a failed response write must not
          // fail it. A limit rejection reported itself; anything else is reported here.
          const code = cause instanceof PrometheusA2uiError ? cause.code : "processing-error";
          if (code !== "limit-exceeded") {
            this.onProducerFault?.({
              kind: "batch-refused",
              surfaceIds: [pending.surfaceId],
              code,
              message: cause instanceof Error ? cause.message : String(cause),
            });
          }
        }
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
    const shadow = new OfficialMessageProcessor<Implementation>(
      [...this.catalogs],
      async () => undefined,
      { version: PROMETHEUS_A2UI_PROTOCOL_VERSION },
    );

    try {
      seedShadowProcessor(shadow, this.processor.model.surfacesMap);

      for (const message of messages) {
        this.assertAllowedComponents(message, shadow);
        shadow.processMessages([message]);
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

  private assertAllowedComponents(
    message: A2uiMessage,
    processor: MessageProcessor<Implementation> =
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
