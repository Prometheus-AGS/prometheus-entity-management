# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-03  
Implementation source: `3090304fc66c2670426b4f4fd60421bad5c55523`  
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
  `5f9cc4c281f2c4e735febe08766f0a1a19d5e464eb828c466d750e24f24a8db3`.
- `browser-evidence.json` — scenario proof and accessibility receipt; SHA-256
  `7fb59f5900b5e6a8b819712435bf7f03e16dd81eba9041140065a53c96eb9a5a`.
- `playwright-report.json` — 2 expected, 0 unexpected, 0 flaky; SHA-256
  `97e5db01caa2ea19bc588e3958e4b3552ac0a01a6a22a86b78c65b9773a18896`.
- `task-3-nextjs-ssr-hydration.png` — retained screenshot; SHA-256
  `28921eb3beb8348ef5d3edfc2ccb574e5a7de45ad058da69276a49c1b5097c5c`.
- Concurrent-request trace — SHA-256
  `e9617f21f50d32a7b9ad62220ab15949f999cb002101a6c6dbd22a0937e6f84f`.
- Hydration/mutation/realtime trace — SHA-256
  `1ec83a85bda4797ac436e040046e1a08c42f7a04e7c169e7d788f33164cc2ced`.
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

Artifact-refiner and a fresh-context adversarial review remain mandatory before
OpenSpec verification and archive. This verdict must be updated with those
results; implementation evidence alone does not certify the archive.
