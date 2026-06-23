/**
 * store.ts — In-memory task store for the A2A server.
 *
 * Stores active tasks keyed by task id. Suitable for development and testing.
 * For production deployments, implement A2ATaskStore backed by a database.
 *
 * Architecture note: this store is entirely separate from the entity graph store.
 * Tasks are A2A protocol objects, not domain entities. If you want tasks to be
 * visible in the entity graph (e.g. for a UI that tracks ongoing agent work),
 * upsert them via the graph inside a task handler — do not couple this store
 * to the entity graph directly.
 */

import type { A2ATaskStore, Task } from "./types.js";

/**
 * MemoryTaskStore — simple Map-backed task store.
 *
 * Not suitable for multi-process deployments. For horizontal scaling, implement
 * A2ATaskStore against Redis, PostgreSQL, or any key-value store.
 */
export class MemoryTaskStore implements A2ATaskStore {
  private readonly tasks = new Map<string, Task>();

  async get(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async set(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  /** Snapshot of all stored tasks (useful for testing). */
  snapshot(): Task[] {
    return Array.from(this.tasks.values());
  }

  /** Clear all tasks (useful for test isolation). */
  clear(): void {
    this.tasks.clear();
  }
}
