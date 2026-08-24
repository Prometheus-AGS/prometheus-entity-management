# Task 2 — official A2UI bridge implementation

Date: 2026-08-01  
Change: `v3-a2ui-protocol-bridge`  
Task: Implement the scoped vertical slice without weakening exclusions  
Result: **IMPLEMENTED; TEST/CERTIFICATION TASKS REMAIN**

## Implemented public boundary

`@prometheus-ags/a2ui-react` now has two honest entry points:

| Entry | Responsibility |
| --- | --- |
| package root | official A2UI v0.9.1 message/surface rendering plus default-deny Prometheus action policy and graph projection |
| `./ag-ui` | pre-3.0 AG-UI chat, state-delta projection, tool, diff, and approval compatibility APIs |

The frozen release inventory remains twelve npm packages. No extra publication artifact was introduced.

## Official runtime adoption

- Added exact dependencies `@a2ui/react@0.10.2`, `@a2ui/web_core@0.10.5`, and `zod@3.25.76`; the pnpm lockfile records the exact resolutions.
- Root code imports only `@a2ui/react/v0_9` and `@a2ui/web_core/v0_9` and configures `MessageProcessor` with `v0.9.1`.
- `PrometheusA2uiRuntime` delegates official message, schema, catalog, surface, data-model, binding, action, and structured-error ownership to `web_core`.
- Official list/wrapper schemas validate inbound message objects before processing. Exact-version enforcement rejects v0.9 and unsupported v1 candidate inputs rather than silently widening the stable contract.
- `createPrometheusA2uiCatalog` creates a Prometheus-owned explicit subset of the official catalog. The default omits side-effecting `openUrl`; unknown component/function configuration fails immediately.
- Runtime component updates are checked against the selected surface catalog before the official processor mutates the surface.
- `PrometheusA2uiProvider`, `usePrometheusA2ui`, surface hooks, and surface components subscribe to and render the official models. They do not import or mutate the graph.

## Policy and graph boundary

- `createA2uiActionPolicy` validates the official action envelope, requires an exact named rule and application context schema, denies missing authorization, and records executed/denied outcomes.
- Destructive rules require an out-of-band approval callback. An agent cannot grant itself approval through action context.
- `createEntityGraphA2uiActionPolicy` provides upsert, replace, remove, patch, unpatch, and clear-patch actions.
- Every graph action requires explicit entity/action/field allowlists plus the application's tenant/scope authorization callback.
- Replace and remove are destructive. Remove also removes the ID from all lists.
- Graph writes live in the policy/store layer. Official renderer and React orchestration layers have no graph import.

## Module and compatibility boundary

- Build entries produce `index.{mjs,cjs,d.ts,d.cts}` and `ag-ui.{mjs,cjs,d.ts,d.cts}`.
- Exact official A2UI code is bundled into both runtime formats because official `web_core` is ESM-only and the repository requires real CJS loading. React, Zod, and the canonical entity graph remain external dependencies/singletons.
- The official package also publishes ESM-only declarations. A deterministic post-build step rewrites only the generated CommonJS protocol type imports to TypeScript import-mode resolution and fails closed if the generated declaration shape drifts; strict packed Node16 compilation owns this regression.
- `typesVersions` exposes the compatibility subpath to legacy TypeScript resolution.
- Existing AG-UI tests now import the explicit source compatibility entry; all twelve still pass.

## Verification performed in task 2

| Check | Result |
| --- | --- |
| package TypeScript strict check | pass |
| tsup ESM/CJS/declaration build | pass |
| existing AG-UI compatibility tests | 12/12 pass |
| ESLint on package source | pass, zero warnings |
| ESM root + compatibility import smoke | pass |
| CommonJS root + compatibility require smoke | pass |
| official v0.9.1 create-surface/components/data smoke | pass |
| allowed entity graph action | executed and visible through canonical graph read |
| tenant denial, field denial, approval denial | fail closed |
| v0.9, v1 candidate, unknown component | rejected with structured code |
| runtime with no application authority | unknown action denied |
| `publint` | pass |
| `attw` root and `./ag-ui` | pass for Node10, Node16 CJS, Node16 ESM, and bundler |
| architecture search | official/React layers have no graph access; no root AG-UI parser/exports |

## Deferred to the declared later tasks

- Task 3 owns BDD feature/step files, focused official-renderer unit/integration suites, packed consumer fixtures, browser rendering, accessibility, keyboard, and policy evidence.
- Task 4 owns the example coverage manifest, public API/export ledgers, skills, README, migration tables, changelog, and Docusaurus input contracts.
- Task 5 owns clean monorepo/package/docs/security gates.
- Task 6 owns the final verification bundle, limitations, release impact, archive, and active-spec promotion.

No visual certification is claimed in task 2. No registry, GitHub Pages environment, remote service, or publication state was mutated.
