# @prometheus-ags/entity-graph-tauri

Tauri v2 plugin that exposes the [`@prometheus-ags/entity-graph-core`](../entity-graph-core) entity graph as Tauri IPC commands and events, with [tauri-specta v2](https://github.com/oscartbeaumont/tauri-specta) generating fully typed TypeScript bindings from the Rust source.

---

## Features

- **Typed IPC commands** — `graph_upsert_entity`, `graph_remove_entity`, `graph_patch_entity`, `graph_set_list`, `graph_get_entity`, `graph_get_list`, `graph_persist_snapshot`, `graph_restore_snapshot`, `graph_clear`
- **Typed events** — `entity-changed`, `snapshot-persisted`, `snapshot-restored`, `error` emitted Rust → TS
- **Auto graph-store sync** — commands and events write directly into the core Zustand graph store so all reactive subscribers update immediately
- **SQLite persistence** — wraps the core `createTauriSqlPersistenceAdapter` for snapshot save/restore
- **tauri-specta v2 bindings** — run `cargo build --features generate-bindings` to regenerate `src/generated-bindings.ts`

---

## Installation

### TypeScript (frontend)

```bash
pnpm add @prometheus-ags/entity-graph-tauri @tauri-apps/api
```

### Rust (Tauri app)

In your app's `Cargo.toml`:

```toml
[dependencies]
entity-graph-tauri = { path = "../../packages/entity-graph-tauri/rust-plugin" }
```

---

## Usage

### 1. Register the Rust plugin

```rust
// src-tauri/src/lib.rs
use entity_graph_tauri::EntityGraphPlugin;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(EntityGraphPlugin::new())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2. Initialise the TS plugin

```ts
// src/main.ts  (or App.svelte onMount, useEffect, etc.)
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createTauriGraphPlugin } from "@prometheus-ags/entity-graph-tauri";

const plugin = await createTauriGraphPlugin({
  invoke,
  listen,
  options: {
    storageKey: "my-app:graph",
    autoRestore: true, // restore persisted snapshot on startup
  },
});

// Cleanup on unload
window.addEventListener("beforeunload", () => plugin.dispose());
```

### 3. Use commands

```ts
// Upsert — mirrors into TS graph store immediately
await plugin.commands.upsertEntity({
  entityType: "User",
  entityId: "u-1",
  data: { name: "Alice", email: "alice@example.com" },
});

// Remove
await plugin.commands.removeEntity({ entityType: "User", entityId: "u-1" });

// Persist snapshot to SQLite
await plugin.commands.persistSnapshot();
```

### 4. React to events from Rust

```ts
import { listenEntityChanged } from "@prometheus-ags/entity-graph-tauri";
import { listen } from "@tauri-apps/api/event";

const unsub = await listenEntityChanged(listen, (event) => {
  console.log("entity changed", event.entityType, event.entityId);
});

// Later:
unsub();
```

---

## Regenerating TypeScript bindings

```bash
cargo build \
  --manifest-path packages/entity-graph-tauri/rust-plugin/Cargo.toml \
  --features generate-bindings
```

This writes `src/generated-bindings.ts` with exact Rust-mirrored types via `specta-typescript`.

---

## Architecture

```
Tauri Frontend (TS)                      Rust Plugin
─────────────────────────────────────   ──────────────────────────────────
createTauriGraphPlugin()
  │
  ├── commands.ts          ──IPC──►   commands.rs (#[tauri::command])
  │   upsertEntity()                    graph_upsert_entity()
  │   removeEntity()                    graph_remove_entity()
  │   persistSnapshot()                 graph_persist_snapshot()
  │   …                                 …
  │
  ├── events.ts            ◄──event──  lib.rs (app.emit())
  │   listenEntityChanged()              entity-graph://entity-changed
  │   listenSnapshotPersisted()          entity-graph://snapshot-persisted
  │   …
  │
  └── useGraphStore        ◄──write──  commands + events apply mutations
      (entity-graph-core)
```

---

## License

MIT
