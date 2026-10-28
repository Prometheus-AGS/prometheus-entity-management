import type {
  PrometheusA2uiLimitFault,
  PrometheusA2uiLimits,
  PrometheusA2uiLimitUsage,
} from "./limits.js";

/**
 * Measurement and checking for the runtime limits. Everything here is a pure
 * function over a structural view of the official surface model, so the same
 * checks apply to the live processor and to the shadow processor that
 * `preflight` fills before anything is applied.
 */

/** The parts of an official surface model the checks read. */
export interface MeasurableSurface {
  readonly componentsModel: {
    readonly entries: Iterable<readonly [string, unknown]>;
    getChildIds(componentId: string): readonly string[];
  };
  readonly dataModel: { get(path: string): unknown };
}

export interface SurfaceUsage {
  readonly components: number;
  /** Levels in the longest reference chain from a root. */
  readonly depth: number;
  readonly dataBytes: number;
  /** Serialized size of the components' properties. */
  readonly componentBytes: number;
}

export interface StateUsage {
  readonly surfaces: ReadonlyMap<string, SurfaceUsage>;
  readonly componentsTotal: number;
}

/** A limit a call or a resulting state would break, before it is reported. */
export type LimitViolation = Omit<PrometheusA2uiLimitFault, "kind">;

const encoder = new TextEncoder();

/** Serialized UTF-8 size of a JSON-compatible value; `undefined` is zero bytes. */
export function measureSerializedBytes(value: unknown): number {
  const text = JSON.stringify(value);
  return text === undefined ? 0 : encoder.encode(text).length;
}

/**
 * Longest chain of component references, in levels. Iterative on purpose: a
 * producer can chain thousands of components inside the component-count cap,
 * and recursion would overflow the stack before a limit could reject it.
 * Reference cycles are ignored here; the official processor reports them.
 */
function measureDepth(
  ids: readonly string[],
  childIdsOf: (componentId: string) => readonly string[],
): number {
  const known = new Set(ids);
  const children = new Map<string, readonly string[]>();
  const referenced = new Set<string>();
  for (const id of ids) {
    const kids = childIdsOf(id).filter((kid) => known.has(kid));
    children.set(id, kids);
    for (const kid of kids) referenced.add(kid);
  }

  const levels = new Map<string, number>();
  const visiting = new Set<string>();
  const roots = ids.filter((id) => !referenced.has(id));
  let deepest = 0;

  for (const start of roots.length > 0 ? roots : ids) {
    if (levels.has(start) || visiting.has(start)) continue;
    const stack: Array<{ id: string; next: number }> = [{ id: start, next: 0 }];
    visiting.add(start);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const kids = children.get(frame.id) ?? [];
      if (frame.next < kids.length) {
        const kid = kids[frame.next];
        frame.next += 1;
        if (!levels.has(kid) && !visiting.has(kid)) {
          visiting.add(kid);
          stack.push({ id: kid, next: 0 });
        }
        continue;
      }
      let below = 0;
      for (const kid of kids) below = Math.max(below, levels.get(kid) ?? 0);
      levels.set(frame.id, below + 1);
      visiting.delete(frame.id);
      stack.pop();
    }
    deepest = Math.max(deepest, levels.get(start) ?? 0);
  }
  return deepest;
}

export function measureSurface(surface: MeasurableSurface): SurfaceUsage {
  const ids = [...surface.componentsModel.entries].map(([id]) => id);
  return {
    components: ids.length,
    depth: measureDepth(ids, (id) => surface.componentsModel.getChildIds(id)),
    dataBytes: measureSerializedBytes(surface.dataModel.get("/")),
    componentBytes: measureSerializedBytes(
      [...surface.componentsModel.entries].map(
        ([, component]) => (component as { properties?: unknown }).properties,
      ),
    ),
  };
}

export function measureState(
  surfaces: Iterable<readonly [string, MeasurableSurface]>,
): StateUsage {
  const bySurface = new Map<string, SurfaceUsage>();
  let componentsTotal = 0;
  for (const [surfaceId, surface] of surfaces) {
    const usage = measureSurface(surface);
    bySurface.set(surfaceId, usage);
    componentsTotal += usage.components;
  }
  return { surfaces: bySurface, componentsTotal };
}

/** Per-call limits, checked on the raw input before any parsing or processing. */
export function findCallViolation(
  messages: readonly unknown[],
  limits: Readonly<PrometheusA2uiLimits>,
): LimitViolation | undefined {
  if (messages.length > limits.maxOperationsPerCall) {
    return {
      limit: "maxOperationsPerCall",
      max: limits.maxOperationsPerCall,
      attempted: messages.length,
    };
  }
  const bytes = measureSerializedBytes(messages);
  if (bytes > limits.maxCallBytes) {
    return { limit: "maxCallBytes", max: limits.maxCallBytes, attempted: bytes };
  }
  return undefined;
}

