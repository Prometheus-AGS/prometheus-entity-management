## Why

D2, D1. Split `runtime-core.ts` (925 lines) first (G10). 1.0 catalog with its own id beside the v0.9.1 catalog. Delete the RC downgrade; translate `@`-prefixed keys, reject both forms on one component. Capabilities, 1.0 error codes, limits, `theme` split (G11). `@accessibility` → ARIA for the 1.0 catalog, implemented from the 1.0 spec's MUST rules (W10 as far as conformance needs). Release-contract baseline updated in spec, JSON and validator.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 2 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Split `runtime-core.ts` below 800 lines along protocol boundaries without behaviour change
- Add a 1.0 catalog with its own id beside the v0.9.1 catalog, deciding build-on versus alongside upstream `catalogs/basic/v1` with recorded evidence and recording the catalog-mismatch error code, and split the catalog public API by protocol version
- Route 1.0 envelopes through the processor's 1.0 adapter, delete the RC downgrade in `v1-compat.ts`, and translate `@`-prefixed envelope keys, rejecting a component that carries both forms
- Model renderer capabilities (`supportedCatalogIds`, `inlineCatalogs`, `a2uiRendererDataModel`) and 1.0 error codes, and apply resource limits to every new message type
- Split `theme` handling by protocol version in surface export, shadow seed and activity plan
- Map `accessibility` metadata to ARIA for the 1.0 catalog following the 1.0 specification's MUST rules
- Write spec deltas for `v3-a2ui-protocol-bridge` and `v3-release-contract`, and update the RC and AG-UI 0.0.59 baseline in `release/v3-release-contract.json` and `scripts/validate-v3-release-contract.mjs`

## Impact

- Scope: `runtime-core`, catalogs, `v1-compat.ts` (deleted), export/shadow seed/activity plan, release contract
- Depends on: 1 · Est. L · Complexity High · frontier · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
