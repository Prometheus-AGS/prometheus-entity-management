/**
 * Resource limits for agent-generated UI arriving at the runtime.
 *
 * Trust boundary: A2UI messages come from an agent or a server the host does
 * not control. Without caps, one faulty or hostile producer can exhaust the
 * browser's memory or CPU. The official `@a2ui/web_core` processor enforces no
 * resource caps of its own, so the runtime does.
 *
 * Defaults are provisional estimates, not measurements. A host that needs more
 * room raises specific limits; nothing is silently truncated.
 */

export interface PrometheusA2uiLimits {
  /** Surfaces held by one runtime. */
  readonly maxSurfaces: number;
  /** Components in a single surface. */
  readonly maxComponentsPerSurface: number;
  /** Components across every surface of one runtime. */
  readonly maxComponentsTotal: number;
  /** Longest chain of component references from a root, counted in levels. */
  readonly maxComponentDepth: number;
  /** Serialized UTF-8 size of one surface's data model. */
  readonly maxDataModelBytes: number;
  /** Serialized UTF-8 size of one surface's components (their properties). */
  readonly maxComponentBytes: number;
  /** Messages accepted by one `processMessages` call. */
  readonly maxOperationsPerCall: number;
  /** Serialized UTF-8 size of the messages in one `processMessages` call. */
  readonly maxCallBytes: number;
  /** Activity messages remembered for redelivery; the oldest is forgotten first. */
  readonly maxTrackedMessages: number;
  /** Deleted surfaces remembered so a stale create cannot revive them; oldest forgotten first. */
  readonly maxTombstones: number;
  /** Deltas held while the version they build on has not arrived; the oldest is dropped first. */
  readonly maxBufferedDeltas: number;
  /** How long a held delta waits for the missing version before a resync is requested. */
  readonly bufferTimeoutMs: number;
}

export type PrometheusA2uiLimitName = keyof PrometheusA2uiLimits;

const ONE_MEBIBYTE = 1_048_576;

export const DEFAULT_PROMETHEUS_A2UI_LIMITS: Readonly<PrometheusA2uiLimits> = Object.freeze({
  maxSurfaces: 64,
  maxComponentsPerSurface: 2_000,
  maxComponentsTotal: 10_000,
  maxComponentDepth: 32,
  maxDataModelBytes: ONE_MEBIBYTE,
  maxComponentBytes: ONE_MEBIBYTE,
  maxOperationsPerCall: 500,
  maxCallBytes: ONE_MEBIBYTE,
  maxTrackedMessages: 1_000,
  maxTombstones: 1_000,
  maxBufferedDeltas: 100,
  bufferTimeoutMs: 5_000,
});

/**
 * A producer fault: the runtime refused agent-generated input and left every
 * surface unchanged. Reported through `onProducerFault`, never as a silent drop.
 */
export interface PrometheusA2uiLimitFault {
  readonly kind: "limit-exceeded";
  readonly limit: PrometheusA2uiLimitName;
  /** The configured ceiling that was exceeded. */
  readonly max: number;
  /** The value the rejected call would have produced. */
  readonly attempted: number;
  /** The value held before the rejected call; absent for per-call limits. */
  readonly current?: number;
  /** The surface a per-surface limit applies to. */
  readonly surfaceId?: string;
}

/**
 * Two activities carried the same ordering key for a surface but different
 * content. The first is kept and the second is ignored, never merged.
 */
export interface PrometheusA2uiVersionConflictFault {
  readonly kind: "version-conflict";
  readonly surfaceId: string;
  readonly epoch: number;
  readonly version: number;
}

/**
 * A restatement tried to create a surface the runtime already holds, with a
 * different catalog, theme or `sendDataModel`. The restated operations for that
 * surface were ignored and the held surface is unchanged.
 */
export interface PrometheusA2uiSurfaceMismatchFault {
  readonly kind: "surface-config-mismatch";
  readonly surfaceId: string;
  readonly field: "catalogId" | "theme" | "sendDataModel";
}

/**
 * The runtime refused a batch the producer had accepted (a disallowed
 * component, a topology error and so on). The surfaces stay at their last
 * version and a resync was requested. Limit rejections report their own fault
 * and do not repeat here.
 */
export interface PrometheusA2uiBatchRefusedFault {
  readonly kind: "batch-refused";
  readonly surfaceIds: readonly string[];
  /** A `PrometheusA2uiErrorCode`, or `processing-error` for an error from the official processor. */
  readonly code: string;
  readonly message: string;
}

export type PrometheusA2uiProducerFault =
  | PrometheusA2uiLimitFault
  | PrometheusA2uiVersionConflictFault
  | PrometheusA2uiSurfaceMismatchFault
  | PrometheusA2uiBatchRefusedFault;

export interface PrometheusA2uiLimitUsageEntry {
  readonly current: number;
  readonly max: number;
}

/**
 * Held usage against each state limit. The per-surface limits report the
 * largest value held by any single surface. Per-call limits have no held usage.
 */
export type PrometheusA2uiLimitUsage = Readonly<
  Record<
    | "maxSurfaces"
    | "maxComponentsTotal"
    | "maxComponentsPerSurface"
    | "maxComponentDepth"
    | "maxDataModelBytes"
    | "maxComponentBytes"
    | "maxTrackedMessages"
    | "maxTombstones"
    | "maxBufferedDeltas",
    PrometheusA2uiLimitUsageEntry
  >
>;

type MutableLimits = { -readonly [Name in PrometheusA2uiLimitName]: number };

const LIMIT_NAMES: readonly string[] = Object.keys(DEFAULT_PROMETHEUS_A2UI_LIMITS);

/**
 * Merge overrides over a base set of limits. Every limit must be a positive
 * safe integer and every name must be known, so a typo fails at construction
 * instead of leaving a cap silently at its default.
 */
export function resolvePrometheusA2uiLimits(
  base: Readonly<PrometheusA2uiLimits>,
  overrides: Partial<PrometheusA2uiLimits> | undefined,
): Readonly<PrometheusA2uiLimits> {
  const next: MutableLimits = { ...base };
  for (const [name, value] of Object.entries(overrides ?? {})) {
    if (!LIMIT_NAMES.includes(name)) {
      throw new Error(`Unknown A2UI limit: ${name}.`);
    }
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(
        `A2UI limit ${name} must be a positive safe integer; received ${String(value)}.`,
      );
    }
    next[name as PrometheusA2uiLimitName] = value;
  }
  return Object.freeze(next);
}
