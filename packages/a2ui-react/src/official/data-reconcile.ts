/**
 * Reconciling a producer's data-model writes with what the user has typed.
 *
 * The official processor treats `updateDataModel` at path `/` as "replace the
 * whole model", so replaying a producer's restatement wipes typed input. The
 * runtime therefore remembers, per surface, a digest of the last value the
 * producer wrote at each leaf, and only writes leaves whose producer value
 * actually changed:
 *
 * - an unchanged producer value is never written, so it cannot overwrite input;
 * - a changed producer value is written and wins; if the user had also changed
 *   that leaf, the clash is reported as a conflict;
 * - a leaf the producer wrote before and no longer states is removed.
 *
 * A leaf is "locally changed" when its current value differs from the last
 * value the producer wrote there. That needs no attribution of who wrote it.
 */

import { canonicalize, digestOf } from "./activity-keys.js";

/** The producer and the user both changed a leaf; the producer's value was written. */
export interface PrometheusA2uiDataConflict {
  readonly surfaceId: string;
  /** JSON Pointer of the conflicting leaf. */
  readonly path: string;
  /** What the producer wrote, or `undefined` if it removed the leaf. */
  readonly producerValue: unknown;
  /** What the surface held before the producer's write. */
  readonly localValue: unknown;
}

interface Leaf {
  readonly keys: readonly string[];
  readonly value: unknown;
}

export interface DataWriteInput {
  readonly surfaceId: string;
  /** `/` or a JSON Pointer such as `/user/name`. */
  readonly path: string;
  readonly hasValue: boolean;
  readonly value: unknown;
  /** Leaf pointer to the digest of the last producer-written value. */
  readonly base: ReadonlyMap<string, string>;
  /** The value the surface holds at a pointer, including writes already planned. */
  readonly current: (pointer: string) => unknown;
}

export interface DataWriteResult {
  /** The single write to apply, or `undefined` when nothing changed. */
  readonly write: { readonly path: string; readonly value: unknown; readonly hasValue: boolean } | undefined;
  /** Base entries to record once the write is applied. */
  readonly set: ReadonlyMap<string, string>;
  /** Base entries to forget once the write is applied. */
  readonly remove: readonly string[];
  /** Leaf values this write leaves in place, for later writes in the same batch. */
  readonly planned: ReadonlyMap<string, unknown>;
  readonly conflicts: readonly PrometheusA2uiDataConflict[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeSegment(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

function pointerOf(keys: readonly string[]): string {
  return keys.length === 0 ? "/" : `/${keys.map(escapeSegment).join("/")}`;
}

function keysOf(pointer: string): string[] {
  if (pointer === "" || pointer === "/") return [];
  return pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** Objects recurse; arrays, primitives, null and empty objects are leaves. */
function leavesOf(prefix: readonly string[], value: unknown): Leaf[] {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    return Object.entries(value).flatMap(([key, child]) => leavesOf([...prefix, key], child));
  }
  return [{ keys: prefix, value }];
}

function digestOfValue(value: unknown): string {
  return digestOf(canonicalize(value));
}

/**
 * Producer keys are untrusted. Descend only through own properties and assign
 * with `defineProperty`, so a key such as `__proto__` becomes plain data and can
 * never reach `Object.prototype`.
 */
function setIn(target: Record<string, unknown>, keys: readonly string[], value: unknown): void {
  let node = target;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      Object.defineProperty(node, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      return;
    }
    const next = Object.hasOwn(node, key) ? node[key] : undefined;
    if (isPlainObject(next)) {
      node = next;
      return;
    }
    const created: Record<string, unknown> = {};
    Object.defineProperty(node, key, {
      value: created,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    node = created;
  });
}

function deleteIn(target: Record<string, unknown>, keys: readonly string[]): void {
  let node: Record<string, unknown> = target;
  for (const key of keys.slice(0, -1)) {
    const next = Object.hasOwn(node, key) ? node[key] : undefined;
    if (!isPlainObject(next)) return;
    node = next;
  }
  const last = keys[keys.length - 1];
  if (last !== undefined && Object.hasOwn(node, last)) delete node[last];
}

function startsWith(keys: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length <= keys.length && prefix.every((key, index) => keys[index] === key);
}

/** Every proper ancestor pointer of every leaf, to spot a leaf that became a container. */
function ancestorPointers(leaves: readonly Leaf[]): Set<string> {
  const ancestors = new Set<string>();
  for (const leaf of leaves) {
    for (let length = 0; length < leaf.keys.length; length += 1) {
      ancestors.add(pointerOf(leaf.keys.slice(0, length)));
    }
  }
  return ancestors;
}

export function reconcileDataWrite(input: DataWriteInput): DataWriteResult {
  const { surfaceId, path, hasValue, value, base, current } = input;
  const prefix = keysOf(path);
  const leaves = hasValue ? leavesOf(prefix, value) : [{ keys: prefix, value: undefined }];
  const incoming = new Map(leaves.map((leaf) => [pointerOf(leaf.keys), leaf] as const));
  const set = new Map<string, string>();
  const planned = new Map<string, unknown>();
  const conflicts: PrometheusA2uiDataConflict[] = [];
  const changed: Leaf[] = [];

  for (const [pointer, leaf] of incoming) {
    const digest = digestOfValue(leaf.value);
    // A deleted leaf is forgotten, not remembered as a value.
    if (hasValue) set.set(pointer, digest);
    const baseDigest = base.get(pointer);
    if (baseDigest === digest) continue;

    changed.push(leaf);
    planned.set(pointer, leaf.value);
    const local = current(pointer);
    const locallyChanged =
      baseDigest === undefined
        ? local !== undefined && digestOfValue(local) !== digest
        : digestOfValue(local) !== baseDigest;
    if (locallyChanged) {
      conflicts.push({ surfaceId, path: pointer, producerValue: leaf.value, localValue: local });
    }
  }

  const containers = ancestorPointers(leaves);
  const removed: string[] = [];
  for (const [pointer, baseDigest] of base) {
    if (incoming.has(pointer) || containers.has(pointer)) continue;
    if (!startsWith(keysOf(pointer), prefix)) continue;
    removed.push(pointer);
    planned.set(pointer, undefined);
    const local = current(pointer);
    if (local !== undefined && digestOfValue(local) !== baseDigest) {
      conflicts.push({ surfaceId, path: pointer, producerValue: undefined, localValue: local });
    }
  }

  const forgotten = hasValue ? removed : [...removed, ...incoming.keys()];
  if (changed.length === 0 && removed.length === 0) {
    return { write: undefined, set, remove: forgotten, planned, conflicts };
  }

  // Overlay the changes on what the surface holds, so keys the producer never
  // wrote (typed input) survive; fall back to the producer's value otherwise.
  const held = current(pointerOf(prefix));
  let merged: unknown = hasValue ? value : undefined;
  if (hasValue && isPlainObject(value) && Object.keys(value).length > 0 && isPlainObject(held)) {
    const overlay = structuredClone(held);
    for (const leaf of changed) setIn(overlay, leaf.keys.slice(prefix.length), leaf.value);
    for (const pointer of removed) deleteIn(overlay, keysOf(pointer).slice(prefix.length));
    merged = overlay;
  }
  return {
    write: { path, value: merged, hasValue },
    set,
    remove: forgotten,
    planned,
    conflicts,
  };
}
