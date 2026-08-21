/**
 * platform/tauri-bridge.ts
 *
 * Native bridge: binds the certified `@prometheus-ags/entity-graph-tauri`
 * plugin commands and the official deep-link plugin. All capability failures
 * are wrapped in `BridgeDeniedError` so denial is observable, never silent.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { createTauriGraphPlugin, type TauriGraphPlugin } from "@prometheus-ags/entity-graph-tauri";
import {
  BridgeDeniedError,
  parseTaskDeepLink,
  type BridgeReceipt,
  type PlatformBridge,
  type PlatformPingResult,
} from "./bridge";

const STORAGE_KEY = "prometheus-tauri-universal:graph";

export class TauriBridge implements PlatformBridge {
  readonly kind = "tauri" as const;

  private plugin: TauriGraphPlugin | null = null;
  private readonly log: BridgeReceipt[] = [];

  private record(action: string, ok: boolean, detail: string): void {
    this.log.push({ at: new Date().toISOString(), action, ok, detail });
  }

  private async ready(): Promise<TauriGraphPlugin> {
    if (!this.plugin) {
      this.plugin = await createTauriGraphPlugin({
        invoke,
        listen,
        options: { storageKey: STORAGE_KEY, autoRestore: true },
      });
    }
    return this.plugin;
  }

  private async guard<T>(action: string, run: () => Promise<T>): Promise<T> {
    try {
      const result = await run();
      this.record(action, true, "ok");
      return result;
    } catch (cause) {
      this.record(action, false, cause instanceof Error ? cause.message : String(cause));
      throw new BridgeDeniedError(action, cause);
    }
  }

  async lane(): Promise<PlatformPingResult> {
    const plugin = await this.ready();
    return this.guard("platformPing", () => plugin.commands.platformPing());
  }

  async mirrorUpsert(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void> {
    const plugin = await this.ready();
    await this.guard("upsertEntity", () => plugin.commands.upsertEntity({ entityType, entityId, data }));
  }

  async mirrorRemove(entityType: string, entityId: string): Promise<void> {
    const plugin = await this.ready();
    await this.guard("removeEntity", () => plugin.commands.removeEntity({ entityType, entityId }));
  }

  async persistNow(): Promise<void> {
    const plugin = await this.ready();
    await this.guard("persistSnapshot", () => plugin.commands.persistSnapshot());
  }

  async restoreNow(): Promise<void> {
    const plugin = await this.ready();
    await this.guard("restoreSnapshot", () => plugin.commands.restoreSnapshot());
  }

  onLifecycleResumed(handler: () => void): () => void {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    void listen("tauri://focus", () => handler()).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }

  onDeepLink(handler: (taskId: string) => void): () => void {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    void onOpenUrl((urls) => {
      for (const url of urls) {
        const taskId = parseTaskDeepLink(url);
        if (taskId) handler(taskId);
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }

  receipts(): BridgeReceipt[] {
    return [...this.log];
  }

  async dispose(): Promise<void> {
    await this.plugin?.dispose();
    this.plugin = null;
  }
}
