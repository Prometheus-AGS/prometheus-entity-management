# Task 1 dependency readiness — `v3-tauri-universal-example`

Date: 2026-08-04
Verdict: **PASS — ALL THREE DEPENDENCIES ARE ARCHIVED AND VERIFIED**

## Dependency matrix

| Dependency | Completion evidence | Relevant contract for this example | Result |
| --- | --- | --- | --- |
| `v3-tauri-mobile-plugin` | Archived 6/6 at `openspec/changes/archive/2026-08-02-v3-tauri-mobile-plugin/`; promoted strict spec; `final-verification.json` | Generated TypeScript bindings, least-privilege capabilities, desktop command/denial, Android physical-device command/denial, and iOS simulator command/denial are certified | Pass |
| `v3-example-coverage-contract` | Archived 6/6 at `openspec/changes/archive/2026-08-01-v3-example-coverage-contract/`; promoted strict spec; retained clean verification | The shared Task/Project/User fixture, thirteen semantic scenarios, sixteen capabilities, sixteen stable artifacts, deterministic transports, and fail-closed evidence mapping remain authoritative | Pass |
| `v3-sync-persistence-path` | Archived 6/6 at `openspec/changes/archive/2026-08-01-v3-sync-persistence-path/`; promoted strict spec; `final-verification.json` | Real PGlite close/reopen, ID-only list restore, two-client Loro convergence, deterministic conflicts, reconnect recovery, and packed consumers are certified | Pass |

The signed KBD projection for older imported changes remains pending because
their historical task events were not backfilled. It is not used as completion
proof. The archived task surfaces, promoted strict specifications, and retained
verification receipts are the direct dependency evidence.

## Current-state checks

- Each archived dependency contains exactly 6/6 checked tasks.
- Each promoted dependency specification passes explicit strict validation.
- Each dependency retains a human-readable verification artifact.
- Current example coverage has four implemented showcases and leaves only
  `tauri-desktop-mobile` planned.
- The Tauri plugin receipt records a Samsung Android 16 physical-device lane,
  an iPhone 17/iOS 26.5 simulator lane, and explicit capability-denial proof.

## Boundary carried into implementation

Dependency completion does not certify the universal application. This change
must still provide one shared React/Vite frontend and Tauri project, typed graph
commands/events, native persistence and restart restore, offline/reconnect,
denied-capability behavior, desktop lifecycle, mobile pause/resume, deep-link
handling, responsive/safe-area/touch/keyboard behavior, desktop command E2E,
and separately labeled Android and iOS build/smoke receipts. Platform
conditionals belong at the adapter boundary rather than in forked application
logic.

No dependency, package declaration, application code, coverage status, public
API ledger, registry object, or npm tag changes in this task. The frozen React
`3.0.0-rc.1` source remains independent on remote `main` at
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`.
