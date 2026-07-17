# Proposal: v4-entity-sync-ts-sdk — TypeScript client SDK

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 5 · Depends on: v4-psync-protocol, v4-pes-server-binary

## Summary

Three TypeScript packages delivering the browser-side sync client:
- `@prometheus-ags/entity-sync-core` — protocol client, reconnect, JWT management
- `@prometheus-ags/entity-sync-pglite` — PGlite extension applying delta ops to local DB
- `@prometheus-ags/entity-sync-react` — React hooks

## entity-sync-core API

```typescript
export interface SyncClientConfig {
  serverUrl: string;          // wss://sync.example.com
  getToken: () => Promise<string>;  // called on connect + refresh
  onStatus?: (status: SyncStatus) => void;
}

export type SyncStatus =
  | { state: 'connecting' }
  | { state: 'syncing'; lsn: string }
  | { state: 'live'; lsn: string }
  | { state: 'error'; error: Error }
  | { state: 'disconnected' };

export class SyncClient {
  constructor(config: SyncClientConfig);
  subscribe(buckets: string[], resumeLsn?: string): void;
  onDelta(handler: (delta: Delta) => void): () => void;
  onSnapshot(handler: (batch: SnapshotBatch) => void): () => void;
  write(entityType: string, entityId: string, op: Op): Promise<void>;
  disconnect(): void;
}
```

Reconnect: exponential backoff starting at 1s, max 30s, with ±20% jitter. JWT refresh: call `getToken()` 60 seconds before current token expiry.

## entity-sync-pglite API

```typescript
// PGlite extension
export function prometheusSync(config: SyncClientConfig): Extension;

// Extension adds db.sync namespace:
db.sync.subscribeBucket(bucket: string, options?: { resumeLsn?: string }): Promise<void>;
db.sync.getStatus(): SyncStatus;
db.sync.pause(): void;
db.sync.resume(): void;
```

The extension applies delta ops as SQL mutations to the local PGlite instance using `db.exec()` within transactions.

## entity-sync-react API

```typescript
export function useEntitySync(config: SyncClientConfig): {
  status: SyncStatus;
  subscribe: (buckets: string[]) => void;
};

export function useSyncStatus(): SyncStatus;
```

## Success criteria

- [ ] Vite example app: two tabs sync bidirectionally within 500ms
- [ ] Offline/reconnect: tab goes offline 30s, reconnects, receives all deltas without full re-snapshot
- [ ] JWT expiry handled: `getToken()` called proactively, no visible disconnect
- [ ] TypeScript strict mode: zero type errors
- [ ] Bundle size: `entity-sync-core` < 20 KB gzipped
