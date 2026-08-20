# Release impact — `v3-nextjs-app-router-example`

## Implementation-ready surface

The Next.js App Router example now demonstrates and verifies per-request SSR
graph isolation, server prefetch/dehydrate with post-mount client hydration
(no mismatch, no duplicate fetch inside staleTime), a dynamic
`/release-showcase` route with seven scenario cards, loading/error boundaries,
mutations, deterministic realtime takeover, route transitions, and browser
accessibility.

The React binding's hooks remain hard-bound to the process-global Zustand
store; server-side graph work therefore uses per-request `createGraphStore()`
via `src/lib/server/request-graph.ts`, and a release contract test statically
guards that server modules never write the global store. No framework-neutral
core public API was changed.

This evidence makes Next.js/React a viable early RC consumer surface alongside
the certified Vite example. It does not make the complete 3.0 portfolio stable
or authorize registry mutation.

## Parallel prior implementation — operator follow-up

Branch `origin/codex/full-3.0-continue` contains a complete, never-merged
prior implementation of this same change (commits `85847e3` feat → `a698de3`
test harness → `3090304` certify → `d643b81` archive), using a divergent
library-touching approach (scoped graph runtime, GC/listener fixes `9051b10`,
`b44126b`) across ~2675 files. This session deliberately shipped an
example-only implementation on `main-takeover-kimi` instead of reconciling
that branch. The operator should decide whether any of the codex-branch
library fixes (GC, listener handling) warrant their own OpenSpec change; they
were not ported here because they are unobserved on this surface.

## Changeset disposition

An empty changeset `.changeset/certify-nextjs-app-router.md` records that this
example-only change requires no version bump. `changeset status` failure on
this branch without it is a pre-existing baseline condition (local `main` lags
430 package files; prior changesets consumed in `pre.json` rc mode).

## Full-release disposition

The full 3.0 release remains in progress. Agentic A2UI, Flutter/Riverpod,
universal Tauri, Flint portable contracts, skills, Docusaurus/GitHub Pages,
cross-ecosystem certification, and stable publication retain independent plan
ownership. The human-gated changes `v3-release-certification` and
`v3-stable-publication` are untouched and remain the hand-off boundary. This
evidence grants no npm, GitHub Release, GitHub Pages, Pub, Cargo, or app-store
publication authority.
