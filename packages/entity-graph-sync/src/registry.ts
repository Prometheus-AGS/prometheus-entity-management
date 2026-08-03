/**
 * registry.ts — Process-global registry mapping entity types → SyncProvider.
 *
 * Why global: mirrors the entity-graph-core transport registry pattern.
 * The graph store is already global (Zustand); having a separate React
 * context for sync providers would force every test, story, and non-React
 * call site to plumb the context for no gain.
 */

import type { EntityType } from "@prometheus-ags/entity-graph-core";
import type {
  RegisterSyncProviderOptions,
  SyncProvider,
  SyncProviderRegistry,
} from "./types";

/** Create a provider registry with client-local ownership. */
export function createSyncProviderRegistry(): SyncProviderRegistry {
  const providerByType = new Map<EntityType, SyncProvider>();

  return {
    register(opts) {
      const { entityTypes, provider } = opts;
      if (entityTypes.length === 0) {
        throw new Error(
          "[entity-graph-sync] registerSyncProvider: entityTypes must be non-empty.",
        );
      }
      for (const type of entityTypes) providerByType.set(type, provider);
    },
    getProvider(type) {
      return providerByType.get(type);
    },
    getAllProviders() {
      return new Set(providerByType.values());
    },
    getRegisteredTypes() {
      return Array.from(providerByType.keys());
    },
    getTypesForProvider(provider) {
      const types: EntityType[] = [];
      for (const [type, registered] of providerByType) {
        if (registered === provider) types.push(type);
      }
      return types;
    },
    clear() {
      providerByType.clear();
    },
  };
}

const defaultRegistry = createSyncProviderRegistry();

/** Return the backwards-compatible process-wide default registry. */
export function getDefaultSyncProviderRegistry(): SyncProviderRegistry {
  return defaultRegistry;
}

/**
 * Register a provider for one or more entity types.
 *
 * Re-registering a type replaces the prior provider. The replaced provider
 * is NOT stopped automatically — call `stopSyncProvider` first if needed.
 */
export function registerSyncProvider(opts: RegisterSyncProviderOptions): void {
  defaultRegistry.register(opts);
}

/**
 * Look up the provider for a specific entity type.
 * Returns `undefined` if no provider is registered for that type.
 */
export function getSyncProvider(type: EntityType): SyncProvider | undefined {
  return defaultRegistry.getProvider(type);
}

/**
 * Return all unique registered providers (a type may share a provider with
 * other types — the Set de-duplicates).
 */
export function getAllSyncProviders(): Set<SyncProvider> {
  return defaultRegistry.getAllProviders();
}

/**
 * Return all entity types that have a provider registered.
 */
export function getRegisteredSyncTypes(): EntityType[] {
  return defaultRegistry.getRegisteredTypes();
}

/**
 * Return all entity types managed by a specific provider instance.
 */
export function getTypesForProvider(provider: SyncProvider): EntityType[] {
  return defaultRegistry.getTypesForProvider(provider);
}

/**
 * Test-only: clear all registered providers.
 * Production code should never call this.
 */
export function __resetSyncRegistry(): void {
  defaultRegistry.clear();
}
