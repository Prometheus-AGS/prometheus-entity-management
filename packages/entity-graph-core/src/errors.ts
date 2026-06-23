/**
 * Typed errors used throughout 2.0 to drive retry policy and consumer
 * UI decisions.
 *
 * Why two classes (not a discriminator field):
 * - `instanceof` checks are zero-cost at runtime and survive bundler
 *   minification of property names.
 * - Consumers can write `if (error instanceof TerminalError) renderInline()`
 *   without importing a type-narrowing helper.
 * - The engine's retry policy is one `instanceof TransientError` check.
 *
 * 4xx → `TerminalError` (no retry — the request is structurally wrong:
 * unauthorized, not-found, schema mismatch, validation failure).
 *
 * 5xx + network failures → `TransientError` (engine retries with
 * exponential backoff up to `maxRetries`).
 *
 * Custom transports can throw either class. The default REST helper
 * (`makeRestTransport`) maps HTTP status codes to the appropriate
 * class automatically.
 *
 * Both classes preserve the original error via the standard
 * `cause` option so stack traces survive the boundary.
 */

export interface EntityErrorOptions {
  /** HTTP status if the underlying transport was HTTP. */
  status?: number;
  /** Original thrown value (`Error`, `Response`, anything). */
  cause?: unknown;
}

/**
 * Permanent failure — do not retry. The request will not succeed by
 * trying again with the same inputs.
 *
 * Typical sources: HTTP 4xx, missing tables, validation errors,
 * permission denied, schema mismatches.
 */
export class TerminalError extends Error {
  readonly kind = "terminal" as const;
  readonly status?: number;

  constructor(message: string, opts: EntityErrorOptions = {}) {
    super(message, { cause: opts.cause });
    this.name = "TerminalError";
    this.status = opts.status;
    // Preserve stack across minification / older runtimes.
    if (typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === "function") {
      (Error as unknown as { captureStackTrace: (target: object, ctor: unknown) => void })
        .captureStackTrace(this, TerminalError);
    }
  }
}

/**
 * Temporary failure — safe to retry. The engine will retry with
 * exponential backoff up to the configured `maxRetries`.
 *
 * Typical sources: HTTP 5xx, network timeouts, fetch rejections,
 * dropped sockets.
 */
export class TransientError extends Error {
  readonly kind = "transient" as const;
  readonly status?: number;

  constructor(message: string, opts: EntityErrorOptions = {}) {
    super(message, { cause: opts.cause });
    this.name = "TransientError";
    this.status = opts.status;
    if (typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === "function") {
      (Error as unknown as { captureStackTrace: (target: object, ctor: unknown) => void })
        .captureStackTrace(this, TransientError);
    }
  }
}

/**
 * Union of every typed error the library raises. Use on consumer-side
 * `error` props when both classes are possible.
 */
export type EntityError = TerminalError | TransientError;

/**
 * Convert an unknown thrown value into a typed entity error.
 *
 * - Already-typed errors pass through.
 * - HTTP-status-bearing errors become Terminal (4xx) or Transient (5xx).
 * - `AbortError` / `DOMException` "AbortError" → Terminal (caller
 *   cancelled; not worth retrying).
 * - Everything else → Transient (assume retryable; better than
 *   accidentally permanently failing on a one-off network blip).
 */
export function toEntityError(err: unknown): EntityError {
  if (err instanceof TerminalError) return err;
  if (err instanceof TransientError) return err;

  // Abort surfaces as DOMException("AbortError") in browsers and as
  // `Error` with name "AbortError" in node — treat both as terminal.
  if (err && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "AbortError") {
    return new TerminalError("Aborted", { cause: err });
  }

  // Plain object with a `status` field (e.g. a thrown Response or
  // PostgrestError shape).
  if (err && typeof err === "object" && "status" in err) {
    const status = Number((err as { status?: unknown }).status);
    const message = (err && typeof err === "object" && "message" in err)
      ? String((err as { message?: unknown }).message ?? `HTTP ${status}`)
      : `HTTP ${status}`;
    if (Number.isFinite(status) && status >= 400 && status < 500) {
      return new TerminalError(message, { status, cause: err });
    }
    if (Number.isFinite(status) && status >= 500) {
      return new TransientError(message, { status, cause: err });
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  return new TransientError(message, { cause: err });
}
