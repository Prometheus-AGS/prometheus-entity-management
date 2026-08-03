# Task 4 public-surface synchronization

## Outcome

The Tauri public surface is synchronized across executable declarations,
coverage, agent guidance, and release documentation without promoting the
unfinished mobile lane.

## Public API contract

- `tauri-library-exports.json` records 26 runtime exports from
  `dist/index.mjs` and 57 exported declaration names from `dist/index.d.ts`.
- `tauri-public-api-contract.mjs` fails closed on runtime, declaration, or
  metadata drift and exposes a `--write` refresh path.
- Root `refresh:exports` and `verify:skills` include the Tauri package.
- Package `prepublishOnly` checks the ledger after build and tests.

## Coverage contract

`release.platform.tauri-plugin` is intentionally `partial`:

- implemented: Rust-derived bindings, registered desktop IPC, desktop
  capability denial, packed Rust consumption, and native payload presence;
- planned: Android Kotlin and iOS Swift command plus denial receipts;
- downstream: complete Tauri application rendering, restart/offline behavior,
  accessibility, and device visuals.

## Corrected documentation claims

- `entity-graph-tauri:default` is read-only; mutations require individual
  permissions such as `allow-graph-upsert-entity`.
- `GraphPluginState.snapshots` is an in-memory map. Durable SQLite remains the
  core `createTauriSqlPersistenceAdapter` path.
- desktop MockRuntime and packaged mobile sources do not certify native mobile
  execution.
- Rust registration uses `init()`; `EntityGraphPlugin::new()` is compatibility.

## Research and teaching gate

The ten-stage package is under `.research/v3-tauri-mobile-plugin-task-4/`.
The automated worker remained at initialization, so the documented
primary-source fallback was used. Its Feynman skeptic transfer scored 0.92 with
no identified misconception; formal mastery is not claimed because same-turn
retention cannot be demonstrated.

## Verification

- `node --test tests/release/v3-tauri-mobile-plugin.test.mjs` — 4/4 pass
- full `pnpm run bdd:tauri-plugin` — 5 scenarios, 18 steps, all pass
- `pnpm run verify:example-coverage` — 13/13 semantic scenarios, schema pass,
  release remains in progress
- `pnpm run verify:skills` — React, sync, A2UI, A2A, Tauri, and Dart ledgers pass
- targeted ESLint and JSON parsing — pass

The accompanying visual is a human-readable summary of these contracts, not a
substitute for the still-required Android/iOS runtime receipts.
