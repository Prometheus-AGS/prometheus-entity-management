/**
 * Next.js counterpart to `examples/vite-app/src/lib/entity-sync-transport.ts`
 * — see that file's doc comment for the full rationale (proposal targeted a
 * pre-v3.0.0-restructure `src/shared/db/entity-transports.ts` path that no
 * longer exists; this app's `Task` reads/writes still go through the 1.x
 * `useEntityList`/`useEntity` + mock-backend pattern, not this transport).
 *
 * `PGlite.create()` and the resulting WASM database are browser/client-only
 * — this module must only be imported from a Client Component
 * (`"use client"` boundary), never from a Server Component or Route Handler.
 */

import { PGlite } from "@electric-sql/pglite";
import { prometheusSyncTransport } from "@prometheus-ags/entity-sync-pglite";
import { registerEntityTransport } from "@prometheus-ags/prometheus-entity-management";
import type { Task } from "@/types";

export async function registerTaskSyncTransport(config: {
  serverUrl: string;
  bucket: string;
  getToken: () => Promise<string>;
}): Promise<void> {
  const db = await PGlite.create();
  await db.exec(
    `CREATE TABLE IF NOT EXISTS tasks (
       id UUID PRIMARY KEY,
       payload TEXT,
       crdt_state TEXT
     )`,
  );

  const transport = prometheusSyncTransport<Task>({
    serverUrl: config.serverUrl,
    bucket: config.bucket,
    getToken: config.getToken,
    table: "tasks",
    primaryKey: "id",
    entityType: "Task",
    db,
  });

  registerEntityTransport("Task", transport);
}
