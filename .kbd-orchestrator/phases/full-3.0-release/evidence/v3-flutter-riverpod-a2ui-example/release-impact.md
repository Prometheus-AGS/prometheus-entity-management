# Release impact — `v3-flutter-riverpod-a2ui-example`

Date: 2026-08-21

## Implementation-ready surface

The dedicated `examples/flutter-riverpod` showcase proves the mobile slice of
the 3.0 contract end to end: a Flutter/Riverpod 3 app renders official A2UI
surfaces through genui `SurfaceController`, applies an app-owned fail-closed
action policy (allowlisted `task.update`, approval-gated `task.replace`,
denied `task.delete`, tenant guard, malformed-message rejection), and drives
optimistic CRUD plus offline persistence/convergence against the certified
`entity_graph_flutter@3.0.0` package. Mutations land once in the normalized
graph and propagate to every joined view.

This makes Flutter/Riverpod + A2UI a viable early RC consumer surface
alongside the certified Vite, Next.js, and agentic-A2UI examples. Platform
verification is compile-level (`flutter build apk --debug`,
`flutter build ios --simulator --no-codesign`); no booted-device run was
performed and that limit is retained, not waived. This change does not make
the complete 3.0 portfolio stable or authorize registry mutation.

## Design decisions that bound the blast radius

- No library API changed. The app composes the existing public surfaces of
  `entity_graph_flutter@3.0.0` plus pinned `flutter_riverpod >=3.3.2 <3.4.0`,
  `genui 0.10.1`, and `a2ui_core 0.1.0` under the pub workspace.
- The A2UI action policy is application-owned and fail-closed by default; the
  package's transport and provider families stay untouched.
- Four defects were found and fixed by the evidence loop, all in the example:
  lambda `toGraph` closures forking Riverpod families per rebuild (fixed with
  static `encode` tear-offs), auto-dispose CRUD provider dying between
  `ref.read` and `save()` (tile now watches `.notifier`), a fake-clock zone
  trap in tests (runtime constructed inside `testWidgets` body plus receipt
  polling), and conflict merge not restoring the base value. No library fixes
  were needed.
- Goldens pin the A2UI surface message stream and phone/tablet task-board
  layouts; drift is a hard test failure with platform-specific baselines
  (`linux-` prefix selected automatically on Linux CI).

## Full-release disposition

The full 3.0 release remains in progress. Universal Tauri, Flint portable
contracts, skills, docs, cross-ecosystem certification, and stable
publication retain independent plan ownership. The human-gated changes
`v3-release-certification` and `v3-stable-publication` are untouched and
remain the hand-off boundary. This evidence grants no npm, GitHub Release,
GitHub Pages, Pub, Cargo, or app-store publication authority.
