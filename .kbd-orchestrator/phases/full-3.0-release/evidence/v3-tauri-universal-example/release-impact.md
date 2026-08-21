# Release impact — `v3-tauri-universal-example`

Date: 2026-08-21

## Implementation-ready surface

The dedicated `examples/tauri-app` showcase proves the universal-platform slice
of the 3.0 contract: one React 19 / Vite 8 frontend runs as a Tauri 2
application on desktop and mobile, composed on the certified
`@prometheus-ags/entity-graph-tauri` plugin. Native command round-trips,
least-privilege capabilities with fail-closed denial, offline
persist/clear/restore restart, deep links, lifecycle revalidation, and
responsive desktop/mobile layouts all carry executable receipts: Rust
MockRuntime E2E (3/3), bridge contract tests (5/5), Chromium desktop and
mobile viewport lanes (7 scenarios each, zero serious/critical axe), a desktop
debug binary, an Android debug APK, and an unsigned iOS simulator app bundle.

This makes Tauri desktop+mobile a viable early RC consumer surface alongside
the certified Vite, Next.js, agentic-A2UI, and Flutter examples. It does not
make the complete 3.0 portfolio stable or authorize registry mutation.

## Design decisions that bound the blast radius

- No library API changed. The app composes existing public surfaces:
  `@prometheus-ags/entity-graph-tauri` (plugin commands, snapshot lifecycle),
  `createTauriSqlPersistenceAdapter` (durable SQLite storage), the official
  SQL and deep-link plugins, and the React bindings' pure graph subscription.
- Platform conditionals exist only in `src/platform/`; features never import
  `@tauri-apps/*` or write the graph directly (structurally pinned).
- Nine defects were found and fixed by the evidence loop, all example-local:
  test payload drift, two pnpm-workspace CLI resolution breaks in generated
  mobile scaffolding, `$USER`-sensitive iOS init, Gradle/Java-25 mismatch,
  a stale edit-buffer closure on one-tap advance, a non-reactive view list
  replaced by the reactive join, a frozen-seed fetch path made authoritative,
  a storage-key collision that crashed reload hydration, and a
  cross-worker evidence receipt clobber. No library fixes were needed.
- Platform receipts are compile-level; booted-device runtime sessions are
  recorded as retained limits, not waived.

## Full-release disposition

The full 3.0 release remains in progress. Flint portable contracts, skills,
docs, cross-ecosystem certification, and stable publication retain independent
plan ownership. The human-gated changes `v3-release-certification` and
`v3-stable-publication` are untouched and remain the hand-off boundary. This
evidence grants no npm, GitHub Release, GitHub Pages, Pub, Cargo, or app-store
publication authority.
