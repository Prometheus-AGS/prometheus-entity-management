# Verification — `v3-nextjs-app-router-example`

Date: 2026-08-20
Verdict: **PASS — IMPLEMENTATION CERTIFIED AND OPENSPEC ARCHIVED**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Concurrent SSR tests prove request isolation | `src/lib/server/request-isolation.test.ts` (4 node:test cases: independent stores, no shared mutation, tenant slices, dehydrated payload independence) via `pnpm --filter prometheus-entity-management-nextjs test:ssr-isolation` | Pass |
| Hydration produces no mismatch or duplicate fetch | `RequestHydrationBoundary` renders an identical fallback on server and first client render, writes entities/lists post-mount with freshness stamps; browser receipt `browser-evidence.json` records zero hydration errors and `window.__pemFetchMetrics` duplicate-fetch counts | Pass |
| Clean production build passes | `next build` succeeds; `/release-showcase` is `ƒ Dynamic` (force-dynamic RSC) | Pass |
| Browser E2E passes | `tests/browser/v3-nextjs-app-router-example.spec.ts`: 4/4 Chromium tests (SSR prefetch card, hydration takeover, mutations/realtime, route transitions) with screenshots and traces in `playwright-report.json` | Pass |
| Accessibility | axe in the browser flow reports no serious/critical violations after the light-mode `--primary`/`--ring` contrast fix (`globals.css`) | Pass |
| Packed-package evidence boundary | Receipts labeled `source-workspace-production-browser`, `countsAsPackedPackageEvidence: false`; packed-tarball certification stays with `v3-package-module-contracts` / `v3-release-pipeline-rc` | Pass (bounded) |

## Reproducible evidence

- `task-3-verification.json` — single-command verifier receipt
  (`pnpm run verify:nextjs-app-router`, mirrors the Vite verifier chain).
- `browser-evidence.json`, `browser-ssr-hydration.png`,
  `browser-mutations-realtime.png`, `browser-route-transitions.png` — browser
  receipt and screenshots; `playwright-artifacts/` retains traces.
- `playwright-report.json` — 4/4 pass, port 4180 against `next start`.

## Gates run (all exit 0)

- `pnpm --filter prometheus-entity-management-nextjs typecheck`
- `pnpm run test:nextjs-app-router:isolation` — 4/4 node:test
- `pnpm run test:nextjs-app-router:browser` — 4/4 Playwright (production server)
- `pnpm run verify:nextjs-app-router` — full chain, wrote `task-3-verification.json`
- `pnpm run verify:example-coverage` — errors: []
- `pnpm run test:v3-nextjs-app-router-example` — 6/6 release contract tests
  (including a static guard that server code never writes the global store)
- `pnpm run bdd:nextjs-app-router` — 3 scenarios / 17 steps
- `pnpm run lint` — clean (`--max-warnings 0`)
- `pnpm run validate` — errors: []
- `openspec validate v3-nextjs-app-router-example --strict` — valid
- `pnpm changeset status` — pass after adding the empty changeset
  `.changeset/certify-nextjs-app-router.md` (example-only change, no release
  bump). Note: this gate fails on ANY work on this branch without a changeset,
  because local `main` lags 430 package files behind and the three prior
  changesets are consumed in `pre.json` rc mode — a pre-existing baseline
  condition, verified on a clean stashed tree before this change.

Per A-9 tier discipline and the Vite precedent, the focused gate set above is
the change-completion gate; the repo-wide battery stays with later release
phases and is not claimed here.

## Unresolved limits

- Browser certification is Chromium desktop only (Firefox/WebKit/mobile not certified).
- The showcase uses the deterministic demo transport only; PGlite, Loro, and
  live REST/GraphQL modes remain Vite-example surface and are intentionally out
  of scope here.
- Evidence is source-workspace based; packed-tarball consumer proof is owned by
  `v3-package-module-contracts` / `v3-release-pipeline-rc`.
- Realtime is demonstrated via the deterministic demo realtime transport;
  live Supabase/WebSocket takeover is not certified by this change.

## Visual evidence

Required and passing: three retained screenshots with traces and zero
serious/critical axe violations.
