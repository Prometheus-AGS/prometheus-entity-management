/**
 * platform/web-bridge.ts
 *
 * Deterministic in-browser fallback so the identical frontend runs under
 * `vite dev` and Playwright without a native shell (design D-2). Persistence
 * uses localStorage behind the same bridge contract; receipts mirror the
 * native panel so screenshots are comparable across lanes.
 */
import type { BridgeReceipt, PlatformBridge, PlatformPingResult } from "./bridge";

const STORAGE_KEY = "prometheus-tauri-universal:mirror";

export class WebBridge implements PlatformBridge {
  readonly kind = "web" as const;

  private readonly log: BridgeReceipt[] = [];
  private readonly mirror = new Map<string, Record<string, unknown>>();

  private record(action: string, detail: string): void {
    this.log.push({ at: new Date().toISOString(), action, ok: true, detail });
  }

  lane(): Promise<PlatformPingResult> {
    this.record("platformPing", "web fallback");
    return Promise.resolve({ plugin: "entity-graph-tauri", platform: "web" });
  }

  mirrorUpsert(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void> {
    this.mirror.set(`${entityType}:${entityId}`, data);
    this.record("upsertEntity", `${entityType}:${entityId}`);
    return Promise.resolve();
  }

  mirrorRemove(entityType: string, entityId: string): Promise<void> {
    this.mirror.delete(`${entityType}:${entityId}`);
    this.record("removeEntity", `${entityType}:${entityId}`);
    return Promise.resolve();
  }

  persistNow(): Promise<void> {
    const payload = JSON.stringify([...this.mirror.entries()]);
    window.localStorage.setItem(STORAGE_KEY, payload);
    this.record("persistSnapshot", `${this.mirror.size} entities`);
    return Promise.resolve();
  }

  restoreNow(): Promise<void> {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    this.mirror.clear();
    if (raw) {
      for (const [key, value] of JSON.parse(raw) as [string, Record<string, unknown>][]) {
        this.mirror.set(key, value);
      }
    }
    this.record("restoreSnapshot", `${this.mirror.size} entities`);
    return Promise.resolve();
  }

  onLifecycleResumed(handler: () => void): () => void {
    const listener = () => handler();
    window.addEventListener("focus", listener);
    return () => window.removeEventListener("focus", listener);
  }

  onDeepLink(): () => void {
    // Browsers deliver deep links via the URL itself; no runtime channel.
    return () => {};
  }

  receipts(): BridgeReceipt[] {
    return [...this.log];
  }

  /** Test/debug handle: the mirrored native state. */
  mirrorSnapshot(): Record<string, Record<string, unknown>> {
    return Object.fromEntries(this.mirror);
  }
}
