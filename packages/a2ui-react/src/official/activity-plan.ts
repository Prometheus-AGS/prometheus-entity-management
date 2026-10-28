/**
 * Planning for one AG-UI A2UI activity.
 *
 * The planner is pure: it reads the ledger and a read-only view of the live
 * surfaces and returns what to apply, what to skip and what to report. The
 * runtime then applies the plan through `processMessages` (so limits, schema,
 * catalog and atomicity all still apply) and commits the ledger only after that
 * succeeds. A surface is never deleted here; deletion only ever comes from an
 * explicit `deleteSurface` in the producer's own operations.
 */

import {
  canonicalize,
  describeOperation,
  digestOf,
  type OperationRef,
  type SurfaceVersion,
} from "./activity-keys.js";
import type { ActivityLedger, SurfaceRole } from "./activity-ledger.js";
import { reconcileDataWrite, type PrometheusA2uiDataConflict } from "./data-reconcile.js";
import type {
  PrometheusA2uiProducerFault,
  PrometheusA2uiSurfaceMismatchFault,
} from "./limits.js";

/** The settings a held surface was created with. */
export interface SurfaceConfig {
  readonly catalogId: string;
  readonly theme: unknown;
  readonly sendDataModel: boolean | undefined;
}

/** What the planner may read about the live runtime. */
export interface LiveSurfaceView {
  has(surfaceId: string): boolean;
  config(surfaceId: string): SurfaceConfig | undefined;
  /** The value a surface holds at a JSON Pointer; `undefined` if absent or no such surface. */
  data(surfaceId: string, pointer: string): unknown;
}

/** What happened to one surface in a planned activity, for the ledger commit. */
export interface SurfacePlan {
  readonly surfaceId: string;
  readonly key: SurfaceVersion | undefined;
  readonly digest: string;
  readonly role: SurfaceRole;
  /** The producer's last lifecycle operation for this surface was `deleteSurface`. */
  readonly deleted: boolean;
}

