# DevTools time-travel verification receipt

Date: 2026-08-29

## Implemented boundary

- One controller-owned snapshot history per `GraphStore`, with an initial
  baseline and one complete post-publication capture referenced by each
  semantic mutation event.
- Count- and byte-bounded whole-snapshot retention, stable monotonic cursors,
  explicit unavailable capture metadata, and typed expired-history receipts.
- Retained rewind through the real graph boundary, protected exact live head,
  explicit return-to-live, replay suppression, and ordered live branching when
  an application mutation occurs while rewound.
- Versioned same-store JSON import inspection, shared retention budget,
  explicit one-shot confirmation, import-source audit events, and exact live
  return after imported rewind.
- Deprecated root functions delegated through a root-safe ESM/CommonJS bridge
  to the selected store's optional controller, with no second payload/cursor
  owner and no normal-root import of the optional implementation.
- Versioned, published time-travel fixture with a byte-identical Flutter source
  copy, plus synchronized package guide, skills reference, human API table,
  security boundary, and unchanged generated runtime-export ledger.

## Full integration evidence

Command: `pnpm run verify:devtools-time-travel`

Final result: pass after one verifier-only correction. The first final-fixture
run exposed that the generated full ESM consumer used `createRequire` without
importing it; production code had not executed. The verifier generator was
corrected, and the complete packed gate then passed.

Authoritative machine receipt: `task-9-packed-acceptance.json`.

The gate builds and packs the real core package, validates the tarball and
manifest, installs it into a temporary external pnpm consumer, and passes:

- Root-only ESM, full ESM, independently bundled CommonJS, and strict NodeNext
  TypeScript consumption.
- Normal-root optional implementation exclusion and deprecated root facade
  behavior after explicit DevTools loading.
- Count eviction, byte eviction, oversize/unavailable captures, stable cursors,
  and evicted/unavailable expiry receipts.
- Retained rewind, exact live restoration, and mutation-while-rewound event/
  snapshot ordering.
- Wrong-store and wrong-version import rejection, inert inspection, explicit
  confirmation denial, one-shot confirmed import rewind, and exact live return.
- Multi-store isolation, final-detach disposal, package payload, published
  fixture import, and byte-identical TypeScript/Flutter fixture parity.

All 3 fixture fields, 3 package checks, 4 consumer lanes, and 12 scenario
statuses equal `pass`.

## Public API and fixture validation

Command: `node scripts/verify-skills-exports.mjs --pkg core`

Result: pass. The built runtime has 128 unchanged root exports and 7 unchanged
optional `./devtools` exports matching
`prometheus-entity-skills/_shared/references/core-library-exports.json`.
Controller methods and protocol types are declaration-only surface and are
documented in the human API table rather than invented as runtime exports.

The two JSON fixture subpaths are intentionally outside the named JavaScript
runtime-export ledger. They are recorded in
`prometheus-entity-skills/_shared/references/core-package-subpaths.json`;
`verify-skills-exports.mjs --pkg core` compares that ledger with the core
package export map. The assembled gate separately validates the allowed tarball
payload, packed bytes/hash, ESM import, and CommonJS require path.

`skills-package-registry.mjs` defines the core ledger directory as
`entity-graph-core` (without a `packages/` prefix), so the verifier's
`root/packages/<directory>` resolution is
`packages/entity-graph-core/package.json`. The final scoped run passed:
128 root exports, 7 `./devtools` exports, and 2 exact JSON subpath/target
pairs with existing target files.

Fixture SHA-256:
`937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`

- `packages/entity-graph-core/fixtures/devtools/time-travel-v1.json`
- `packages/entity_graph_flutter/fixtures/devtools/time-travel-v1.json`

The source files are byte-identical. The packed file is captured without text
decoding, matches them directly, and produces the recorded SHA-256. The ESM
consumer uses its `validImport` envelope in the real controller flow.

No unit, component, isolated, mock-backed, snapshot, or partial integration
test was created or run.

## Scope limit

This receipt proves only the framework-neutral time-travel change. It does not
prove the React inspector/FAB, Dart/Flutter controller implementation, Chrome
extension, Flutter DevTools extension, documentation-site scenarios,
performance budgets, release certification, npm/pub.dev publication, or store
submission.
