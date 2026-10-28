/**
 * `ACTIVITY_DELTA` for A2UI surfaces.
 *
 * AG-UI defines a delta as RFC 6902 operations against the activity's content.
 * A2UI surfaces use a deliberately small subset, so the runtime can interpret a
 * delta directly instead of storing and patching a copy of the content:
 *
 * - `add` to `/a2ui_operations/-` appends one A2UI operation;
 * - `test` on `/surfaceVersions/<surfaceId>/version` (and optionally `/epoch`)
 *   names the version the delta applies on top of.
 *
 * A delta applies on top of version N and produces version N + 1. Anything else
 * is rejected: `remove` could not be honored (the official processor cannot
 * remove a component), and a delta without a version cannot be ordered.
 */

import { describeOperation, type SurfaceVersion } from "./activity-keys.js";

export interface DeltaBase {
  /** Absent means "the epoch the surface currently holds". */
  readonly epoch: number | undefined;
  readonly version: number;
}

export interface ParsedDelta {
  /** Per surface, the version the producer says the delta applies on top of. */
  readonly bases: ReadonlyMap<string, DeltaBase>;
  readonly operations: readonly unknown[];
}

export type ParsedDeltaResult =
  | { readonly delta: ParsedDelta }
  | { readonly problem: string };

/** What a delta still needs before it can be applied for one surface. */
export interface DeltaNeed {
  readonly surfaceId: string;
  /** What the surface holds now; absent when it holds no versioned state. */
  readonly held: SurfaceVersion | undefined;
  /** The version the delta applies on top of. */
  readonly expected: SurfaceVersion;
}

export type DeltaState =
  | {
      readonly kind: "ready";
      /** The version each surface will hold once the delta is applied. */
      readonly versions: ReadonlyMap<string, SurfaceVersion>;
      /** Only the operations for surfaces that are in order. */
      readonly operations: readonly unknown[];
    }
  | { readonly kind: "waiting"; readonly needs: readonly DeltaNeed[] }
  | { readonly kind: "stale" };

const VERSION_TEST_PATH = /^\/surfaceVersions\/([^/]+)\/(epoch|version)$/;

function isCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function unescapePointer(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function parseDelta(patch: unknown): ParsedDeltaResult {
  if (!Array.isArray(patch)) {
    return { problem: "ACTIVITY_DELTA patch must be an array of JSON Patch operations." };
  }
  const epochs = new Map<string, number>();
  const versions = new Map<string, number>();
  const operations: unknown[] = [];

  for (const entry of patch) {
    if (!entry || typeof entry !== "object") {
      return { problem: "ACTIVITY_DELTA patch entries must be JSON Patch operations." };
    }
    const { op, path, value } = entry as { op?: unknown; path?: unknown; value?: unknown };
    if (op === "add" && path === "/a2ui_operations/-") {
      operations.push(value);
      continue;
    }
    const match = op === "test" && typeof path === "string" ? VERSION_TEST_PATH.exec(path) : null;
    if (match && isCounter(value)) {
      const surfaceId = unescapePointer(match[1]);
      (match[2] === "epoch" ? epochs : versions).set(surfaceId, value);
      continue;
    }
    return {
      problem:
        `Unsupported ACTIVITY_DELTA operation: ${String(op)} ${String(path)}. ` +
        "Only add to /a2ui_operations/- and test on /surfaceVersions/<surfaceId>/version " +
        "or /epoch (with a non-negative integer) are supported.",
    };
  }

  const bases = new Map<string, DeltaBase>();
  for (const operation of operations) {
    const ref = describeOperation(operation);
    if (!ref) {
      return { problem: "Every operation appended by an ACTIVITY_DELTA must name a surface." };
    }
    const version = versions.get(ref.surfaceId);
    if (version === undefined) {
      return {
        problem:
          `ACTIVITY_DELTA carries no version for surface ${ref.surfaceId}. ` +
          "A delta without a version cannot be ordered and is rejected.",
      };
    }
    bases.set(ref.surfaceId, { epoch: epochs.get(ref.surfaceId), version });
  }
  return { delta: { bases, operations } };
}

/**
 * Compare a delta with what each surface holds. In order means "applies on top
 * of the held version"; a base ahead of the held version is a gap, and a surface
 * that holds no versioned state has nothing to apply on top of. One surface
 * waiting holds the whole delta: its operations can depend on each other, so a
 * delta is never applied in part for the waiting surface.
 */
export function classifyDelta(
  delta: ParsedDelta,
  heldKey: (surfaceId: string) => SurfaceVersion | undefined,
): DeltaState {
  const needs: DeltaNeed[] = [];
  const versions = new Map<string, SurfaceVersion>();

  for (const [surfaceId, base] of delta.bases) {
    const held = heldKey(surfaceId);
    const epoch = base.epoch ?? held?.epoch ?? 0;
    const expected: SurfaceVersion = { epoch, version: base.version };
    if (
      !held ||
      epoch > held.epoch ||
      (epoch === held.epoch && base.version > held.version)
    ) {
      needs.push({ surfaceId, held, expected });
      continue;
    }
    // Already past this delta. One exactly one behind is the delta we last
    // applied, which the ledger recognizes as a redelivery; keep it.
    if (epoch < held.epoch || base.version + 1 < held.version) continue;
    versions.set(surfaceId, { epoch: held.epoch, version: base.version + 1 });
  }

  if (needs.length > 0) return { kind: "waiting", needs };
  if (versions.size === 0) return { kind: "stale" };
  return {
    kind: "ready",
    versions,
    operations: delta.operations.filter((operation) => {
      const ref = describeOperation(operation);
      return ref !== undefined && versions.has(ref.surfaceId);
    }),
  };
}
