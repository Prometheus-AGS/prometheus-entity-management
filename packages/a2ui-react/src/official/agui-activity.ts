import type { ComponentApi, SurfaceModel } from "@a2ui/web_core/v0_9" with {
  "resolution-mode": "import",
};
import { PROMETHEUS_A2UI_PROTOCOL_VERSION } from "./catalog-core.js";
import { classifyDelta, parseDelta, type ParsedDelta } from "./activity-delta.js";
import { canonicalize, describeOperation, digestOf, parseSurfaceVersions, type SurfaceVersion } from "./activity-keys.js";
import { ActivityLedger } from "./activity-ledger.js";
import { DeltaBuffer, type BufferedDelta, type GiveUpReason } from "./delta-buffer.js";
import type {
  PrometheusA2uiHeldVersions,
  PrometheusA2uiResyncReason,
  PrometheusA2uiResyncSurface,
} from "./forwarded-props.js";
import { planActivity, type ActivityPlan, type LiveSurfaceView } from "./activity-plan.js";
import { findCallViolation, type LimitViolation } from "./limit-checks.js";
import type { PrometheusA2uiLimits } from "./limits.js";
import { PrometheusA2uiError, type CreatePrometheusA2uiRuntimeOptions } from "./runtime-types.js";
import { defaultCatalogIdOf, isV1Surface } from "./v1-messages.js";

/** How many failed lifecycle message ids are remembered for idempotent redelivery. */
const MAX_REPORTED_FAILURES = 256;

/** What the activity transport needs from the runtime core that owns it. */
export interface AgUiActivityHost {
  limits(): Readonly<PrometheusA2uiLimits>;
  /** Apply planned A2UI messages through the core's full validation path. */
  processMessages(messages: readonly unknown[]): void;
  getSurface(surfaceId: string): SurfaceModel<ComponentApi> | undefined;
  rejectLimit(violation: LimitViolation): never;
  onProducerFault?: CreatePrometheusA2uiRuntimeOptions["onProducerFault"];
  onConflict?: CreatePrometheusA2uiRuntimeOptions["onConflict"];
  onResyncNeeded?: CreatePrometheusA2uiRuntimeOptions["onResyncNeeded"];
}

/**
 * The AG-UI side of the runtime: activity snapshots, versioned deltas, the
 * delivery ledger, the delta buffer and resync requests. Every A2UI message it
 * applies goes through the host's `processMessages`, so limits, schema, catalog
 * checks and atomicity are those of direct input.
 */
export class AgUiActivityProcessor {
  private readonly ledger: ActivityLedger;
  private readonly deltaBuffer: DeltaBuffer;
  private draining = false;
  /** Lifecycle messages already reported as failed; bounded so redelivery stays idempotent without growing forever. */
  private readonly reportedFailures = new Set<string>();

  constructor(private readonly host: AgUiActivityHost) {
    this.ledger = new ActivityLedger(() => host.limits());
    this.deltaBuffer = new DeltaBuffer(
      () => host.limits(),
      (entry, reason) => this.giveUpOnDelta(entry, reason),
    );
  }

  /**
   * Consume the AG-UI A2UI activity convention: `ACTIVITY_SNAPSHOT`, activity
   * type `a2ui-surface`, operations in `content.a2ui_operations`. Delivery is
   * idempotent: a redelivered activity changes nothing, and a surface is only
   * ever deleted by an explicit `deleteSurface` operation.
   */
  handleEvent(input: unknown): boolean {
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
      if (typeof content.status === "string") {
        this.applyLifecycle(messageId, content.status);
        return;
      }
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
   * A lifecycle activity (`content.status` without `a2ui_operations`), which
   * `@ag-ui/a2ui-middleware` sends on the same `a2ui-surface` activity type
   * while it builds (`building`), retries (`retrying`) or gives up
   * (`failed`). It carries no operations and changes no surface. A `failed`
   * one is reported once per message as a `producer-failed` resync request,
   * so the host can ask the agent to try again.
   */
  private applyLifecycle(messageId: string, status: string): void {
    if (status !== "failed" || this.reportedFailures.has(messageId)) return;
    this.reportedFailures.add(messageId);
    if (this.reportedFailures.size > MAX_REPORTED_FAILURES) {
      const oldest = this.reportedFailures.values().next().value;
      if (oldest !== undefined) this.reportedFailures.delete(oldest);
    }
    this.requestResync("producer-failed", messageId, []);
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
    const violation = findCallViolation(parsed.delta.operations, this.host.limits());
    if (violation) this.host.rejectLimit(violation);
    this.deliverDelta(event.messageId, parsed.delta, false);
    return true;
  }

  /** The versioned state a live surface holds, or `undefined` if it has none. */
  heldKey(surfaceId: string): SurfaceVersion | undefined {
    return this.host.getSurface(surfaceId) ? this.ledger.heldKey(surfaceId) : undefined;
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

  applyOperations(
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
    const violation = findCallViolation(normalized, this.host.limits());
    if (violation) this.host.rejectLimit(violation);

    let plan: ActivityPlan | undefined;
    try {
      plan = planActivity({
        messageId,
        operations: normalized,
        versions,
        ledger: this.ledger,
        live: this.liveView(),
      });
      for (const fault of plan.faults) this.host.onProducerFault?.(fault);
      if (plan.operations.length > 0) this.host.processMessages(plan.operations);
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
    for (const conflict of plan.conflicts) this.host.onConflict?.(conflict);
    this.drainBuffer();
  }

  /**
   * The version held for each surface with versioned state. A host that
   * reconnects reports these upstream so the agent resends only what is missing.
   */
  heldVersions(): PrometheusA2uiHeldVersions {
    return Object.fromEntries(
      [...this.ledger.heldKeys()]
        .filter(([surfaceId]) => this.host.getSurface(surfaceId) !== undefined)
        .map(([surfaceId, key]) => [surfaceId, { epoch: key.epoch, version: key.version }]),
    );
  }

  /** Counts for `getLimitUsage`. */
  usage(): { trackedMessages: number; tombstones: number; bufferedDeltas: number } {
    return {
      trackedMessages: this.ledger.trackedMessages,
      tombstones: this.ledger.tombstoneCount,
      bufferedDeltas: this.deltaBuffer.size,
    };
  }

  clear(): void {
    this.deltaBuffer.clear();
    this.ledger.clear();
    this.reportedFailures.clear();
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
      this.host.onProducerFault?.({
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

  requestResync(
    reason: PrometheusA2uiResyncReason,
    messageId: string,
    surfaces: readonly PrometheusA2uiResyncSurface[],
  ): void {
    this.host.onResyncNeeded?.({ reason, messageId, surfaces, held: this.heldVersions() });
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
      has: (surfaceId) => this.host.getSurface(surfaceId) !== undefined,
      config: (surfaceId) => {
        const surface = this.host.getSurface(surfaceId);
        return surface
          ? {
              catalogId: defaultCatalogIdOf(surface),
              // A2UI 1.0 removed `theme`; only a v0.9.1 surface holds one.
              theme: isV1Surface(surface) ? undefined : surface.theme,
              sendDataModel: surface.sendDataModel,
            }
          : undefined;
      },
      data: (surfaceId, pointer) => {
        try {
          return this.host.getSurface(surfaceId)?.dataModel.get(pointer);
        } catch {
          // The official model refuses to read keys such as `constructor`; nothing
          // readable is held there, so reconciliation treats the leaf as absent.
          return undefined;
        }
      },
    };
  }
}
