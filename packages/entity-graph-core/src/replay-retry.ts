import type { GraphActionRecord, ReplayRetryPolicy } from "./local-first-types";

/**
 * Replay retry policy: defaults, exponential backoff, and jitter.
 *
 * Separated from the runtime because it is pure scheduling arithmetic — it
 * touches no store, no adapter, and no persisted state, and is the part most
 * likely to be reasoned about (or tuned) on its own.
 */

export interface ResolvedRetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: "full" | "equal" | "none";
  poisonHandler?: (action: GraphActionRecord, error: unknown) => void | Promise<void>;
}

export function resolveRetryPolicy(policy?: ReplayRetryPolicy): ResolvedRetryPolicy {
  return {
    maxAttempts: policy?.maxAttempts ?? 5,
    initialDelayMs: policy?.initialDelayMs ?? 500,
    maxDelayMs: policy?.maxDelayMs ?? 30_000,
    backoffFactor: policy?.backoffFactor ?? 2,
    jitter: policy?.jitter ?? "equal",
    poisonHandler: policy?.poisonHandler,
  };
}

export function computeDelay(policy: ResolvedRetryPolicy, attempt: number): number {
  const base = Math.min(
    policy.initialDelayMs * Math.pow(policy.backoffFactor, Math.max(0, attempt - 1)),
    policy.maxDelayMs,
  );
  switch (policy.jitter) {
    case "none":
      return base;
    case "full":
      return Math.random() * base;
    case "equal":
    default:
      return base / 2 + Math.random() * (base / 2);
  }
}

