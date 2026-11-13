## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `a2ui-v1-native-surfaces` / `a2ui-v1-native-surfaces#<n>`.

- [x] 2.1 Split `runtime-core.ts` below 800 lines along protocol boundaries without behaviour change
- [x] 2.2 Add a 1.0 catalog with its own id beside the v0.9.1 catalog, deciding build-on versus alongside upstream `catalogs/basic/v1` with recorded evidence and recording the catalog-mismatch error code, and split the catalog public API by protocol version
- [x] 2.3 Route 1.0 envelopes through the processor's 1.0 adapter, delete the RC downgrade in `v1-compat.ts`, and translate `@`-prefixed envelope keys, rejecting a component that carries both forms
- [x] 2.4 Model renderer capabilities (`supportedCatalogIds`, `inlineCatalogs`, `a2uiRendererDataModel`) and 1.0 error codes, and apply resource limits to every new message type
- [x] 2.5 Split `theme` handling by protocol version in surface export, shadow seed and activity plan
- [x] 2.6 Map `accessibility` metadata to ARIA for the 1.0 catalog following the 1.0 specification's MUST rules
- [x] 2.7 Write spec deltas for `v3-a2ui-protocol-bridge` and `v3-release-contract`, and update the RC and AG-UI 0.0.59 baseline in `release/v3-release-contract.json` and `scripts/validate-v3-release-contract.mjs`
