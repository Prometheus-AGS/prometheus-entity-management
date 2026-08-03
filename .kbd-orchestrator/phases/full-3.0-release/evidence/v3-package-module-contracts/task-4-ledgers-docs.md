# Task 4 ledger and documentation synchronization

Date: 2026-08-01  
Change: `v3-package-module-contracts`

## Synchronized surfaces

- Added `release.packages.packed-module-contracts` as an implemented quality gate in `examples/coverage.json`, including its BDD feature, exact command, governing release contract, and task evidence.
- Added `release/package-contracts.md` as the operator-facing explanation of the twelve-tarball gate, loader/declaration map, intentional Tauri boundary, reproduction commands, and explicit certification limits.
- Linked the gate from the root README, `release/README.md`, `RELEASING.md`, and `examples/README.md` while keeping the overall 3.0 release and all five showcases in progress/planned.
- Updated the shared 3.0 skill reference, root skill, skill catalog, and API reference so agents require packed-candidate evidence for npm module/type claims and do not confuse this quality gate with stable-release authority.
- Extended release coverage validation and BDD assertions so the new ledger entry and every referenced path fail closed if they drift.

## Intentionally unchanged

`prometheus-entity-skills/_shared/references/library-exports.json` is unchanged. This change repairs package artifact routing and metadata but does not add, remove, or rename public runtime exports. Regenerating the export-name ledger would misrepresent the affected surface. `pnpm run verify:skills` remains the authoritative synchronization check and is scheduled in the clean-gate task.

No showcase or documentation-site status was promoted. Package artifact evidence is non-visual, so no visual certification applies to this change; later showcase and Docusaurus changes retain their mandatory visual evidence requirements.
