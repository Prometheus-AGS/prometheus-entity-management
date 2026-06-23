/**
 * plugin.ts — Alpine.js plugin factory for the Prometheus entity graph.
 *
 * Registers two Alpine magics:
 *   - `$entity(type, id)`        → AlpineEntitySnapshot
 *   - `$entityList(type, query)` → AlpineEntityList
 *
 * Usage:
 * ```js
 * import Alpine from "alpinejs";
 * import { EntityGraphAlpinePlugin } from "@prometheus-ags/entity-graph-alpine";
 *
 * Alpine.plugin(EntityGraphAlpinePlugin);
 * Alpine.start();
 * ```
 *
 * Both magics wire `useGraphStore.subscribe` to `Alpine.reactive()` so that
 * any `x-text` / `:bind` / `x-show` expression that reads a property from the
 * returned object is automatically tracked and re-evaluated when the underlying
 * graph slice changes.
 *
 * NOTE: alpinejs 3.x ships without bundled TypeScript declarations. This plugin
 * uses a minimal structural interface for the Alpine instance rather than
 * importing types from the package directly. This keeps compilation clean while
 * remaining fully compatible with Alpine 3.x at runtime.
 *
 * Architecture rules respected:
 * - This plugin NEVER writes to the graph directly.
 * - All graph writes go through core engine functions (`fetchEntity`, `fetchList`).
 * - The plugin is a thin reactive bridge: Component → magic → store (core).
 */

import { createEntityBinding } from "./entity-binding.js";
import { createListBinding } from "./list-binding.js";
import type {
  AlpineEntitySnapshot,
  AlpineEntityList,
  AlpineListQuery,
  EntityGraphAlpinePluginOptions,
} from "./types.js";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";

// ── Minimal Alpine structural interface ───────────────────────────────────────
// We duck-type the Alpine instance to avoid a hard dependency on Alpine's
// typings (which don't ship with the package). This is the idiomatic pattern
// for Alpine plugin authors writing TypeScript.

interface AlpineInstance {
  /** Register a magic property available as `$name` in component scopes. */
  magic(name: string, callback: MagicCallback): void;
  /** Wrap a plain object in Alpine's reactive proxy. */
  reactive<U extends object>(obj: U): U;
}

type MagicCallback = (
  el: Element,
  options: {
    Alpine: AlpineInstance;
    cleanup: (fn: () => void) => void;
    [key: string]: unknown;
  },
) => unknown;

// ── Plugin factory ────────────────────────────────────────────────────────────

/**
 * Alpine.js plugin that exposes `$entity` and `$entityList` magics backed by
 * the Prometheus normalized entity graph.
 *
 * Pass to `Alpine.plugin(EntityGraphAlpinePlugin)` before `Alpine.start()`.
 *
 * @example
 * ```js
 * import Alpine from "alpinejs";
 * import { EntityGraphAlpinePlugin } from "@prometheus-ags/entity-graph-alpine";
 * import { registerEntityTransport, makeRestTransport } from "@prometheus-ags/entity-graph-core";
 *
 * // 1. Register entity transports at app boot (once per type).
 * registerEntityTransport("Invoice", makeRestTransport({ supabase, table: "invoice" }));
 *
 * // 2. Install the plugin.
 * Alpine.plugin(EntityGraphAlpinePlugin);
 *
 * // 3. Start Alpine.
 * Alpine.start();
 * ```
 *
 * Then in HTML:
 * ```html
 * <div x-data="{ inv: $entity('Invoice', invoiceId) }">
 *   <span x-text="inv.data?.title ?? 'Loading…'"></span>
 *   <button @click="inv.refetch()">Refresh</button>
 * </div>
 *
 * <div x-data="{ list: $entityList('Invoice', { queryKey: ['invoices'] }) }">
 *   <template x-for="item in list.items" :key="item.id">
 *     <span x-text="item.title"></span>
 *   </template>
 *   <button @click="list.loadMore()" x-show="list.hasNextPage">Load more</button>
 * </div>
 * ```
 */
export function EntityGraphAlpinePlugin(
  Alpine: AlpineInstance,
  opts: EntityGraphAlpinePluginOptions = {},
): void {
  const entityMagicName = opts.entityMagicName ?? "$entity";
  const listMagicName = opts.listMagicName ?? "$entityList";

  // ── $entity magic ────────────────────────────────────────────────────────────
  Alpine.magic(
    entityMagicName,
    (_el, { Alpine: al, cleanup }) => {
      // Return the factory function that the template calls as `$entity(type, id)`.
      return function <T extends Record<string, unknown>>(
        type: EntityType,
        id: EntityId | null | undefined,
        bindingOpts?: { staleTime?: number; enabled?: boolean },
      ): AlpineEntitySnapshot<T> {
        const binding = createEntityBinding<T>(
          <U extends object>(obj: U) => al.reactive(obj),
          type,
          id,
          bindingOpts,
        );

        // Register cleanup so the graph subscription is torn down when the
        // Alpine component that owns this magic is destroyed.
        cleanup(() => binding.destroy());

        return binding;
      };
    },
  );

  // ── $entityList magic ────────────────────────────────────────────────────────
  Alpine.magic(
    listMagicName,
    (_el, { Alpine: al, cleanup }) => {
      return function <T extends Record<string, unknown>>(
        type: EntityType,
        query: AlpineListQuery,
      ): AlpineEntityList<T> {
        const binding = createListBinding<T>(
          <U extends object>(obj: U) => al.reactive(obj),
          type,
          query,
        );

        cleanup(() => binding.destroy());

        return binding;
      };
    },
  );
}

/**
 * Plugin factory with custom options.
 *
 * @example
 * ```js
 * Alpine.plugin(createEntityGraphPlugin({ entityMagicName: "$ent" }));
 * ```
 */
export function createEntityGraphPlugin(
  opts: EntityGraphAlpinePluginOptions = {},
): (Alpine: AlpineInstance) => void {
  return (Alpine) => EntityGraphAlpinePlugin(Alpine, opts);
}
