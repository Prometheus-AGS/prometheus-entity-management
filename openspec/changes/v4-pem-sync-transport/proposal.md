# Proposal: v4-pem-sync-transport — PEM transport integration

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 5 · Depends on: v4-entity-sync-ts-sdk

## Summary

Add `prometheusSync()` transport factory to `@prometheus-ags/entity-sync-pglite` that implements PEM's `EntityTransport<T>` interface, enabling `registerEntityTransport('Todo', prometheusSync({...}))`.

## Design

```typescript
// packages/entity-sync-pglite/src/pem-transport.ts
import type { EntityTransport } from '@prometheus-ags/entity-graph-core';

export function prometheusSync<T>(config: {
  serverUrl: string;
  bucket: string;
  getToken: () => Promise<string>;
  table: string;
  primaryKey: keyof T;
  entityType: string;
}): EntityTransport<T>
```

The transport:
1. Opens `SyncClient` WebSocket connection on first `fetch()` call
2. Subscribes to `config.bucket`
3. Maps incoming `Delta` ops to `upsertEntity` / `removeEntity` calls on the PEM graph
4. Maps outgoing `useEntityMutation` calls to `SyncClient.write()` messages
5. Exposes `status` observable matching PEM's transport status model
6. Handles reconnect transparently — PEM components see no interruption

## PEM example update

`examples/vite-app/src/shared/db/entity-transports.ts`:

```typescript
import { prometheusSync } from '@prometheus-ags/entity-sync-pglite';
import { registerEntityTransport } from '@prometheus-ags/entity-graph-core';

registerEntityTransport('Todo', prometheusSync({
  serverUrl: import.meta.env.VITE_SYNC_URL,
  bucket: 'user_todos',
  getToken: () => supabase.auth.getSession().then(s => s.data.session!.access_token),
  table: 'todos',
  primaryKey: 'id',
  entityType: 'Todo',
}));
```

## Success criteria

- [ ] PEM Vite example compiles and runs with `prometheusSync` transport
- [ ] Two browser tabs signed in as different users see only their own todos
- [ ] Write from tab A appears in tab A and tab B within 500ms (same user)
- [ ] `useEntityMutation` optimistic update + server confirm cycle works
- [ ] `pnpm run typecheck:vite` passes with zero errors
