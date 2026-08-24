# `@prometheus-ags/entity-graph-sync`

Pluggable peer-sync providers for the entity graph. It ships Yjs and Loro
providers, deterministic loopback and reconnecting WebSocket Loro channels,
and client-owned registries for isolated stores, workers, SSR requests, and
multi-client tests.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│  Entity Graph (Zustand store — canonical source of truth)│
│  @prometheus-ags/entity-graph-core                       │
└─────────────────────────┬───────────────────────────────┘
                           │ subscribe / upsertEntity
            ┌──────────────▼──────────────┐
            │   Sync Bridge (bridge.ts)    │
            │   - graph → pushLocalChange  │
            │   - applyPeerChanges → graph │
            └──────┬───────────────┬───────┘
                   │               │
       ┌───────────▼───┐   ┌───────▼──────────┐
       │  YjsProvider  │   │  LoroProvider     │
       │  (WebSocket / │   │  (binary snapshot │
       │   WebRTC)     │   │   over LoroChannel│
       └───────────────┘   └──────────────────┘
```

The bridge listens to the entity graph. When an entity type has a registered
provider, every local `upsertEntity` call is forwarded to `provider.pushLocalChange`.
Incoming peer changes are applied via `applyPeerChanges` which calls `upsertEntity`
and tags the entity with `$origin: "server"` sync metadata.

---

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-sync
```

### Optional peer dependencies

| Peer | Required for |
|------|--------------|
| `yjs` | Yjs provider |
| `y-websocket` | Yjs WebSocket transport |
| `y-webrtc` | Yjs WebRTC transport |
| `loro-crdt` `>=1.13.9 <2` | Loro provider |

Install only what you need:

```bash
# Yjs (WebSocket)
pnpm add yjs y-websocket

# Yjs (WebRTC)
pnpm add yjs y-webrtc

# Loro CRDT
pnpm add @prometheus-ags/entity-graph-sync loro-crdt@^1.13.9
```

---

## Quick start

### Yjs + WebSocket

```ts
import { createYjsProvider, registerSyncProvider, startSyncBridge } from "@prometheus-ags/entity-graph-sync";

const provider = createYjsProvider({
  transport: "websocket",
  wsServerUrl: "ws://localhost:1234",  // run: npx y-websocket
});

registerSyncProvider({ entityTypes: ["Document", "Comment"], provider });

const bridge = await startSyncBridge();

// Cleanup
bridge.stop();
```

### Yjs + WebRTC (peer-to-peer)

```ts
const provider = createYjsProvider({
  transport: "webrtc",
  webrtcOpts: { signaling: ["wss://signaling.yjs.dev"] },
});

registerSyncProvider({ entityTypes: ["Whiteboard"], provider });
const bridge = await startSyncBridge();
```

### Yjs + both transports (resilient)

```ts
const provider = createYjsProvider({
  transport: "both",
  wsServerUrl: "ws://localhost:1234",
});
```

### Loro CRDT + WebSocket channel

```ts
import {
  createLoroProvider,
  createWebSocketLoroChannel,
  registerSyncProvider,
  startSyncBridge,
} from "@prometheus-ags/entity-graph-sync";

const channel = createWebSocketLoroChannel("ws://localhost:8080");
const provider = createLoroProvider({
  channel,
  peerId: 101, // stable and unique for this replica
  loadLoro: () => import("loro-crdt"), // make the optional peer visible to browser bundlers
  onError: (error, operation) => reportSyncFailure(operation, error),
});

registerSyncProvider({ entityTypes: ["Task", "Note"], provider });
const bridge = await startSyncBridge();
```

The Loro provider automatically calls
`createLoroMergeStrategy()` from `@prometheus-ags/entity-graph-core` and
registers it for the managed entity types — field-level concurrent writes
resolve via Loro CRDT semantics instead of LWW.

Opt out by passing `registerMergeStrategies: false`.

Vite and other browser bundlers should supply `loadLoro` as above. Node
consumers may omit it and use the provider's runtime optional-peer import.

### Two isolated clients

The default package registry and core graph remain convenient process-wide
singletons. Inject client-owned instances whenever two graphs live in one
process:

```ts
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  createLoroLoopbackNetwork,
  createLoroProvider,
  createSyncProviderRegistry,
  startSyncBridge,
} from "@prometheus-ags/entity-graph-sync";

const network = createLoroLoopbackNetwork({ autoFlush: false });

async function createClient(name: string, peerId: number) {
  const store = createGraphStore();
  const registry = createSyncProviderRegistry();
  registry.register({
    entityTypes: ["Task"],
    provider: createLoroProvider({
      channel: network.createChannel(name),
      peerId,
      registerMergeStrategies: false,
    }),
  });
  const bridge = await startSyncBridge({ store, registry, pushDebounceMs: 0 });
  return { store, bridge };
}
```

`createLoroLoopbackNetwork()` retains each peer's latest snapshot while it is
offline and exchanges current snapshots in both directions on reconnect. With
`autoFlush: false`, `flush("fifo")` and `flush("reverse")` provide a controlled
convergence oracle; they are not substitutes for the real WebSocket lane.

---

## Custom providers

Implement `SyncProvider` to wire any transport:

```ts
import type { SyncProvider, PeerChangeHandler } from "@prometheus-ags/entity-graph-sync";

const myProvider: SyncProvider = {
  name: "my-custom-sync",

  async start(entityTypes, onPeerChange) {
    // Connect to your sync fabric.
    // Call onPeerChange([{ type, id, fields }]) when peers send updates.
  },

  pushLocalChange(type, id, fields) {
    // Forward the entity snapshot to peers.
  },

  stop() {
    // Disconnect and clean up.
  },
};
```

---

## API

### `registerSyncProvider(opts)`

Register a provider for one or more entity types. Replaces any prior
registration for those types.

```ts
registerSyncProvider({ entityTypes: ["Document"], provider });
```

### `startSyncBridge(opts?)`

Start all registered providers and subscribe to the graph.
Returns a `SyncBridgeHandle` with a `stop()` method.

| Option | Default | Description |
|--------|---------|-------------|
| `pushDebounceMs` | `16` | Debounce window (ms) for coalescing rapid writes before pushing to providers. `0` = synchronous. |
| `store` | core `graphStore` | Graph store owned by this client. Inject `createGraphStore()` for isolation. |
| `registry` | default sync registry | Provider registry owned by this client. Inject `createSyncProviderRegistry()` for isolation. |

### `applyPeerChanges(changes, store?)`

Inbound path: apply peer changes directly into the selected entity graph.
Called automatically by the bridge; exposed for advanced use cases.

### `createSyncProviderRegistry()`

Create provider registration state owned by one client. Its `register`,
`getProvider`, `getAllProviders`, `getRegisteredTypes`, `getTypesForProvider`,
and `clear` methods mirror the package-level default-registry functions.
`getDefaultSyncProviderRegistry()` exposes the backwards-compatible default.

### `createYjsProvider(opts)`

| Option | Default | Description |
|--------|---------|-------------|
| `transport` | `"websocket"` | `"websocket"`, `"webrtc"`, or `"both"` |
| `wsServerUrl` | — | WebSocket server URL (required for `websocket`/`both`) |
| `roomPrefix` | `"entity-graph"` | Room name prefix; each type appends `/{type}` |
| `webrtcOpts` | `{}` | Extra options for `WebrtcProvider` |

### `createLoroProvider(opts)`

| Option | Default | Description |
|--------|---------|-------------|
| `channel` | — | `LoroChannel` implementation (required) |
| `loadLoro` | runtime optional-peer import | Bundler-visible `() => import("loro-crdt")`; recommended for browser builds. |
| `registerMergeStrategies` | `true` | Register Loro CRDT merge strategy for managed types |
| `peerId` | Loro-generated | Stable numeric replica identity. Use distinct IDs for deterministic conflict tests. |
| `onError` | `console.error` | Receives `start`, `import`, and `export` failures; failures are never silently discarded. |

### `createWebSocketLoroChannel(url, options?)`

Built-in `LoroChannel` that retains the latest local snapshot per type, queues
offline writes, reconnects with bounded exponential delay, and requests peer
snapshots after every connection. Entity framing is
`[1 byte: type length][N bytes: type string][M bytes: Loro snapshot]`; the
otherwise-invalid one-byte zero frame is a collision-free sync request.

| Option | Default | Description |
| --- | --- | --- |
| `reconnect.enabled` | `true` | Reconnect after unexpected close. |
| `reconnect.initialDelayMs` | `100` | First reconnect delay. |
| `reconnect.maxDelayMs` | `5000` | Backoff ceiling. |
| `reconnect.maxAttempts` | `Infinity` | Attempt ceiling; exhaustion reports an error. |
| `webSocketConstructor` | `globalThis.WebSocket` | Constructor injection for non-browser hosts and tests. |
| `onError` | — | Transport diagnostic callback. |

The relay server broadcasts opaque binary frames to other clients. It must not
rewrite payloads or consume the sync-request control frame.

### `createLoroLoopbackNetwork(options?)`

Create the deterministic reference fabric. Each named channel retains its
latest full snapshot while disconnected. Reconnecting queues a bidirectional
exchange with all connected peers. `autoFlush` defaults to `true`; disable it
to inspect `getPendingCount()` and call `flush("fifo" | "reverse")` explicitly.

This is a merge/reconnect oracle, not browser or real-socket evidence. The
mandatory release gate separately executes `loro-websocket.integration.test.ts`
against an actual ephemeral relay.

---

## SyncProvider interface

```ts
interface SyncProvider {
  readonly name: string;
  start(entityTypes: ReadonlyArray<string>, onPeerChange: PeerChangeHandler): Promise<void>;
  pushLocalChange(type: string, id: string, fields: Record<string, unknown>): void;
  stop(): void;
  getDoc?(type: string, id: string): unknown | undefined;
}
```

---

## Architecture notes

- **No CRDT in the bridge**: the bridge is transport-agnostic; all CRDT logic
  lives inside providers. Yjs uses its own CRDT under the hood; Loro delegates
  to `createLoroMergeStrategy` from core.
- **One doc per entity type**: partitioning by type keeps document sizes
  manageable and scopes Y.js / Loro room subscriptions.
- **Deterministic child identity**: Loro entities use `ensureMergeableMap`, so
  two offline peers that first create the same ID merge one child container.
- **No inbound echo**: the bridge marks peer-originated entity transitions
  synchronously and does not publish them as new local writes.
- **Conflict policy**: different-field edits survive. For same-field edits at
  equal logical counters, Loro's LWW map selects the higher peer ID; all delivery
  orders must still converge.
- **Idempotent pushes**: `pushLocalChange` receives the same data the graph
  just wrote, so calling it more than once for the same state is safe.
- **Debounce window**: the default 16ms debounce coalesces rapid graph writes
  (e.g. bulk imports) into a single push per entity, reducing peer traffic.

---

## Release verification

```bash
pnpm run test:sync-persistence
pnpm run verify:sync-persistence
pnpm run bdd:sync-persistence
pnpm --filter @prometheus-ags/entity-graph-sync test:websocket-integration
```

The mandatory path proves real PGlite filesystem close/reopen, two isolated
Loro stores, FIFO and reverse delivery, different-field preservation,
same-field deterministic resolution, inbound echo suppression, real socket
termination/reconnect, packed ESM/CommonJS runtime, and NodeNext declarations.
It contains no conditional dependency skip.

This headless package evidence does not certify a browser or mobile UI. The
Vite, Next.js, Flutter, Tauri, A2UI, Docusaurus, accessibility, screenshot,
trace, and device receipts remain separately owned work. The sibling
`prometheus-entity-sync` repository is explicit opt-in integration evidence.
Maintainers can manually dispatch `.github/workflows/entity-sync-contract.yml`;
it packs the current core candidate, installs that tarball into a fresh sibling
checkout, and runs the sibling TypeScript contracts. It has no push or pull
request trigger, is not part of the mandatory local gate, and never uses a
developer-local `link:` path.

---

## License

MIT
