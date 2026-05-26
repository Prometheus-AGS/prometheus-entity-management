/**
 * Process-global registry of `EntityTransport` instances by entity type.
 *
 * Why global state: every consumer of `useEntities("Client")` must
 * resolve the SAME transport. Threading a registry through React
 * context would require every test, every isolated story, every
 * non-React caller (engine internals) to plumb the context — a tax
 * that buys nothing. The 1.x library already used module-global state
 * for the `useGraphStore` Zustand store; this follows the same shape.
 *
 * The registry is mutable: re-registering a type silently replaces the
 * prior transport (tests rely on this; production code should only
 * register once at app boot).
 */

import type { EntityType } from "../graph";
import type { EntityTransport } from "./types";

// Keyed by entity type. `unknown` because each entity has a different
// row shape; consumers cast at the `getEntityTransport<T>(type)` call site.
const transports = new Map<EntityType, EntityTransport<object>>();

/**
 * Register the transport for an entity type. Called once per type at
 * app boot, typically from `src/shared/db/entity-transports.ts` in the
 * consuming application.
 *
 * Re-registering REPLACES the prior transport — useful for tests, a
 * footgun for production code. If you find yourself re-registering at
 * runtime, you almost certainly want a different design.
 */
export function registerEntityTransport<T extends object>(
  type: EntityType,
  transport: EntityTransport<T>,
): void {
  transports.set(type, transport as unknown as EntityTransport<object>);
}

/**
 * Look up the transport for an entity type. Throws if none is
 * registered — there is no "default" transport, by design.
 *
 * The cast to `EntityTransport<T>` is the API ergonomic
 * compromise that lets call sites stay generic; the registry stores
 * `EntityTransport<object>` because TypeScript can't otherwise unify
 * heterogeneous rows in one map.
 */
export function getEntityTransport<T extends object>(
  type: EntityType,
): EntityTransport<T> {
  const t = transports.get(type);
  if (!t) {
    throw new Error(
      `[entity-management] No transport registered for entity type "${type}". ` +
      `Call registerEntityTransport("${type}", ...) at app boot.`,
    );
  }
  return t as unknown as EntityTransport<T>;
}

/**
 * Test-only: clear ALL registered transports. Production code should
 * never need this; tests use it to reset between specs.
 */
export function __resetEntityTransports(): void {
  transports.clear();
}

/**
 * Introspection: how many transports are currently registered.
 * Useful for asserting in tests that boot wiring ran exactly once.
 */
export function getRegisteredEntityTypes(): EntityType[] {
  return Array.from(transports.keys());
}
