# Task 4 — ledgers, skills, and documentation

Date: 2026-08-01  
Task verdict: **PASS**  
Change verdict: **IN PROGRESS — tasks 5–6 remain**

## Coverage synchronization

`examples/coverage.json` now records `release.sync.persistence-convergence` as an implemented quality gate and promotes exactly two release receipts for `graph.offline-persistence-sync`:

- integration — `pnpm run test:sync-persistence`; and
- packed consumer — `pnpm run verify:sync-persistence`.

The ledger intentionally retains planned Flutter mobile and Tauri platform evidence. Overall coverage is still `in-progress`, `documentationSite.status` is still `planned`, all five showcase statuses remain `planned`, and every showcase visual receipt remains `planned`. The semantic coverage validator passes all 13 scenarios while continuing to report `releaseCertified: false`.

## Public API synchronization

The existing `library-exports.json` remains the React facade ledger and still matches 201 runtime exports. The separately published sync package now has:

- `sync-library-exports.json` with 16 sorted runtime exports;
- `sync-persistence-path.md` for functions, types, architecture, conflicts, dependencies, commands, and exclusions;
- a `verify:skills` package script using `verify-skills-exports.mjs --sync`; and
- a `refresh:exports` package script using `refresh-exports-ledger.mjs --sync`.

The root refresh/verification scripts now cover both package ledgers. `pnpm run verify:skills` passes React 201/201 and sync 16/16.

## Documentation synchronization

Updated:

- root `README.md` and `RELEASING.md`;
- `examples/README.md`;
- sync package README, changelog, entry-point example, and package scripts;
- root and bundle skill indexes;
- human API reference;
- `entity-realtime-local-first` guidance; and
- a sync-specific shared skill reference.

The docs distinguish PGlite durability, Loro reconciliation, graph projection, and transport recovery. They document isolated store/registry ownership, deterministic peer IDs, `ensureMergeableMap`, same-field conflict policy, inbound echo suppression, WebSocket control framing, supported dependency range, mandatory commands, and the sibling-repository opt-in exclusion. Unsupported historical micro-benchmark and bundle-size claims were removed.

## Release metadata

- `.changeset/certify-sync-persistence.md` records the sync-package release impact.
- `packages/entity-graph-sync/CHANGELOG.md` records the stable-path behavior and new APIs.
- The shared tarball consumer now pins the certified Loro `1.13.9` dependency rather than accepting an older incompatible range.
- `pnpm changeset status` accepts the fixed-group patch plan.

## Executable drift checks

- `pnpm run verify:example-coverage` — 13/13 semantic scenarios, 16 capabilities/artifacts, five planned showcases, overall in progress, release not certified.
- `pnpm run test:example-coverage` — 13 tests pass, zero skips/todos.
- `pnpm run verify:skills` — both runtime ledgers pass.
- `node --test tests/release/v3-sync-persistence-path.test.mjs` — eight release/ledger/doc tests pass, zero skips/todos.
- `pnpm run bdd:sync-persistence` — five scenarios and 27 steps pass.

## Visual-evidence boundary

This task changed Markdown, JSON ledgers, skills, and package metadata, not a rendered application or the planned Docusaurus site. A screenshot of prose would not prove API/coverage synchronization. Machine ledgers, packed consumers, BDD, and drift tests are the truthful evidence. All browser/device/accessibility/screenshot/trace/video/hash receipts remain planned and owned by the showcase and documentation-site changes.
