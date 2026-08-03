# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-03
Implementation source through review corrections: `9051b10f`
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
  `0f4f3d523402aaad25a506ebba51b4a7822fb1bc396005474fc2d441acf0ceda`.
- `browser-evidence.json` — scenario proof and accessibility receipt; SHA-256
  `5d4097e8963e9b9b28668c08190448e2cd11b66ab145b1a275893af06ad06824`.
- `playwright-report.json` — 2 expected, 0 unexpected, 0 flaky; SHA-256
  `304f48170d922b6e1719bea261163f160382df77b9f0315f6f09995b734286c5`.
- `task-3-nextjs-ssr-hydration.png` — retained screenshot; SHA-256
  `accb37f32e88e1f4cbdf49c88fb53deea7ffb75dedd5a66a4edce832549c98c7`.
- Concurrent-request trace — SHA-256
  `23a07124d9c52100a4b731cea64b4711e4ee5f2eef2db15af166aa54e5c372c1`.
- Hydration/mutation/realtime trace — SHA-256
  `0d4b75cbe8faa0c4e50bd10f660039be6cb0d1e20fd178753f7b6cb96287bf93`.
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

Artifact-refiner cycle 2 passes with both prior review warnings corrected and
eight of eight blocking constraints satisfied. A new complete fresh-context
adversarial review remains mandatory before OpenSpec verification and archive;
the earlier review cannot certify the corrected artifact.
