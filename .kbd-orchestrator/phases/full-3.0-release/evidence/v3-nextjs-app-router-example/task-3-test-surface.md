# Task 3 — test and packed-consumer certification surface

Date: 2026-08-03
Change: `v3-nextjs-app-router-example`
Result: **CHECKS IMPLEMENTED; CLEAN PACKED BROWSER EXECUTION RESERVED FOR TASK 5**

## Added checks

- Core unit coverage proves equal fetch keys do not deduplicate across
  request-owned stores and realtime takeover writes only to its selected graph.
- React unit coverage proves two `GraphStoreProvider` trees and the default
  singleton remain mutually isolated.
- Next unit coverage creates 24 concurrent server snapshots, confirms unique
  request markers, proves snapshots do not share entity objects, round-trips a
  JSON snapshot into a hydrated graph, and verifies no server preload writes to
  the default singleton.
- Server Action units accept a known task/status and deny unknown task IDs and
  unsupported statuses.
- The root layout now declares `force-dynamic`; without this, Next could have
  cached the request marker at build time and invalidated the per-request claim.
- The runtime page exposes a deterministic `Client fetches: 0` receipt. It uses
  the real `useEntity` lifecycle, so a client refetch after server hydration
  increments the observable counter.
- A production Playwright suite issues 12 concurrent document requests,
  requires 12 unique server graph IDs, checks zero client fetches and zero
  hydration errors, verifies route persistence and reload replacement, executes
  the Server Action mutation and realtime takeover, and runs axe.
- `scripts/verify-nextjs-app-router-example.mjs` builds and packs core plus the
  React binding, copies the Next example outside the workspace, replaces both
  workspace dependencies with candidate tarballs, installs the external app,
  runs its typecheck and production build, and launches Playwright against
  `next start`. The browser config fails closed when the packed-app path is
  absent and never reuses a running source server.

## Focused verification executed

| Check | Result |
| --- | --- |
| `pnpm run test:nextjs-app-router:unit` | PASS — 12 tests |
| `node --test tests/release/v3-nextjs-app-router-example.test.mjs` | PASS — 5 tests |
| Core package `tsc --noEmit` | PASS |
| React source-mapped `tsc --noEmit` | PASS |
| Next source-mapped `tsc --noEmit` | PASS |
| ESLint over every touched test/runtime file | PASS, zero warnings |
| verifier syntax and package JSON parsing | PASS |
| `git diff --check` | PASS |

## Evidence boundary

This task proves that the required tests and fail-closed packed-consumer harness
exist and that their focused unit/contract layers pass. It does **not** claim a
production build, packed install, live concurrent HTTP result, Playwright pass,
axe pass, screenshot, or trace. Those are higher-tier clean-gate outputs and
remain task 5. Coverage and public documentation remain task 4; final release
impact and limitations remain task 6.

No npm, GitHub release, or other registry state was changed.
