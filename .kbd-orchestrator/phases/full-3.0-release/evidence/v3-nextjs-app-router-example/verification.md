# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-03
Implementation source through review corrections: `b44126b`
Verdict: **PASS — IMPLEMENTATION EVIDENCE COMPLETE; QA/ARCHIVE PENDING**

## Acceptance matrix

| Plan or OpenSpec criterion | Authoritative evidence | Result |
| --- | --- | --- |
| Concurrent SSR proves request isolation | Packed production browser receipt records 12 concurrent requests and 12 unique graph IDs; focused server test creates 24 isolated serializable snapshots | Pass |
| Hydration has no mismatch or duplicate fetch | Browser receipt records `clientFetches: 0` and `hydrationErrors: 0`; route transition preserves the graph and reload replaces it | Pass |
| Clean production build uses packed packages | Verifier builds and packs core plus React `3.0.0-rc.1`, installs only those tarballs into an external Next.js 16 app with strict peers, type-checks, and production-builds it | Pass |
| Browser E2E covers the required server/client flow | Two Playwright tests pass for request isolation, hydration, Server Action mutation, realtime takeover, route persistence, and reload behavior | Pass |
| Suspense/error and accessibility boundaries work | Loading and route error boundaries are structurally checked; the runtime receipt reports zero serious or critical axe findings | Pass |
| Public API, coverage, skills, documentation, and Changesets stay synchronized | Next showcase and SSR evidence are implemented in `examples/coverage.json`; 203/203 React runtime exports match the ledger; docs and scoped-store skills are updated; Changesets status passes | Pass |
| No mandatory lane is silently skipped | Task-5 receipt lists every executed gate and explicitly records Dart/Melos, Cargo, Flutter, and Tauri as not applicable to this Next-only change | Pass |
| Security boundary remains fail-closed | Server Action denial test validates allowlisted IDs/statuses and resolves server-owned data; security audit reports zero critical, high, or blocking advisories | Pass |

## Reproducible evidence

- `task-5-verification.json` — command-by-command packed consumer and browser
  receipt; SHA-256
  `b9b976b974f78878a96ca412ee397af9e95f224d3c3d1e0646c25729caa3644d`.
- `browser-evidence.json` — scenario proof and accessibility receipt; SHA-256
  `a666e49723d985312908bf7301e57456450788994fb8be3ef968c46e92bfaf4b`.
- `playwright-report.json` — 2 expected, 0 unexpected, 0 flaky; SHA-256
  `d26e7f62b761baca2ec528bd9b0c1832de6b0680b0f10b949272b326d42216b9`.
- `task-3-nextjs-ssr-hydration.png` — retained screenshot; SHA-256
  `024ccbb540d617caae837dfb01f6efe3324cabb5b33e94c6ebcc72826d70144f`.
- Concurrent-request trace — SHA-256
  `e65035a5660514934a59f9ab2dc572995253ae50164482dbc1837c015e0873a3`.
- Hydration/mutation/realtime trace — SHA-256
  `aa9cd2b0e80f802272e7273a852f46f3973f8f3827c6153f87b99fca8477de7a`.
- `task-5-clean-gates.md` — package, OpenSpec, coverage, Changesets,
  accessibility, security, and not-applicable gate disposition.
- `release-impact.md` — React-first lane separation, package impact, stable
  release impact, trust boundary, and unresolved limits.

All ten verifier commands have exit code zero. Core, React, and Next
typechecks; 203-export validation; 13/13 semantic scenarios; 14/14 coverage
regressions; strict OpenSpec; the release contract; Changesets; frozen install;
JSON parsing; diff hygiene; and security all pass.

## Observed correction

The first packed run exposed an undeclared direct Vitest dependency in the
Next example. The example now declares the already-pinned workspace version.
The first browser run then exposed four serious light-theme contrast failures.
The light Prometheus ember token was darkened to a measured 4.63:1 worst
relevant text/background combination. The clean rerun passed with zero serious
or critical findings. No accessibility waiver was used.

The isolated review then found that the report still identified task 3 and
that provider-owned graphs did not receive their own garbage-collection
interval. The report now identifies task 5, and the engine maintains one
collector per selected graph. The focused regression proves that collecting
one graph does not mutate a sibling graph.

The next complete review found that the advertised no-argument verifier still
defaulted to the obsolete task-3 path, and that scoped listeners plus GC had no
unmount cleanup. The no-argument command now writes task-5 evidence. Listener
attachments are reference-counted per graph, React hooks own their lifecycle,
and the final unmount removes window callbacks and stops that graph's interval.
Focused core and React tests cover both the final-owner cleanup and idempotent
release, and the exact no-argument packed verifier passes.

## Unresolved limits

- Chromium desktop is the only browser runtime certified here.
- Static generation, ISR, partial prerendering, and shared server caches are not
  certified; the example deliberately forces dynamic documents.
- Hosted REST, GraphQL, and realtime services are not exercised.
- Local packed tarballs are certified; npm `next` installation and trusted
  publishing are not.
- The source is a pushed continuation-branch commit, not the immutable stable
  release SHA.
- Three showcase applications, the Docusaurus/Pages site, aggregate release
  certification, and stable registry promotion remain downstream.

These limits are exclusions, not waived acceptance criteria for this change.

## QA boundary

The second complete adversarial review correctly blocked the pre-cleanup
artifact. Artifact-refiner cycle 3 now passes after correcting its critical
path and lifecycle warning. A new complete fresh-context review remains
mandatory before OpenSpec verification and archive; neither earlier review
certifies the changed artifact.
