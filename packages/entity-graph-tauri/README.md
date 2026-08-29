# @prometheus-ags/entity-graph-tauri

Tauri v2 plugin that exposes the [`@prometheus-ags/entity-graph-core`](../entity-graph-core) entity graph as Tauri IPC commands and events, with [tauri-specta v2](https://github.com/oscartbeaumont/tauri-specta) generating fully typed TypeScript bindings from the Rust source.

---

## Features

- **Typed IPC commands** — `graph_upsert_entity`, `graph_remove_entity`, `graph_patch_entity`, `graph_set_list`, `graph_get_entity`, `graph_get_list`, `graph_platform_ping`, `graph_persist_snapshot`, `graph_restore_snapshot`, `graph_clear`
- **Typed events** — `entity-changed`, `snapshot-persisted`, `snapshot-restored`, `error` emitted Rust → TS
- **Auto graph-store sync** — commands and events write directly into the core Zustand graph store so all reactive subscribers update immediately
- **In-memory native mirror** — entity, list, and snapshot commands support IPC hydration and diagnostics without claiming process-restart durability
- **Optional durable SQLite path** — applications that require restart persistence use the core `createTauriSqlPersistenceAdapter`
- **tauri-specta v2 bindings** — `pnpm --filter @prometheus-ags/entity-graph-tauri build:bindings` regenerates `src/generated-bindings.ts` from Rust

---

## Installation

### TypeScript (frontend)

```bash
pnpm add @prometheus-ags/entity-graph-tauri @tauri-apps/api
```

### Rust (Tauri app)

The npm package embeds the Rust plugin. From a pnpm-installed Tauri app, point
Cargo at that candidate rather than a separately published crate:

```toml
[dependencies]
entity-graph-tauri = { path = "../node_modules/@prometheus-ags/entity-graph-tauri/rust-plugin" }
```

Adjust the relative path for your workspace layout. Contributors working in
this monorepo can point directly at `packages/entity-graph-tauri/rust-plugin`.

---

## Usage

### 1. Register the Rust plugin

```rust
// src-tauri/src/lib.rs
use entity_graph_tauri::init;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`EntityGraphPlugin::new()` remains as an alpha compatibility constructor, but
new code should use `init()`.

### 2. Grant only the required commands

Tauri does not grant plugin commands merely because the crate is installed.
Add permissions to the capability for the intended window or webview:

```json
{
  "identifier": "entity-graph-read",
  "windows": ["main"],
  "permissions": ["entity-graph-tauri:default"]
}
```

`entity-graph-tauri:default` is deliberately read-only. It grants only:

- `allow-graph-get-entity`
- `allow-graph-get-list`
- `allow-graph-platform-ping`

Mutation, snapshot, and clear operations require their individual permissions,
for example `entity-graph-tauri:allow-graph-upsert-entity`. Grant only the
commands that the target webview needs. Overlapping capabilities merge their
authority.

### 3. Initialise the TS plugin

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
    autoRestore: true, // restore the plugin's current in-memory snapshot, when present
  },
});

// Cleanup on unload
window.addEventListener("beforeunload", () => plugin.dispose());
```

### 4. Use commands

```ts
// Upsert — mirrors into TS graph store immediately
await plugin.commands.upsertEntity({
  entityType: "User",
  entityId: "u-1",
  data: { name: "Alice", email: "alice@example.com" },
});

// Remove
await plugin.commands.removeEntity({ entityType: "User", entityId: "u-1" });

// Store a snapshot in the native in-memory mirror
await plugin.commands.persistSnapshot();
```

The Rust plugin currently stores snapshot strings in memory. This command does
not survive process restart. For durable SQLite persistence, configure the
core `createTauriSqlPersistenceAdapter`; do not infer durability from the
`graph_persist_snapshot` command name.

### 5. React to events from Rust

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
pnpm --filter @prometheus-ags/entity-graph-tauri build:bindings
pnpm --filter @prometheus-ags/entity-graph-tauri check:bindings
```

The first command writes `src/generated-bindings.ts` from the Rust command and
event registry. The second fails when the checked-in file drifts. The package
also exposes ergonomic wrappers (`platformPing`, `createTauriGraphPlugin`) and
the generated command and event helpers (`generatedCommands`,
`generatedEvents`).

## Public API ledger

Runtime exports from `dist/index.mjs` and all names exported by
`dist/index.d.ts` are recorded separately in
`prometheus-entity-skills/_shared/references/tauri-library-exports.json`.

```bash
pnpm --filter @prometheus-ags/entity-graph-tauri refresh:exports
pnpm --filter @prometheus-ags/entity-graph-tauri verify:skills
```

Refresh the ledger only after an intentional API change. Verification fails
closed on added or removed runtime and declaration names.

## Host and platform verification

Run the release-grade host contract from the workspace root:

```bash
pnpm run verify:tauri-plugin
```

The gate registers the real plugin in a Tauri consumer, invokes `graph_platform_ping` through IPC, proves a webview without the capability is rejected, packs the npm candidate, and repeats the Rust host test using only the extracted tarball. It also verifies that the tarball contains the Android, iOS, Rust, and permission sources required by a consumer build.

Desktop proof is not mobile proof. Android and iOS require the simulator/device procedure in [`release/tauri-mobile-device-lane.md`](../../release/tauri-mobile-device-lane.md); the npm package is published at stable `3.0.5`, but mobile runtime certification remains outstanding until those artifacts are captured.

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
