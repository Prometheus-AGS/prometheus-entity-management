# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-03
Implementation source through review corrections: `996750f`
Verdict: **PASS — VERIFIED AND ARCHIVED WITH ONE RETAINED WARNING**

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
  `569b6d8e2d6687478167299ca62a90f03c6e3b7d648925e764d7f67f76c4f62c`.
- `browser-evidence.json` — scenario proof and accessibility receipt; SHA-256
  `61e6850611de77cffa75fe9ee97630ae1be9a784db68005fb5263bb74a601978`.
- `playwright-report.json` — 2 expected, 0 unexpected, 0 flaky; SHA-256
  `953bd98d4c798b9a8ce37f624d59ad5eca30b76b31e1585b419eb1c1f3649a3c`.
- `task-3-nextjs-ssr-hydration.png` — retained screenshot; SHA-256
  `de0e5002ed0fceacb9e6c6253aec92e2b9f8de5260274fe3604214534535d38b`.
- Concurrent-request trace — SHA-256
  `bd5ca69766797fb62e825e9b8b27838f062d0cdc971c0e91c3427204a7b38479`.
- Hydration/mutation/realtime trace — SHA-256
  `f01a28c19992dfe0067e83c38d32d3caf7c3d5364b2bf7087e531ac7310b10e6`.
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

The next review showed that the zero-alias claim was still too narrow because
the copied app retained source-only Vitest aliases outside `next.config.ts`.
The packed boundary now excludes test files and their Vitest config after the
focused source tests pass, scans all 112 remaining TypeScript, JavaScript, JSON,
and YAML files, and fails with the exact offending paths if an alias remains.
The fresh receipt records zero aliases and passes 9/9 structural tests.

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

Artifact-refiner cycle 5 passes after broadening the alias scan to all 112
copied command-relevant text files. The subsequent fresh-context REST review is
cross-model verified-distinct and returns PASS with zero critical findings, one
warning, and zero suggestions; its anti-sycophancy score is 0.0 under strict
mode. OpenSpec verification may therefore proceed to archive.

The retained warning is explicit: a replaced scoped `RealtimeManager` may
flush already-queued changes into its now-abandoned old graph before the timer
expires. Adapter cleanup prevents new events, and the manager does not write to
the replacement graph. A later fixed-group prerelease may add an explicit
manager disposal contract; this change does not report the warning as fixed.

## OpenSpec verification report

| Dimension | Status |
| --- | --- |
| Completeness | Pass — 6/6 tasks and 1/1 requirement complete |
| Correctness | Pass — requirement and archive scenario map to direct source, focused runtime tests, packed production build, and browser evidence |
| Coherence | Pass — follows the adopted App Router, per-request graph, server preload, hydration, and client-takeover design |

Issues: 0 critical, 1 warning, 0 suggestions. The warning is the queued-flush
lifecycle item above. Recommendation: add and test an explicit
`RealtimeManager.dispose()`/pending-queue cancellation contract in the later
prerelease that consumes this continuation's Changeset.

## Archive disposition

- Schema: `spec-driven`.
- Artifacts: proposal, design, delta spec, and tasks all complete.
- Tasks: 6/6 complete.
- Main spec: synced to `openspec/specs/v3-nextjs-app-router-example/spec.md`
  and strict-valid.
- Archive: `openspec/changes/archive/2026-08-03-v3-nextjs-app-router-example/`.
- Warning: retained without waiver or false fixed claim.
