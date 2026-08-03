---
type: research-report
title: Tauri plugin public-surface certification
date: 2026-08-02
confidence: 0.97
verification_status: verified
sources_count: 7
feynman_grade: 0.92
contradictions_resolved: 4
okf_version: '0.1'
---

# Tauri plugin public-surface certification

The agent-facing contract must keep four proofs separate: the package export surface, Rust-derived TypeScript binding drift, runtime capability authority, and platform-native execution. A green result in one category is not evidence for the others.

The package needs a fail-closed ledger for both runtime names and declaration names. The generated bindings are derived from the Rust command and event registry, but the ergonomic wrapper exports and compatibility aliases are also public and therefore belong in the ledger. Binding generation must remain a drift check, not a handwritten documentation exercise.

Tauri capabilities grant permissions to specific windows or webviews. This package's `default` permission is deliberately read-only: get entity, get list, and platform ping. Mutation, clear, and snapshot commands require explicit command permissions. A skill that merely says to add `entity-graph-tauri:default` for all operations would create a false security model.

The current desktop host test proves real registered IPC and runtime capability denial in Tauri MockRuntime. The packed-host repeat proves the npm tarball contains a consumable Rust plugin plus permissions and mobile sources. Neither result executes Kotlin or Swift. Android and iOS remain uncertified until the documented device lane records native command and denial receipts.

The current Rust plugin stores its mirror and snapshot strings in memory. Durable SQLite persistence is available through the core `createTauriSqlPersistenceAdapter`; it is not established by naming the native command `graph_persist_snapshot`. Documentation and skills must state that boundary precisely.

The automated research worker remained at stage 0, so this package used the documented manual fallback with official Tauri documentation, the upstream Tauri Specta repository, and local authoritative source. Firecrawl was not available as a callable tool in this session; no Firecrawl result is implied.
