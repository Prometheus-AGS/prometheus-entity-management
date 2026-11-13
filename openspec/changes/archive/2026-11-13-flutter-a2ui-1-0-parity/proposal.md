## Why

The operator reversed decision D7 on 2026-11-12: the Flutter showcase must reach A2UI 1.0 parity with the npm packages in
this phase. It still renders through `genui` 0.10.2 behind a compatibility layer that accepts the A2UI 1.0
release-candidate dialect and rewrites it to v0.9. The operator chose the official Flutter renderer, `a2ui_flutter`
0.3.0 on `a2ui_core` 0.7.0 (published 2026-11-11 with A2UI 1.0), over `genui`, whose newest release still depends on
`a2ui_core ^0.1.0`.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 12 (added by contract amendment 3).

## What Changes

- `examples/flutter-riverpod` depends on `a2ui_flutter` 0.3.0 and `a2ui_core` 0.7.0 instead of `genui`
- The showcase emits A2UI 1.0 final messages (`version: "1.0"`, `@path`/`@call`, the 1.0 basic catalog); the RC→v0.9
  translation layer is deleted
- The runtime renders through `MessageProcessor` and `A2uiSurface`; every user action still crosses the app-owned,
  fail-closed Riverpod action policy, and malformed input is refused visibly with no graph mutation
- The Flutter acceptance path (integration test on an iOS simulator plus a verifier with a negative control) replaces the
  genui structural verifier
- The `v3-flutter-riverpod-a2ui-example` spec delta (formerly a deferral recorded by change 9) moves here

## Impact

- Scope: `examples/flutter-riverpod`, `scripts/verify-flutter-a2ui-v1.mjs` (replaces the genui-era `verify-flutter-riverpod-a2ui-example.mjs`), root `package.json` script,
  the Flutter spec. `packages/entity_graph_flutter` is unchanged (it has no A2UI code), so there is no pub.dev release.
- Acceptance: scenario UPG-18 in `adopted-contract.json`, exercised only in the phase's single post-implementation
  boundary run.
