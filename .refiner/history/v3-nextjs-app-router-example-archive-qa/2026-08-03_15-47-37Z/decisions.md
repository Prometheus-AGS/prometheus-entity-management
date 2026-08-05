# Decisions — `v3-nextjs-app-router-example-archive-qa`

## 2026-08-03 — Correct both review warnings and terminate cycle 2

Decision: both isolated-review warnings are corrected and all eight blocking
constraints are satisfied; terminate this refinement cycle and rebuild the
complete isolated adversarial review packet.

Rationale: the final report now identifies task 5, provider-owned graphs have
independent GC intervals, a focused sibling-isolation regression passes, and a
fresh tarball-only Next.js production/browser run certifies the corrected core
bytes. Current hashes, coverage, React exports, API guidance, OpenSpec,
Changesets, release rules, frozen install, diff hygiene, and security agree.

Non-promotion boundary: this decision authorizes neither npm staging nor stable
3.0. The frozen React rc.1 lane remains separate, and this continuation's
scoped-store APIs require a later fixed-group prerelease after merge.
