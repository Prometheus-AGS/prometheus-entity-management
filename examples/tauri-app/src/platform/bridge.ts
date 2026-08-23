/**
 * platform/bridge.ts
 *
 * The single platform-conditional seam of the universal example (design D-2).
 * Feature code talks to `PlatformBridge`; only this module and its two
 * implementations know whether the host is a native Tauri shell or a plain
 * browser (Playwright / vite dev).
 *
 * Fail-closed rule: a bridge method that the host rejects (capability denial,
 * undeclared command) throws `BridgeDeniedError`; callers surface it, they
 * never swallow it.
 */

export interface PlatformPingResult {
  plugin: string;
  platform: "desktop" | "android" | "ios" | "web";
}

export interface BridgeReceipt {
  at: string;
  action: string;
  ok: boolean;
  detail: string;
}

export interface PlatformBridge {
  readonly kind: "tauri" | "web";
  /** Human-readable lane label, e.g. "desktop", "android", "ios", "web". */
  lane(): Promise<PlatformPingResult>;
  /** Mirror one entity mutation into the native graph mirror. */
  mirrorUpsert(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
  mirrorRemove(entityType: string, entityId: string): Promise<void>;
  /** Persist the graph snapshot durably (offline restart path). */
  persistNow(): Promise<void>;
  /** Restore the persisted snapshot (app start / manual restart demo). */
  restoreNow(): Promise<void>;
  /** Subscribe to lifecycle resume/refocus; returns an unsubscribe. */
  onLifecycleResumed(handler: () => void): () => void;
  /** Subscribe to verified deep links; returns an unsubscribe. */
  onDeepLink(handler: (taskId: string) => void): () => void;
  /** Receipt log rendered by the platform panel. */
  receipts(): BridgeReceipt[];
}

/** Thrown when the native host denies a command (capability/permission). */
export class BridgeDeniedError extends Error {
  constructor(action: string, cause: unknown) {
    super(`native host denied ${action}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "BridgeDeniedError";
  }
}

const DEEP_LINK_PREFIX = "prometheus-tasks://task/";

/**
 * Parse and authorize a deep link. Fail-closed: anything that is not exactly
 * `prometheus-tasks://task/<id>` returns null (design D-4).
 */
export function parseTaskDeepLink(url: string): string | null {
  if (typeof url !== "string" || !url.startsWith(DEEP_LINK_PREFIX)) return null;
  const id = url.slice(DEEP_LINK_PREFIX.length).split(/[?#/]/)[0];
  return /^[a-z0-9-]+$/i.test(id) && id.length > 0 ? id : null;
}

/** True when running inside a Tauri webview. */
export function isTauriHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
