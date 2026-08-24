# Task 4 declared-surface observation

Date: 2026-08-02

The implementation and permanent tests changed the truth that agents and
release ledgers must report. The canonical Dart barrel now exposes 81 public
declarations when its generated Riverpod part is included. A source-derived
verifier records each name, declaration kind, and originating file in
`dart-library-exports.json` and fails when that surface drifts.

The prior package README still instructed consumers to install
`flutter_riverpod ^2.6.1` and referred to obsolete notifier and Freezed
generation behavior. That contradiction was corrected across the package
guide, release guide, releasing runbook, architecture reference, skill index,
and Dart-specific agent reference.

Sycophancy correction mattered in the coverage ledger. The Dart work proves
normalization, patches, optimistic CRUD, view completeness, change-feed
invalidation, optional FFI, and one scoped list/detail widget harness. It does
not prove relationship cascade invalidation, realtime coalescing, offline
persistence, the complete Flutter/A2UI showcase, Android/iOS, accessibility,
pub.dev authority, or stable promotion. Those entries remain partial or
planned rather than being relabeled to make the release look more complete.

The updated mental model is: implementation is the building, tests are the fire
inspection, and the public ledger/docs are the occupancy map. A green
inspection does not help consumers if the map still points to Riverpod 2 or
claims rooms that were never built.
