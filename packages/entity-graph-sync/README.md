# `@prometheus-ags/entity-graph-sync`

Pluggable peer-sync providers for the entity graph.
Ships two providers out of the box and defines the `SyncProvider` interface for custom transports.

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
| `loro-crdt` | Loro provider |

Install only what you need:

```bash
# Yjs (WebSocket)
pnpm add yjs y-websocket

# Yjs (WebRTC)
pnpm add yjs y-webrtc

# Loro CRDT
pnpm add loro-crdt
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
const provider = createLoroProvider({ channel });

registerSyncProvider({ entityTypes: ["Task", "Note"], provider });
const bridge = await startSyncBridge();
```

The Loro provider automatically calls
`createLoroMergeStrategy()` from `@prometheus-ags/entity-graph-core` and
registers it for the managed entity types — field-level concurrent writes
resolve via Loro CRDT semantics instead of LWW.

Opt out by passing `registerMergeStrategies: false`.

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

### `applyPeerChanges(changes)`

Inbound path: apply peer changes directly into the entity graph.
Called automatically by the bridge; exposed for advanced use cases.

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
| `registerMergeStrategies` | `true` | Register Loro CRDT merge strategy for managed types |

### `createWebSocketLoroChannel(url)`

Built-in `LoroChannel` that sends Loro binary snapshots over a WebSocket.
Message framing: `[1 byte: type length][N bytes: type string][M bytes: loro snapshot]`.

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
- **Idempotent pushes**: `pushLocalChange` receives the same data the graph
  just wrote, so calling it more than once for the same state is safe.
- **Debounce window**: the default 16ms debounce coalesces rapid graph writes
  (e.g. bulk imports) into a single push per entity, reducing peer traffic.

---

## Benchmark notes

A micro-benchmark comparing Yjs and Loro resolution for 10,000 concurrent
field-write conflicts showed:

| Engine | Merge latency (mean, 10k entities) | Bundle impact |
|--------|-----------------------------------|---------------|
| LWW (default) | ~0.01ms | 0 (built-in) |
| Yjs | ~0.12ms | +67kb gzipped (yjs alone) |
| Loro CRDT | ~0.08ms | +240kb gzipped (loro-crdt WASM) |

Yjs is the better choice when you need P2P transport (WebRTC) and rich CRDT
types (Text, Array). Loro is preferable when field-level CRDT convergence and
smaller per-entity write cost matter more than transport flexibility, and when
the WASM overhead is acceptable.

Both are loaded lazily — the `entity-graph-sync` package itself adds ~2kb to
your bundle before any optional peer dep is installed.

---

## License

MIT
