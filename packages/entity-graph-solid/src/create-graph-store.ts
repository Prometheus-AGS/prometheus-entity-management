/**
 * createGraphStore — SolidJS fine-grained reactive bridge to the entire
 * Zustand entity graph.
 *
 * Consumers that need ad-hoc access to the graph outside `createEntity` /
 * `createEntityList` can use this to read any slice of `GraphState` as a
 * SolidJS signal. The subscription is scoped to only the selected slice,
 * so unrelated graph mutations do not trigger re-computations.
 *
 * @example
 * ```ts
 * // Read total entity count for a devtools panel.
 * const entityCount = createGraphStore(
 *   (s) => Object.keys(s.entities).reduce((n, t) => n + Object.keys(s.entities[t]).length, 0),
 * );
 * console.log(entityCount()); // reactive SolidJS accessor
 * ```
 */

import { createSignal, onCleanup } from "solid-js";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import type { GraphState } from "@prometheus-ags/entity-graph-core";

/**
 * Subscribe to a selector over the entity graph.
 * Returns a SolidJS accessor that updates whenever the selected slice changes.
 *
 * @param selector - Pure function that maps the full `GraphState` to a derived value.
 * @param equalityFn - Optional equality check (default: strict reference equality `===`).
 */
export function createGraphStore<T>(
  selector: (state: GraphState) => T,
  equalityFn?: (a: T, b: T) => boolean,
): () => T {
  const eq = equalityFn ?? ((a, b) => a === b);
  const initial = selector(useGraphStore.getState());
  const [value, setValue] = createSignal<T>(initial);

  const unsub = useGraphStore.subscribe(
    selector,
    (next, prev) => {
      if (!eq(next, prev)) {
        setValue(() => next);
      }
    },
  );

  onCleanup(() => unsub());

  return value;
}