/** Every state limit the resulting state exceeds, in reporting order. */
function* exceededStateLimits(
  usage: StateUsage,
  limits: Readonly<PrometheusA2uiLimits>,
): Generator<LimitViolation> {
  if (usage.surfaces.size > limits.maxSurfaces) {
    yield { limit: "maxSurfaces", max: limits.maxSurfaces, attempted: usage.surfaces.size };
  }
  if (usage.componentsTotal > limits.maxComponentsTotal) {
    yield {
      limit: "maxComponentsTotal",
      max: limits.maxComponentsTotal,
      attempted: usage.componentsTotal,
    };
  }
  for (const [surfaceId, surface] of usage.surfaces) {
    if (surface.components > limits.maxComponentsPerSurface) {
      yield {
        limit: "maxComponentsPerSurface",
        max: limits.maxComponentsPerSurface,
        attempted: surface.components,
        surfaceId,
      };
    }
    if (surface.depth > limits.maxComponentDepth) {
      yield {
        limit: "maxComponentDepth",
        max: limits.maxComponentDepth,
        attempted: surface.depth,
        surfaceId,
      };
    }
    if (surface.componentBytes > limits.maxComponentBytes) {
      yield {
        limit: "maxComponentBytes",
        max: limits.maxComponentBytes,
        attempted: surface.componentBytes,
        surfaceId,
      };
    }
    if (surface.dataBytes > limits.maxDataModelBytes) {
      yield {
        limit: "maxDataModelBytes",
        max: limits.maxDataModelBytes,
        attempted: surface.dataBytes,
        surfaceId,
      };
    }
  }
}

/** The value a state limit held in the state before the call. */
function currentValueFor(violation: LimitViolation, before: StateUsage): number {
  const surface =
    violation.surfaceId === undefined ? undefined : before.surfaces.get(violation.surfaceId);
  switch (violation.limit) {
    case "maxSurfaces":
      return before.surfaces.size;
    case "maxComponentsTotal":
      return before.componentsTotal;
    case "maxComponentsPerSurface":
      return surface?.components ?? 0;
    case "maxComponentDepth":
      return surface?.depth ?? 0;
    case "maxDataModelBytes":
      return surface?.dataBytes ?? 0;
    case "maxComponentBytes":
      return surface?.componentBytes ?? 0;
    default:
      return 0;
  }
}

/**
 * State limits, checked on the state a call would produce. A call is rejected
 * only when it pushes a value past its cap AND above what is already held, so
 * a host that lowers a cap with `setLimits` can still shrink back under it:
 * deleting a surface, or touching one without growing it, is never refused.
 * `before` is measured lazily, only once a limit is actually exceeded.
 */
export function findStateViolation(
  usage: StateUsage,
  limits: Readonly<PrometheusA2uiLimits>,
  before: () => StateUsage,
): LimitViolation | undefined {
  let held: StateUsage | undefined;
  for (const candidate of exceededStateLimits(usage, limits)) {
    if (held === undefined) held = before();
    const current = currentValueFor(candidate, held);
    if (candidate.attempted <= current) continue;
    return { ...candidate, current };
  }
  return undefined;
}

/** Current usage against each state limit; per-surface limits report the largest surface. */
export function summarizeUsage(
  usage: StateUsage,
  limits: Readonly<PrometheusA2uiLimits>,
  held: {
    readonly trackedMessages: number;
    readonly tombstones: number;
    readonly bufferedDeltas: number;
  },
): PrometheusA2uiLimitUsage {
  let components = 0;
  let depth = 0;
  let dataBytes = 0;
  let componentBytes = 0;
  for (const surface of usage.surfaces.values()) {
    components = Math.max(components, surface.components);
    depth = Math.max(depth, surface.depth);
    dataBytes = Math.max(dataBytes, surface.dataBytes);
    componentBytes = Math.max(componentBytes, surface.componentBytes);
  }
  return {
    maxSurfaces: { current: usage.surfaces.size, max: limits.maxSurfaces },
    maxComponentsTotal: { current: usage.componentsTotal, max: limits.maxComponentsTotal },
    maxComponentsPerSurface: { current: components, max: limits.maxComponentsPerSurface },
    maxComponentDepth: { current: depth, max: limits.maxComponentDepth },
    maxDataModelBytes: { current: dataBytes, max: limits.maxDataModelBytes },
    maxComponentBytes: { current: componentBytes, max: limits.maxComponentBytes },
    maxTrackedMessages: { current: held.trackedMessages, max: limits.maxTrackedMessages },
    maxTombstones: { current: held.tombstones, max: limits.maxTombstones },
    maxBufferedDeltas: { current: held.bufferedDeltas, max: limits.maxBufferedDeltas },
  };
}
