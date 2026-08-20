/**
 * Demo realtime adapter: a minimal in-memory RealtimeAdapter that lets the
 * console emit deterministic ChangeSet bursts through the coalescing
 * RealtimeManager — the same path Supabase/WebSocket adapters use.
 */
import type {
  ChangeSet,
  RealtimeAdapter,
  SubscriptionConfig,
  UnsubscribeFn,
} from "@prometheus-ags/prometheus-entity-management";

export class DemoRealtimeAdapter implements RealtimeAdapter {
  readonly name = "demo-realtime";
  private readonly listeners = new Set<(changeset: ChangeSet) => void>();

  subscribe(_config: SubscriptionConfig, onChange: (changeset: ChangeSet) => void): UnsubscribeFn {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  emit(changeset: ChangeSet): void {
    for (const listener of this.listeners) listener(changeset);
  }
}
