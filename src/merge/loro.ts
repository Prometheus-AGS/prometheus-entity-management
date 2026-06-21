/**
 * merge/loro.ts — Loro-backed CRDT MergeStrategy (reference implementation).
 *
 * Maps each entity (`type:id`) onto a Loro document whose root is an LWW-Map —
 * a near-1:1 fit for the graph's `type:id:field` model. Concurrent field writes
 * resolve via Loro's CRDT semantics rather than blind last-write-wins, so two
 * writers updating *different* fields never clobber each other, and writers
 * updating the *same* field resolve deterministically across replicas.
 *
 * `loro-crdt` is an OPTIONAL peer dependency. It is imported lazily so the core
 * bundle stays `zustand + immer` only — nothing loads Loro unless an app
 * actually registers `createLoroMergeStrategy()`.
 *
 * NOTE: `createLoroMergeStrategy` is async because it dynamically imports the
 * engine. Await it once at boot, then register the resolved synchronous
 * strategy. The returned strategy itself is pure+sync (the MergeStrategy
 * contract), keeping per-write resolution off the async path.
 */

import type { MergeStrategy } from "./types";

/** Minimal surface of the `loro-crdt` LoroDoc we rely on (avoids a hard type dep). */
interface LoroDocLike {
  getMap(key: string): LoroMapLike;
  toJSON(): Record<string, unknown>;
}
interface LoroMapLike {
  set(key: string, value: unknown): void;
  toJSON?(): Record<string, unknown>;
}
interface LoroModuleLike {
  LoroDoc: new () => LoroDocLike;
}

const ROOT_MAP = "entity";

/** Per-(type:id) Loro document cache so repeated writes converge on one CRDT. */
const docs = new Map<string, LoroDocLike>();

function ek(type: string, id: string): string {
  return `${type}:${id}`;
}

/**
 * Build a Loro-backed {@link MergeStrategy}. Resolves `loro-crdt` lazily; throws
 * a clear error if the optional peer is not installed.
 *
 * @example
 * ```ts
 * const loro = await createLoroMergeStrategy();
 * registerMergeStrategy("Document", loro);
 * ```
 */
export async function createLoroMergeStrategy(): Promise<MergeStrategy> {
  let mod: LoroModuleLike;
  try {
    // `loro-crdt` is an OPTIONAL peer — it is intentionally NOT in this package's
    // dependencies, so TS cannot resolve the specifier at build time. The runtime
    // try/catch below is the real guard; suppress only the module-resolution error.
    // @ts-expect-error optional peer dependency, resolved at runtime
    mod = (await import(/* @vite-ignore */ "loro-crdt")) as unknown as LoroModuleLike;
  } catch (cause) {
    throw new Error(
      "[merge/loro] createLoroMergeStrategy requires the optional peer dependency 'loro-crdt'. " +
        "Install it with `pnpm add loro-crdt`.",
      { cause },
    );
  }

  const { LoroDoc } = mod;

  return (prev, next, ctx) => {
    const key = ek(ctx.type, ctx.id);
    let doc = docs.get(key);
    if (!doc) {
      doc = new LoroDoc();
      docs.set(key, doc);
      // Seed the CRDT with any pre-existing canonical state so the first
      // CRDT write merges against known fields rather than an empty doc.
      if (prev) {
        const seed = doc.getMap(ROOT_MAP);
        for (const [k, v] of Object.entries(prev)) seed.set(k, v);
      }
    }

    const map = doc.getMap(ROOT_MAP);
    for (const [k, v] of Object.entries(next)) map.set(k, v);

    const root = doc.toJSON()[ROOT_MAP];
    return (root && typeof root === "object" ? (root as Record<string, unknown>) : { ...next });
  };
}

/** @internal Test-only. Clears the per-entity Loro doc cache. */
export function __resetLoroDocs(): void {
  docs.clear();
}
