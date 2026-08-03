# Release impact — `v3-vite-react19-example`

## Implementation-ready surface

The React 19/Vite 8 source-workspace showcase now demonstrates and verifies
the stable browser-facing graph surface: normalized cross-view state,
optimistic confirmation and rollback, relationship invalidation, typed
local/remote/hybrid views, REST/GraphQL equivalence, realtime coalescing,
PGlite persistence, Loro convergence, Suspense/error containment, DevTools,
and accessibility.

This evidence makes React/core a viable early RC consumer surface. It does not
make the complete 3.0 portfolio stable or authorize registry mutation.

## Fastest safe React path

The accepted release contract has one fixed npm group containing twelve
packages. The early path therefore remains a coordinated `3.0.0-rc.N` staging
to the protected `next` tag, not an ad hoc React-only version split. Consumers
that need React immediately install only the packages they use:

```bash
pnpm add @prometheus-ags/entity-graph-core@next \
  @prometheus-ags/prometheus-entity-management@next
```

That command is prospective until an authorized staging run publishes and
verifies the `next` candidates.

## Required release handoff

1. Close artifact-refiner, isolated adversarial-review, OpenSpec verify, and
   archive gates for this change.
2. Create an immutable candidate commit with the complete intended source.
3. Produce one numbered Changesets prerelease version for all twelve fixed
   npm packages.
4. Run the complete RC rehearsal from that SHA and preserve the twelve exact
   tarballs, dependency order, protected-tag snapshot, and integrity records.
5. Use the GitHub Actions OIDC trusted-publishing workflow and protected
   `npm-rc` environment with explicit human approval.
6. Stage only to `next`, then verify registry versions, integrity, provenance,
   dependencies, and dist-tags before announcing the install command.

## Full-release disposition

The full 3.0 release remains in progress. Next.js, agentic A2UI,
Flutter/Riverpod, universal Tauri, Flint portable contracts, skills,
Docusaurus/GitHub Pages, cross-ecosystem certification, and stable publication
retain their independent plan ownership. This evidence grants no npm, GitHub
Release, GitHub Pages, Pub, Cargo, or app-store publication authority.

