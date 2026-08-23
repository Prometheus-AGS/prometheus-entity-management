/**
 * features/task-service.ts
 *
 * Application service layer: feature components call this module; this module
 * calls the graph store and the platform bridge. Components never touch the
 * store or `@tauri-apps/*` directly (repository layering rules, design D-2).
 *
 * Mutations are mirrored into the native graph through the bridge so the
 * Rust-side command channel is exercised on every CRUD operation; the bridge
 * receipt log records each native round trip for the platform panel.
 */
import {
  getRealtimeManager,
  useGraphStore,
  type ChangeSet,
  type RealtimeAdapter,
  type SubscriptionConfig,
  type UnsubscribeFn,
} from "@prometheus-ags/prometheus-entity-management";
import { SEED_TASKS } from "../domain/seed";
import type { Task } from "../domain/types";
import { getBridge } from "../platform";

/**
 * In-memory demo backend: the fetch/invalidation path must read through this
 * store, never the frozen seed, so revalidation after a mutation returns the
 * mutated values instead of reverting them.
 */
const backend = new Map<string, Task>(SEED_TASKS.map((task) => [task.id, { ...task }]));

export function listTasks(): Task[] {
  return [...backend.values()];
}

/** Seed the canonical graph once; lists store ids, never data. */
export function seedGraph(): void {
  const store = useGraphStore.getState();
  if ((store.lists['["tasks"]']?.ids.length ?? 0) > 0) return;
  for (const task of listTasks()) {
    store.upsertEntity("Task", task.id, task as unknown as Record<string, unknown>);
  }
  store.setListResult('["tasks"]', listTasks().map((task) => task.id), { total: backend.size });
}

/** Mirror a confirmed mutation into the native graph mirror. */
export async function mirrorTask(task: Task): Promise<void> {
  await getBridge().mirrorUpsert("Task", task.id, task as unknown as Record<string, unknown>);
}

export async function mirrorTaskRemoval(taskId: string): Promise<void> {
  await getBridge().mirrorRemove("Task", taskId);
}

/**
 * Deterministic in-process realtime source standing in for a remote channel
 * (WebSocket/Supabase/Electric in production). It speaks the same
 * `RealtimeAdapter` contract, so changes land through the certified
 * `RealtimeManager` 16ms coalescing window — repeated ticks collapse into one
 * graph write and one render (realtime.coalesced-cross-view scenario).
 */
class DemoRealtimeAdapter implements RealtimeAdapter {
  readonly name = "demo-remote";
  private handler: ((changeset: ChangeSet) => void) | null = null;

  subscribe(_config: SubscriptionConfig, handler: (changeset: ChangeSet) => void): UnsubscribeFn {
    this.handler = handler;
    return () => {
      this.handler = null;
    };
  }

  emit(changeset: ChangeSet): void {
    this.handler?.(changeset);
  }
}

const demoAdapter = new DemoRealtimeAdapter();
let realtimeRegistered = false;

export function ensureRealtimeChannel(): void {
  if (realtimeRegistered) return;
  getRealtimeManager().register(demoAdapter, [{ type: "Task" }]);
  realtimeRegistered = true;
}

/** Simulate a remote realtime update landing through the coalescing manager. */
export function simulateRemoteTaskChange(taskId: string, patch: Partial<Task>): void {
  ensureRealtimeChannel();
  const current = backend.get(taskId);
  if (current) backend.set(taskId, { ...current, ...patch, updatedAt: Date.now() });
  demoAdapter.emit({
    changes: [
      {
        op: "update",
        type: "Task",
        id: taskId,
        patch: { ...patch, updatedAt: Date.now() } as Partial<Record<string, unknown>>,
      },
    ],
  });
}

/**
 * One-tap status advance with optimistic confirm and exact rollback:
 * the graph updates instantly, the native mirror confirms, and a denial
 * restores the previous canonical value (crud.optimistic-confirm /
 * crud.optimistic-rollback scenarios). Kept in the service layer so the
 * one-click path cannot hit stale React edit-buffer closures.
 */
export async function advanceTaskStatus(taskId: string, next: Task["status"]): Promise<void> {
  const store = useGraphStore.getState();
  const previous = store.readEntity<Task>("Task", taskId);
  if (!previous) return;
  const previousSync = store.syncMetadata[`Task:${taskId}`];

  const optimistic = { ...previous, status: next, updatedAt: Date.now() };
  store.upsertEntity("Task", taskId, optimistic as unknown as Record<string, unknown>);
  store.setEntitySyncMetadata("Task", taskId, {
    synced: false,
    origin: "optimistic",
    updatedAt: Date.now(),
  });

  try {
    await mirrorTask(optimistic);
    backend.set(taskId, optimistic);
    store.replaceEntity("Task", taskId, optimistic as unknown as Record<string, unknown>);
    store.setEntitySyncMetadata("Task", taskId, {
      synced: true,
      origin: "server",
      updatedAt: Date.now(),
    });
  } catch (error) {
    store.replaceEntity("Task", taskId, previous as unknown as Record<string, unknown>);
    if (previousSync) store.setEntitySyncMetadata("Task", taskId, previousSync);
    else store.clearEntitySyncMetadata("Task", taskId);
    throw error;
  }
}
