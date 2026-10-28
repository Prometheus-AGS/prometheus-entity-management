# Readers of the files edited by a2ui-release-status-reconcile

Recorded by `a2ui-release-status-reconcile#5` on 2026-10-28. Method: searched `scripts/`, `tests/`, `website/scripts/` and `.github/` for each file name and field, then read the asserting lines. "Ran" means the check was executed in this session after the edits.

| Edited file | Reader | What it checks | Result |
|---|---|---|---|
| `release/npm-registry-status.json` | `scripts/readme-parity.mjs` | `candidateState === 'published'` exactly when the expected tag holds the candidate; package inventory | **Ran, passes** (`verify:readme-parity`) |
| `release/npm-registry-status.json` | `website/scripts/check-generated-artifacts.mjs` | `packed-inventory.json` `revision` equals `candidateSourceSha`; package versions equal manifests | **Ran, passes** (was failing before the edits: inventory still at 4.1.1 while manifests are 4.2.0) |
| `release/npm-registry-status.json` | `website/scripts/generate-packed-api.mjs` | stamps `candidateSourceSha` as the inventory revision | Ran (`docs:api` exit 0) |
| `README.md`, `website/docs/operations/release.md` (generated blocks) | `scripts/readme-parity.mjs` | generated registry table matches the status file | **Ran, passes** |
| `release/a2ui-protocol-bridge.md`, skills reference, package README | `tests/release/v3-a2ui-protocol-bridge.test.mjs:83-89` | text "Protocol validity never grants application authority", the `@prometheus-ags/a2ui-react/ag-ui` subpath, `openUrl.*excluded` | Read; strings confirmed present in all joined docs. Test **not run** (implementation-first) |
| same three documents | `tests/steps/v3-a2ui-protocol-bridge.steps.ts:251,254,260` | the same three strings | Read; confirmed present |
| same three documents | `tests/steps/v3-a2ui-protocol-bridge.steps.ts:252-253` | `/@a2ui\/react@0\.10\.2/` and `/@a2ui\/web_core@0\.10\.5/` | **CONFLICT.** The documents now say 0.12.0, so these two assertions will fail. The same step asserts the manifest pins are 0.12.0 at lines 53-55, so the step was already internally inconsistent and only passed because the documents were stale |
| skills reference | `tests/release/fixtures/upgrade/a2ui-ag-ui-subpath.ts:9` | comment only | No assertion |
| `CHANGELOG.md`, `packages/a2ui-react/CHANGELOG.md` | `scripts/package-contract-validation.mjs`, `tests/release/v3-package-module-contracts.test.mjs`, the module-contract step | the file exists and is packed in the tarball | No content assertion; unaffected |

## Conflicting assertions handed to `a2ui-hardening-acceptance#5`

1. `tests/steps/v3-a2ui-protocol-bridge.steps.ts:252-253`: change the expected pins to `@a2ui/react@0.12.0` and `@a2ui/web_core@0.12.0` (aligns with lines 53-55 and with the documents).
2. Already planned there: the "honors replacement" assertion (`packages/a2ui-react/src/official-a2ui.test.tsx:322-376`) and the hard-coded export counts (`tests/release/v3-a2ui-protocol-bridge.test.mjs:56-57` expect 19 and 9; the step expects 18 and 9).

## Also noticed, not changed

- `packages/a2ui-react/src/official/types.ts:11` mentions `@a2ui/react@0.10.2` in a comment about a workaround. Whether the workaround still applies at 0.12.0 was not checked; source is outside this task's scope.
- `release/a2ui-protocol-bridge.md:66` says the published packages "do not export the documented v1 renderer entry points". `@a2ui/web_core` 0.12.0 does export a `./v1_0` entry, so this sentence may be stale; verifying it needs inspecting `@a2ui/react`, which was not done.
