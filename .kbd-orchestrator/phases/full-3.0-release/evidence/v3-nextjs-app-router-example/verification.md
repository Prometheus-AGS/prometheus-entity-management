# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-03
Implementation source through review corrections: `499ef73`
Verdict: **PASS — IMPLEMENTATION EVIDENCE COMPLETE; QA/ARCHIVE PENDING**

## Acceptance matrix

| Plan or OpenSpec criterion | Authoritative evidence | Result |
| --- | --- | --- |
| Concurrent SSR proves request isolation | Packed production browser receipt records 12 concurrent requests and 12 unique graph IDs; focused server test creates 24 isolated serializable snapshots | Pass |
| Hydration has no mismatch or duplicate fetch | Browser receipt records `clientFetches: 0` and `hydrationErrors: 0`; route transition preserves the graph and reload replaces it | Pass |
| Clean production build uses packed packages | Verifier preserves and validates the checked-in Next config, builds and packs core plus React `3.0.0-rc.1`, installs only those tarballs into an external Next.js 16 app with strict peers, type-checks, and production-builds it | Pass |
| Browser E2E covers the required server/client flow | Two Playwright tests pass for request isolation, hydration, Server Action mutation, realtime takeover, route persistence, and reload behavior | Pass |
| Suspense/error and accessibility boundaries work | Loading and route error boundaries are structurally checked; the runtime receipt reports zero serious or critical axe findings | Pass |
| Public API, coverage, skills, documentation, and Changesets stay synchronized | Next showcase and SSR evidence are implemented in `examples/coverage.json`; 203/203 React runtime exports match the ledger; docs and scoped-store skills are updated; Changesets status passes | Pass |
| No mandatory lane is silently skipped | Task-5 receipt lists every executed gate and explicitly records Dart/Melos, Cargo, Flutter, and Tauri as not applicable to this Next-only change | Pass |
| Security boundary remains fail-closed | Server Action denial test validates allowlisted IDs/statuses and resolves server-owned data; security audit reports zero critical, high, or blocking advisories | Pass |

## Reproducible evidence

- `task-5-verification.json` — command-by-command packed consumer and browser
  receipt; SHA-256
  `8c7878519e71964d17aca7edd7723f2808a99b116accd5255c207ad3093a7d3e`.
- `browser-evidence.json` — scenario proof and accessibility receipt; SHA-256
  `a5b0721a6eaff427b2425cd0d8efdf005235a67b0afeda676d284bd7580da664`.
- `playwright-report.json` — 2 expected, 0 unexpected, 0 flaky; SHA-256
  `6ab040d130b430d9d27945242d16df362b45a25a80074f8499179e23d62bbd37`.
- `task-3-nextjs-ssr-hydration.png` — retained screenshot; SHA-256
  `c11fb1431ae5a6c20604dd4f4a7deb570146b4af9176f8bcc3b47285b0b70497`.
- Concurrent-request trace — SHA-256
  `d95324e306cd565ed01b70045bfd2974bd5a5f15b92a53f85eca0171527677d7`.
- Hydration/mutation/realtime trace — SHA-256
  `a6b41f75f913b8071cce6a8d72da2e4692213d7c100cb45a4452042f9f30dfca`.
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

The following complete review then found that the packed verifier replaced the
checked-in Next config and that the example realtime manager stayed bound to
its initial provider. The verifier now preserves the copied config byte for
byte, rejects workspace source aliases, and records its SHA-256. The scoped
manager is memoized by the current provider store, its page effect unregisters
the old adapter when that manager changes, and a runtime regression proves
events write only to the replacement graph. The exact packed gate now passes
8/8 structural tests and 16/16 focused runtime tests with the checked-in config.

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

The latest complete adversarial review correctly blocked the pre-correction
artifact. Artifact-refiner cycle 4 now passes after correcting its
config-certification critical and provider-rebinding warning. A new complete
fresh-context review remains
mandatory before OpenSpec verification and archive; neither earlier review
certifies the changed artifact.
