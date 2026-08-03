# v3-main-ci-baseline dependency gate

## Verdict

**PASS — declared dependencies: NONE.**

The phase plan and OpenSpec proposal both declare this change independently executable. The previously completed `v3-release-contract` is available as the active normative spec, but it is not a hard dependency in the plan graph.

## Entry-state checks

- `openspec/changes/v3-main-ci-baseline` exists and its six-task checklist is readable.
- The root uses pnpm 10.33.0 and has a checked-in root lockfile.
- Node 24.16.0, pnpm 10.33.0, Dart/Flutter, Cargo/Rust, and OpenSpec are available for local verification.
- The release contract is promoted at `openspec/specs/v3-release-contract/spec.md` and reports the 3.0 release blocked until baseline gates pass.

## Non-dependencies that must not be smuggled into CI

Both existing examples declare `@prometheus-ags/entity-sync-pglite` through a `link:` path outside this repository. A clean checkout therefore cannot resolve it. The sibling `prometheus-entity-sync` repository is **not** an entry dependency for this change; removing or replacing that non-hermetic assumption is part of the implementation scope.

Likewise, the optional Flint live test currently probes absolute sibling-repository paths. It cannot be counted as a mandatory clean-main baseline and is owned by `v3-flint-portable-contracts`.

No user action, credential, registry publication, or manual authority is required to begin implementation.
