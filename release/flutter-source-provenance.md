# Flutter source provenance gate

The `v3-flutter-source-provenance` gate establishes chain of custody for reusable Flutter entity-management source. It does not make the imported material a runnable package and does not promote the 3.0 release.

## Decision

`packages/entity_graph_flutter` is the sole canonical Dart graph package. The filtered KnowMe source under `provenance/imports/knowme-flutter` is a non-buildable, non-workspace, non-public history boundary used for review and later adaptation. It is not a second implementation owner.

The migration deliberately separates three concerns:

1. [`flutter-source-authority.json`](flutter-source-authority.json) records the pre-import authority, exact source revisions, history policy, and publication denial.
2. [`flutter-source-provenance.json`](flutter-source-provenance.json) binds the filtered tree, commit mapping, attribution, license, path dispositions, destination owner, and deterministic lineage evidence.
3. The downstream `v3-dart-graph-riverpod` change may adapt approved concepts into `packages/entity_graph_flutter`; it must not compile or publish the provenance directory.

The source revision came from a fresh disposable checkout of KnowMe. The importer retained only allowlisted generic libraries and recorded every examined old-to-filtered commit mapping. Dirty working-tree content, applications, product models, secrets, generated Dart, lockfiles, build output, and direct FFI were excluded. `hybrid-mobile-architecture-src` remains MIT-licensed reference material; no runtime library was fabricated from its templates, scripts, or documentation.

## Public API impact

This gate changes no runtime entry point and adds no public export. Therefore the React, sync, A2UI, and A2A public API ledgers remain unchanged. `provenance/imports/knowme-flutter` must remain absent from `pnpm-workspace.yaml`, package manifests, export ledgers, example aliases, and registry candidates.

Future adaptation can change the Dart API only through the canonical `packages/entity_graph_flutter` owner and the downstream Dart package contract. A provenance record is evidence of source lineage, not an API compatibility promise.

## Verification

Run from the repository root:

```bash
pnpm run verify:flutter-source-provenance
pnpm run test:flutter-source-provenance
pnpm run bdd:flutter-source-provenance
pnpm run verify:example-coverage
```

The verifier checks the filtered Git history, merge lineage, commit and metadata maps, allowlist, license bodies and hashes, canonical Dart owner, workspace exclusion, hybrid reference decision, deterministic SVG hash, coverage ledger, documentation, skill guidance, and public-ledger non-impact.

The evidence diagram is [`flutter-source-provenance-lineage.svg`](evidence/flutter-source-provenance-lineage.svg). It is deterministic headless lineage evidence. It is not a Flutter screenshot, widget/golden result, Android/iOS receipt, or accessibility certification.

## Claims that remain blocked

This gate does not certify:

- that `entity_graph_flutter` has completed 3.0 API adaptation, Riverpod lifecycle work, analyzer checks, package tests, or transport integration;
- that the Flutter + Riverpod + A2UI showcase renders or passes widget, golden, Android, iOS, or accessibility checks;
- that pub.dev ownership and credentials have been established;
- that any Dart package may be published;
- that the repository or npm ecosystem is ready for stable 3.0.0 promotion.

Those claims remain owned by `v3-dart-graph-riverpod`, `v3-flutter-riverpod-a2ui-example`, the native registry workflow, release certification, and stable publication changes.
