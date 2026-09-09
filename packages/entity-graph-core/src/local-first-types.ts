/**
 * Types shared by the local-first runtime and its runtime scope.
 *
 * These live here, not in local-first-runtime.ts, because runtime-scope.ts
 * needs them too. Importing them from the runtime would make the two modules
 * import each other, and TypeScript resolves that cycle by widening the types
 * to `unknown` — which type-checks at the definition and fails at every use.
 */

export interface GraphSyncStatus {
  phase: "idle" | "hydrating" | "syncing" | "ready" | "offline" | "error";
  isOnline: boolean;
  isSynced: boolean;
  pendingActions: number;
  lastHydratedAt: string | null;
  lastPersistedAt: string | null;
  storageKey: string | null;
  error: string | null;
}

export interface GraphActionRecord {
  id: string;
  key: string;
  input: unknown;
  enqueuedAt: string;
}

export interface ReplayRetryPolicy {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: "full" | "equal" | "none";
  poisonHandler?: (action: GraphActionRecord, error: unknown) => void | Promise<void>;
}
