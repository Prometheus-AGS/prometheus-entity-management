# React inspector task 1 — dependency and package contract

Date: 2026-08-29

## Result

PASS. The React inspector can begin production implementation without
simulating or weakening any dependency named by the accepted UI specification.

## Dependency evidence

| Dependency | Archive | Commit | Executable tasks | Acceptance evidence |
| --- | --- | --- | --- | --- |
| Entity inspection | `.kbd-orchestrator/changes/archive/2026-08-29-v3-devtools-entity-inspection` | `dd574d24f683f13ad218c4e7ccbc921d7a9801e6` | `1,2,3,4,5,9,10` all complete | `task-9-packed-acceptance.json` and `verification.md` |
| Time travel | `.kbd-orchestrator/changes/archive/2026-08-29-v3-devtools-time-travel` | `91fa67cf473c0ee4be24442e06fbb4e4eb003109` | `1,2,3,4,5,9,10` all complete | `task-9-packed-acceptance.json`, `archive-guard-final.json`, and `verification.md` |

The current `packages/entity-graph-core/src/devtools/index.ts` exports the
controller/client plus the entity, dirty/error, view-membership, relationship,
preview/restore, event-history, snapshot-history, rewind, return-to-live, and
value-policy contracts consumed downstream.

## Existing React package evidence

- Manifest: one root conditional export; version `3.0.5`; `dist`-only code
  payload; `sideEffects: false`; no `typesVersions` yet.
- Builder: repository `definePackageConfig` produces ESM, CommonJS, and both
  declaration surfaces and supports an entry map; core uses the same mechanism
  for its optional `./devtools` entry.
- Runtime boundary: React/Zustand/UI dependencies are externalized. The root
  currently re-exports the lightweight `useGraphDevTools` compatibility hook
  from `src/devtools.ts` and mounts no debug UI.
- Contract validator: validates the exact root conditional object and accepts
  additional intentional subpath exports under the packed `dist` directory.

## Decision

Implement side-effect-free `./devtools` and explicit side-effectful
`./devtools/auto` entries. Preserve the root hook without importing the new
inspector. Run enablement checks before lazy loading; mount the embedded UI in
an open Shadow Root with inherited `--pem-devtools-*` overrides and no global
CSS. This satisfies automatic development visibility after explicit opt-in
without changing normal-root behavior.

## Verification boundary

This task is an architecture/package confirmation. No test, typecheck, or build
was run. The first test evidence remains task 11's complete packed
Vite/Next/browser acceptance flow after production tasks 2–6 and 10 are wired.

## Control-plane receipt

The signed KBD driver completed canonical task 1 at revision 347 with both
task hooks passing. The documented task-after projection reset changed the
parent to pending; signed command
`codex-react-inspector-restore-after-task-1-20260829` restored the parent change
to in-progress at revision 348. Task 2 remains the exact next work.
