# Task 2 — Binding singleton implementation

Date: 2026-08-01  
Change: `v3-binding-singleton-contract`

## Outcome

Implemented the complete package-topology and packed-consumer slice for React, Svelte, Solid, Web Components, Alpine, and HTMX. The final packed verifier resolves one compatible physical core instance and proves that all six binding behaviors observe the same normalized graph.

Machine evidence: [`task-2-binding-singletons-report.json`](task-2-binding-singletons-report.json).

## Manifest contract

Each stable framework binding now declares:

- no production `dependencies` edge to `@prometheus-ags/entity-graph-core`;
- a required `workspace:^` core peer, packed as `^3.0.0-alpha.0` for the current candidate and naturally as `^3.0.0` after stable versioning; and
- a development-only `workspace:*` core edge for monorepo typecheck, build, and unit tests.

The core peer is not optional. HTMX retains its real runtime SDL dependency; Web Components retains its real Lit runtime dependency. Only the core singleton ownership edge moved.

Non-React binding internals now consume the explicit vanilla `graphStore` API instead of the deprecated core `useGraphStore` compatibility alias. Solid retains the alias as a public compatibility re-export while also exposing `graphStore`.

## Fixed release policy

`.changeset/config.json` now contains one fixed group matching all twelve npm packages in `release/v3-release-contract.json`; `linked` remains empty. The pending changeset records the six affected binding packages. `changeset status` expands the fixed group to all twelve packages and computes the intended next version as `3.0.0`, while both private examples remain `type: none`.

No version file, registry artifact, dist-tag, or publication state was mutated.

## Packed verifier

`scripts/verify-binding-singletons.mjs` performs the following from candidate tarballs:

1. Packs core, SDL, and all six bindings.
2. Rejects direct/optional core ownership, missing dev edges, workspace protocol leakage, incompatible peer ranges, or fixed-group drift.
3. Installs the candidate set in one isolated pnpm consumer with strict peer checking and the established full runtime peer matrix.
4. Resolves core from the application and from each binding's installed location and requires one physical instance.
5. Proves reactive behavior through the real public binding APIs:
   - React observes a core write through the React StoreApi facade.
   - Svelte's entity store updates from the shared core.
   - Solid's `createGraphStore` accessor reacts to a core write while its exported store identity matches core.
   - Lit's detail controller updates and requests a host render.
   - Alpine's reactive entity binding updates.
   - HTMX's server graph emits its public change event and reads/writes through the shared core.
6. Supplies a fake core `4.0.0` with peer auto-install disabled and requires strict pnpm installation to fail with the core package name and peer context in the diagnostic.

The machine report aliases the physical path as `core-instance-1`; it intentionally does not persist temporary absolute paths that disappear after verification.

## Red-to-green corrections

### Consumer peer completeness

The first behavior run imported the full React package without installing optional peers used by its root entry and failed on `@tanstack/react-table`. The verifier now reuses `createPackedConsumerManifest()`, the already-certified all-package consumer peer matrix. This preserves the test's purpose: singleton topology is tested with a complete supported runtime environment rather than passing through a narrower internal subpath.

### Negative fixture path length

The first incompatible-peer run failed with `ERR_PNPM_ENAMETOOLONG` because macOS's long per-user temporary directory was embedded in pnpm's file-tarball store key. The verifier now uses a bounded `/tmp/prometheus-bs-*` path on Unix-like systems and retains the platform temp directory on Windows. The corrected run fails for the intended peer-range reason and verifies that the diagnostic names the core peer context.

### Regression-test naming collision

The mechanical migration from `useGraphStore` to `graphStore` exposed Svelte tests whose local variable was also named `graphStore`, producing a temporal-dead-zone error. Tests now alias the imported singleton as `sharedGraphStore`; the production API remains `graphStore`. A concurrent Solid run also briefly observed core's build directory while another verification command cleaned it, so the focused suites were rerun after package builds completed. The final six-package result is 121/121 tests.

## Focused verification

| Gate | Result |
| --- | --- |
| Six binding typechecks | Pass — 6/6 |
| Twelve public package builds | Pass — 12/12 |
| Six binding package suites | Pass — 121/121 tests |
| Binding singleton packed verifier | Pass — 6/6 bindings, one core instance |
| Incompatible core peer | Pass — strict install rejected `4.0.0` with actionable peer context |
| Package contract regression | Pass — 12/12 Publint and ATTW; ESM, CommonJS, NodeNext, Node16, and Bundler consumers |
| Framework-neutral core regression | Pass |
| Changesets status | Pass — one fixed twelve-package 3.0.0 release group |
| Targeted ESLint | Pass with zero warnings |
| Diff integrity | Pass |

## Invariants and exclusions

- The graph implementation and entity/list mutation semantics did not change. Entities remain canonical once, patches remain separate, and lists remain ID-only.
- No component, hook, store, adapter, API, or realtime I/O ownership boundary changed.
- pnpm is the only package manager used.
- This is a headless install-resolution and reactive-state contract. Screenshots would not prove physical module identity; tarball resolution, real public binding behavior, and machine reports are the truthful evidence. Browser/device visual evidence remains mandatory for later examples and Docusaurus changes.
- This task does not certify an RC, native platform runtime, Flint portability, immutable commit, provenance, registry publication, or npm `latest`.
