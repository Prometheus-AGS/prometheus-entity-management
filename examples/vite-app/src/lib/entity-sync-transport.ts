/**
 * Demonstrates registering `prometheus-entity-sync` as the `Task` entity's
 * transport via the 2.0 `registerEntityTransport` registry, using
 * `@prometheus-ags/entity-sync-pglite`'s `prometheusSyncTransport`.
 *
 * NOT wired into the app's actual data flow (`features/tasks/task-hooks.ts`
 * still reads through the 1.x `useEntityList`/`useEntity` + `taskStore`
 * mock-backend pattern established by this example before the v3.0.0
 * monorepo restructure). This file exists to prove the registration API
 * compiles and composes correctly against the current package versions —
 * see `openspec/changes/v4-pem-sync-transport/proposal.md`'s example,
 * which targeted a pre-restructure `src/shared/db/entity-transports.ts`
 * path that no longer exists in this app.
 *
 * To actually route `Task` reads/writes through this transport, a follow-up
 * change would need to migrate `task-hooks.ts` from `useEntityList`/
 * `useEntity` (inline `fetch:` closures) to `useEntities`/`useEntityQuery`
 * (registry-based, per `@prometheus-ags/prometheus-entity-management`'s
 * 2.0 architecture) — out of scope here.
 *
 * `@prometheus-ags/entity-sync-core` and `@prometheus-ags/entity-sync-pglite`
 * are currently linked from the sibling `prometheus-entity-sync` repo via a
 * `link:` dependency in this package's `package.json` (not published to npm
 * yet) — see that file's comment for why.
 */

import { PGlite } from "@electric-sql/pglite";
import { prometheusSyncTransport } from "@prometheus-ags/entity-sync-pglite";
import { registerEntityTransport } from "@prometheus-ags/prometheus-entity-management";
import type { Task } from "@/types";

/**
 * Call once at app boot (guarded — see `registerTaskSyncTransport`'s doc
 * comment) to register `prometheusSyncTransport` for the `Task` entity
 * type. Left unregistered by default; call `registerTaskSyncTransport()`
 * explicitly from an app entry point to opt in.
 */
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
