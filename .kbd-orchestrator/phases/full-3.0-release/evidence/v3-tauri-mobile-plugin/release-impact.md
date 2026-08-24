# Release impact — `v3-tauri-mobile-plugin`

Date: 2026-08-02

## Delivered boundary

- `@prometheus-ags/entity-graph-tauri` is a Tauri 2 plugin package with
  Rust-derived TypeScript command/event helpers and an embedded Rust crate.
- The npm candidate contains 41 compiled/runtime/source files and excludes
  generated Android, iOS, and Rust build state.
- Desktop, physical Android, and simulated iOS native command execution is
  proven, including fail-closed permission denial on every host boundary.
- The default capability stays read-only; mutations require explicit grants.
- Native snapshot commands are explicitly in-memory; durable restart behavior
  uses `createTauriSqlPersistenceAdapter`.
- Android Kotlin and iOS Swift registration/linkage are protected by source,
  package, build, executable, BDD, visual, and hash checks.

## Downstream impact

This change unblocks `v3-release-pipeline-rc` and provides the plugin foundation
for `v3-tauri-universal-example`, generated API docs, integration tutorials,
skills, and final release certification. The universal example still owns the
full desktop/mobile showcase, restart/reconnect flows, deep links, responsive
accessibility, and application-level screenshots.

## What remains incomplete for full 3.0

- Sixteen of the phase's 28 changes remain pending after this change.
- The five showcase applications and complete Docusaurus/GitHub Pages site are
  downstream.
- The earlier Dart golden drift remains owned by its example/final
  certification scope, not this Tauri plugin.
- One immutable cross-ecosystem evidence bundle and release-candidate recovery
  proof remain pending.
- Registry dry runs, ownership, credentials, version promotion, GitHub Release,
  and post-publication consumer checks remain pending and unauthorized.

## Publication authority

The package remains `3.0.0-alpha.0`. No package version, registry, dist-tag,
GitHub Release, Pages deployment, or platform-store state changed. Stable
publication remains fail-closed behind `v3-release-certification` and
`v3-stable-publication`.