export interface ActivityPlan {
  /** Operations to apply, in the producer's original order. */
  readonly operations: readonly unknown[];
  /** The surfaces whose operations are being applied. */
  readonly surfaces: readonly SurfacePlan[];
  /** Producer faults found while planning; reported by the runtime. */
  readonly faults: readonly PrometheusA2uiProducerFault[];
  /** Data leaves the producer changed while the user had also changed them. */
  readonly conflicts: readonly PrometheusA2uiDataConflict[];
  /** The data base to record per surface once the operations are applied. */
  readonly dataBases: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

export interface PlanActivityInput {
  readonly messageId: string;
  /** Operations already normalized to the supported protocol version. */
  readonly operations: readonly unknown[];
  readonly versions: ReadonlyMap<string, SurfaceVersion>;
  readonly ledger: ActivityLedger;
  readonly live: LiveSurfaceView;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Group operation indexes by the surface they target, in first-seen order. */
function groupBySurface(refs: readonly (OperationRef | undefined)[]): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  refs.forEach((ref, index) => {
    if (!ref) return;
    const indexes = groups.get(ref.surfaceId);
    if (indexes) indexes.push(index);
    else groups.set(ref.surfaceId, [index]);
  });
  return groups;
}

/** Every key the producer restated must match the held theme; omitted keys are not compared. */
function themeMatches(restated: Record<string, unknown>, held: unknown): boolean {
  if (!isRecord(held)) return false;
  return Object.entries(restated).every(
    ([key, value]) => canonicalize(value) === canonicalize(held[key]),
  );
}

/** The first setting a restated `createSurface` changes on a held surface, if any. */
function findMismatch(
  surfaceId: string,
  body: Record<string, unknown>,
  config: SurfaceConfig | undefined,
): PrometheusA2uiSurfaceMismatchFault | undefined {
  if (!config) return undefined;
  if (typeof body.catalogId === "string" && body.catalogId !== config.catalogId) {
    return { kind: "surface-config-mismatch", surfaceId, field: "catalogId" };
  }
  if (
    typeof body.sendDataModel === "boolean" &&
    body.sendDataModel !== (config.sendDataModel ?? false)
  ) {
    return { kind: "surface-config-mismatch", surfaceId, field: "sendDataModel" };
  }
  if (isRecord(body.theme) && !themeMatches(body.theme, config.theme)) {
    return { kind: "surface-config-mismatch", surfaceId, field: "theme" };
  }
  return undefined;
}

/**
 * A `createSurface` for a surface that already exists cannot be applied (the
 * official processor throws), but a v1.0 RC one can carry inline components and
 * a data model that the restatement means to apply. Turn those into the
 * equivalent update operations, so nothing the producer restated is lost.
 */
function inlineContentOperations(operation: unknown, ref: OperationRef): unknown[] {
  const version = (operation as { version?: unknown }).version;
  const { components, dataModel } = ref.body;
  const operations: unknown[] = [];
  if (Array.isArray(components) && components.length > 0) {
    operations.push({
      version,
      updateComponents: { surfaceId: ref.surfaceId, components },
    });
  }
  if (dataModel !== undefined) {
    operations.push({
      version,
      updateDataModel: { surfaceId: ref.surfaceId, path: "/", value: dataModel },
    });
  }
  return operations;
}

/**
 * Decide each surface independently, so a stale surface and a fresh surface in
 * one message are handled apart: the stale one is skipped and the fresh one is
 * applied. Operations that name no surface are kept so the official processor
 * can report them as it always did.
 */
export function planActivity(input: PlanActivityInput): ActivityPlan {
  const { messageId, operations, versions, ledger, live } = input;
  const refs = operations.map(describeOperation);
  const faults: PrometheusA2uiProducerFault[] = [];
  const surfaces: SurfacePlan[] = [];
  const dropped = new Set<number>();
  const replaced = new Map<number, readonly unknown[]>();

  for (const [surfaceId, indexes] of groupBySurface(refs)) {
    const key = versions.get(surfaceId);
    const isHeld = live.has(surfaceId);
    const digest = digestOf(canonicalize(indexes.map((index) => operations[index])));
    const decision = ledger.decide(messageId, surfaceId, key, digest, isHeld);

    if (decision.action !== "apply") {
      for (const index of indexes) dropped.add(index);
      if (decision.action === "conflict" && key) {
        faults.push({
          kind: "version-conflict",
          surfaceId,
          epoch: key.epoch,
          version: key.version,
        });
      }
      continue;
    }

    // Walk the surface's operations in order, tracking whether it exists at
    // each point, so a producer's own delete-then-create is a real create.
    let exists = isHeld;
    let created = false;
    let lastLifecycle: "createSurface" | "deleteSurface" | undefined;
    let mismatch: PrometheusA2uiSurfaceMismatchFault | undefined;
    const surfaceReplacements = new Map<number, readonly unknown[]>();
    for (const index of indexes) {
      const ref = refs[index];
      if (ref?.kind === "deleteSurface") {
        exists = false;
        lastLifecycle = "deleteSurface";
      } else if (ref?.kind === "createSurface") {
        lastLifecycle = "createSurface";
        if (exists) {
          mismatch ??= findMismatch(surfaceId, ref.body, live.config(surfaceId));
          surfaceReplacements.set(index, inlineContentOperations(operations[index], ref));
        } else {
          exists = true;
          created = true;
        }
      }
    }

    if (mismatch) {
      faults.push(mismatch);
      for (const index of indexes) dropped.add(index);
      continue;
    }
    for (const [index, replacement] of surfaceReplacements) replaced.set(index, replacement);
    surfaces.push({
      surfaceId,
      key,
      digest,
      role: created ? "created" : "updated",
      deleted: lastLifecycle === "deleteSurface",
    });
  }

  const kept = operations.flatMap((operation, index) => {
    if (dropped.has(index)) return [];
    return replaced.get(index) ?? [operation];
  });

  // Data writes: only leaves whose producer value changed are written, so a
  // restatement cannot overwrite what the user typed (see data-reconcile.ts).
  const applied = new Map(surfaces.map((surface) => [surface.surfaceId, surface] as const));
  const bases = new Map<string, Map<string, string>>();
  const planned = new Map<string, Map<string, unknown>>();
  const conflicts: PrometheusA2uiDataConflict[] = [];
  // Surfaces the activity deletes: what they held is gone, so a later create in the
  // same activity starts from an empty base and an empty surface.
  const fresh = new Set<string>();
  const reconciled = kept.flatMap((operation) => {
    const ref = describeOperation(operation);
    const surface = ref ? applied.get(ref.surfaceId) : undefined;
    if (ref?.kind === "deleteSurface" && surface) {
      bases.set(ref.surfaceId, new Map());
      planned.set(ref.surfaceId, new Map());
      fresh.add(ref.surfaceId);
      return [operation];
    }
    if (!ref || ref.kind !== "updateDataModel" || !surface || surface.deleted) return [operation];

    const base = bases.get(ref.surfaceId) ?? new Map(ledger.dataBase(ref.surfaceId));
    bases.set(ref.surfaceId, base);
    const overlay = planned.get(ref.surfaceId) ?? new Map<string, unknown>();
    planned.set(ref.surfaceId, overlay);

    const result = reconcileDataWrite({
      surfaceId: ref.surfaceId,
      path: typeof ref.body.path === "string" ? ref.body.path : "/",
      hasValue: ref.body.value !== undefined,
      value: ref.body.value,
      base,
      current: (pointer) => {
        if (overlay.has(pointer)) return overlay.get(pointer);
        return fresh.has(ref.surfaceId) ? undefined : live.data(ref.surfaceId, pointer);
      },
    });
    for (const [pointer, digest] of result.set) base.set(pointer, digest);
    for (const pointer of result.remove) base.delete(pointer);
    for (const [pointer, value] of result.planned) overlay.set(pointer, value);
    conflicts.push(...result.conflicts);

    if (!result.write) return [];
    return [
      {
        ...(operation as Record<string, unknown>),
        updateDataModel: {
          surfaceId: ref.surfaceId,
          path: result.write.path,
          ...(result.write.hasValue ? { value: result.write.value } : {}),
        },
      },
    ];
  });

  return { operations: reconciled, surfaces, faults, conflicts, dataBases: bases };
}
