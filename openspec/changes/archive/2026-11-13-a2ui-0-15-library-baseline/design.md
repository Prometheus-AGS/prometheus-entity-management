## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G8, G9, G13; goal 4.

## Decisions

Adopted operator decisions that bind this change: D1 (target 0.15.0), D6 (keep skipLibCheck false; plan refines the mechanism with declaration bundling).

## Open design records

Recorded here during execution, before dependent code: Changelog-to-call-site map (task 1); bundle size before/after; whether bundling @a2ui declarations removes the @a2ui/web_core runtime dependency.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: @a2ui 0.12.0 → 0.15.0 changelog mapped to call sites (task 1.1, 2026-11-12)

Sources: `@a2ui/web_core@0.15.0` package `CHANGELOG.md` (registry tarball) and
`typescript/renderers/react/CHANGELOG.md` in `a2ui-project/a2ui` at `0d2fcf3` (only the 0.13.0–0.15.0
sections; "Unreleased" entries are not in any npm build and are ignored). Call sites are in
`packages/a2ui-react/src` (tests excluded).

| Upstream change (version) | Our call site | Impact | Action |
| --- | --- | --- | --- |
| `@a2ui/react/v0_9` no longer exports `basicCatalog`; it lives in `@a2ui/web_core/v0_9/basic_catalog` and is still re-exported (deprecated) from `@a2ui/web_core/v0_9` (react 0.13) | `official/catalog.ts:6-9` imports `basicCatalog` from `@a2ui/react/v0_9` | **Build break** | Import `basicCatalog` from `@a2ui/web_core/v0_9/basic_catalog` (task 1.4) |
| Basic catalog renders as W3C custom elements inside `<a2ui-react-<name>>` and no longer server-renders (react 0.13) | `react/a2ui-provider.tsx` (`A2uiSurface`), SSR fallback markup, visual lane | Behaviour change; D8 accepts client-only rendering | Keep SSR fallback markup; document (change 11); visual lane re-captured (change 11) |
| Package root of `@a2ui/react` no longer re-exports v0.8 (react 0.13) | none (we import `@a2ui/react/v0_9`) | none | none |
| `createComponentImplementation` keeps and the processor enforces `allowedParents`/`allowedChildren` (react 0.15) | `official/catalog.ts` `createPrometheusA2uiComponent` (wraps the official `ComponentApi`) | Payloads violating parent/child rules are now rejected for custom components too | Keep passing the official `api` unchanged so the official rules apply; record in docs (task 1.4) |
| `A2uiSurface` renders no debug placeholders (react 0.15) | `react/a2ui-provider.tsx` | Missing components render nothing instead of `[Loading id...]` | No code change; note for the visual lane |
| `SurfaceModel.catalog` may be `undefined` (web_core 0.14) — **reverted for typing in 0.15**: the deprecated getter is typed `Catalog<T,F>` again "since every pre-1.0 surface has a default catalog" | `surface.catalog.id` in `shadow-seed.ts:23`, `runtime-core.ts:576,897,900`, `surface-export.ts:118,135,164` | Safe for our v0.9.1 surfaces (always created with a catalog). **1.0 surfaces may have no default catalog** | No change in change 1; change 2 must read `defaultCatalog` defensively on 1.0 surfaces (assessment G13 overstated the 0.15 impact) |
| `CatalogInterface` requires `toJson()` and `validationSchema` (web_core 0.14) | `official/catalog-core.ts` `createAllowlistedCatalog` constructs an official `Catalog` (not a custom `CatalogInterface`) | Satisfied by the official class | Confirm `createAllowlistedCatalog` uses `new Catalog(...)`; no custom interface (task 1.4) |
| `new Catalog(id, components, functions, theme…)` without `protocolVersion` builds a `'0.9'` catalog (deprecated overload, web_core 0.15) | `official/catalog-core.ts` | Our catalog declares `"v0.9.1"`; check which constructor form it uses | Use the explicit `protocolVersion` form (task 1.4) |
| Catalog `invoker` refuses `allowedCallers: 'agentOnly'` functions in bindings/checks with `EXPRESSION_ERROR` (web_core 0.15) | allowlisted functions in `catalog-core.ts` (`DEFAULT_PROMETHEUS_A2UI_FUNCTIONS`) | Only if a default function is agent-only | Check the allowlisted functions' `allowedCallers` (task 1.4) |
| v1.0 wire value unified on `'1.0'` (web_core 0.15); `ProtocolVersion = 'v0.8' \| 'v0.9' \| 'v0.9.1' \| '1.0'` | `runtime-core.ts:631` `getRendererCapabilities({versions:["v0.9.1"]})`; `getClientDataModel` | v0.9.1 path unchanged | none in change 1; change 2 adds `'1.0'` |
| `getRendererCapabilities(options)` requires `versions`; `getClientCapabilities` deprecated (web_core 0.15) | `runtime-core.ts:627-635` passes `versions` | none | none |
| Peer-catalog APIs removed (web_core 0.15) | none | none | none |
| `ComponentModel.componentTree` names the type `component`, not `type` (web_core 0.13) | `surface-export.ts` (reads component models) | Check whether export reads `componentTree` | Verify in task 1.4; adapt if it reads `type` |
| `DataContext.set(path, null)` on pre-1.0 surfaces stores `null` again (web_core 0.15) | `data-reconcile.ts` | Matches 0.12 behaviour | none |
| Basic-catalog CSS classes gain an `a2ui-` prefix (web_core 0.14) | none in our styles found; visual lane screenshots | Visual difference only | Re-capture visual evidence (change 11) |
| `requiresUserActivation` enforced for `openUrl` (web_core 0.13) | `openUrl` already excluded from our default catalog | none | none |
| `A2uiClientActionSchema` still exported from `@a2ui/web_core/v0_9` (`v0_9/schema/client-to-server`), version enum `"v0.9" \| "v0.9.1"` | `policy/action-policy.ts` | none | none |

Test files (`official/catalog.test.ts` imports `basicCatalog` from `@a2ui/react/v0_9`) are legacy artifacts under
CLAUDE.md and are not edited as part of this change; if they block the package typecheck they are excluded from it
rather than expanded.

## Record: dependency pin, patch and bundle size (task 1.2, 2026-11-12)

- `@a2ui/web_core` and `@a2ui/react` pinned exactly at `0.15.0` in `packages/a2ui-react/package.json`; lockfile
  re-resolved (`pnpm install --no-frozen-lockfile`, pnpm 10.33.0). `@a2ui/react@0.15.0` now pulls
  `@a2ui/markdown-it@0.2.2`, whose peer is `@a2ui/web_core@^0.14.0` (warning only; this package uses its own
  markdown port, not that module).
- One patch, `patches/@a2ui__web_core@0.15.0.patch` (105 files), replaces `patches/@a2ui__web_core@0.12.0.patch`:
  - every bare `zod` module specifier in `.js` and `.d.ts` (53 JS files, 50 declaration files, including the 2,160
    `import("zod")` type references) is retargeted to `zod/v3`; 0 bare specifiers remain;
  - `package.json` `dependencies.zod` widened to `^3.25.76 || ^4.0.0`;
  - #75: the three extension-less relative imports in declarations (`v0_8/types/types.d.ts` → `./components.js`,
    `./primitives.js`; `v0_8/data/guards.d.ts` → `../types/types.js`) gain `.js`. A full scan finds no other
    extension-less relative specifier.
- Bundle size **before** (0.12.0, `pnpm --filter @prometheus-ags/a2ui-react build`, all ESM outputs): 5 files,
  708,626 bytes raw, 154,731 bytes gzip (`index.mjs` 48,488 / 11,428; `ag-ui.mjs` 33,280 / 6,887; `headless.mjs`
  1,049 / 444; rest in shared chunks). **After** is measured once the package builds again (after task 1.4 fixes
  the `basicCatalog` import) and appended here.
- Open observation: `zod-to-json-schema` (a web_core dependency, `^3.25.2`) stays external to our bundle as in
  0.12.0; no change made.

## Record: consumer-facing fix for #75 (task 1.3, 2026-11-12)

- `packages/a2ui-react/tsup.config.ts` sets `dts: { resolve: [/^@a2ui\//] }`, so the published declarations
  inline the official `@a2ui/*` types instead of importing `@a2ui/web_core/v0_9`. Packed consumers then never load
  the registry package's v0.8 declarations, patched or not.
- `@a2ui/web_core` stays a runtime dependency: the inlined types still reference its own dependencies
  (`@preact/signals-core`, `lit`, `zod/v3`), which consumers get through it. Whether it can move to
  `devDependencies` (removing the unused zod 3 install that 4.4.0 documented) stays an explicit UNKNOWN in the
  contract; it is not changed here.
- The produced declaration size and the absence of `@a2ui/` specifiers in `dist/*.d.ts` are checked by the single
  build at the end of this change (task 1.4) and, as evidence, by UPG-15 in the boundary run.

### Draft upstream fix (for a2ui-project/a2ui, not filed)

> **Title:** web_core: add `.js` extensions to relative imports in v0_8 declarations (TS2835 under NodeNext)
>
> `src/v0_8/types/types.d.ts` imports `./components` and `./primitives`, and `src/v0_8/data/guards.d.ts` imports
> `../types/types`, without extensions. Consumers that type-check with `moduleResolution: NodeNext` (or Node16) and
> `skipLibCheck: false` get TS2835 ("Relative import paths need explicit file extensions") as soon as these files
> enter the program, for example via `@a2ui/web_core/v0_9`. The source `.ts` files should import `./components.js`,
> `./primitives.js` and `../types/types.js`, matching the rest of the package. Reproduced against 0.15.0.

## Record: API fixes and declaration bundling (task 1.4, with a revision of task 1.3, 2026-11-12)

- `official/catalog.ts` imports `basicCatalog` from `@a2ui/web_core/v0_9/basic_catalog` and only
  `createComponentImplementation` from `@a2ui/react/v0_9`. `headless.ts` uses the same subpath.
- `PrometheusA2uiComponentImplementation` is now an alias of the official `ReactCatalogComponent` (a React
  implementation **or** a Web Component implementation), because the official basic catalog holds Custom Element
  implementations from 0.13. **Public type change** (5.0.0); no code in this package read `.render`.
- Checked and unchanged: `createAllowlistedCatalog` builds an official `Catalog` with the explicit
  `protocolVersion` form; no default allowlisted function is `agentOnly`; nothing reads `componentTree`.
- **Second patch:** `patches/@a2ui__react@0.15.0.patch`. `@a2ui/react` 0.15.0's four declaration files import bare
  `zod` (zod 4 here) while the patched web_core uses `zod/v3`, so the same `ZodTypeAny` named two unrelated types
  (TS2322/TS2344 in `catalog.ts`, `runtime-types.ts`). The patch retargets those declarations to `zod/v3` and widens
  its `zod` dependency and peer ranges to `^3.25.76 || ^4.0.0`. Its runtime JS does not import zod.
- **Task 1.3 revised:** tsup's `dts.resolve` could not inline the official types (its resolver ignores `exports`
  maps, and packages in `dependencies` are forced external). Replaced by `scripts/bundle-declarations.mjs`, run after
  `tsup` in `build`: rollup + `rollup-plugin-dts` (devDependencies `rollup@4.60.1`, already in the lockfile via
  tsup, and `rollup-plugin-dts@6.5.1`, published 2026-08-04, peer `typescript ^6`) re-bundle the emitted
  declarations with `respectExternal` and NodeNext resolution, inlining only `@a2ui/*`.
  - Result: `dist/*.d.ts` import only `@prometheus-ags/entity-graph-core`, `react`, `zod` and `zod/v3`; one shared
    `types-*.d.ts` chunk of 226,534 bytes holds the inlined official types.
  - The plugin flagged types reachable only through the private chunk (`ComponentApi`, `ComponentContext`,
    `PrometheusA2uiRuntimeCore`, `AllowlistedCatalogOptions`); they are now re-exported as types from the public
    entries so consumers' declaration emit can name them (new public type exports; `refresh:exports` in change 11).
  - Probe (not evidence): a NodeNext consumer importing registry `@a2ui/web_core/v0_9` types loads 146 v0.8
    declaration files and reports TS2835, confirming why the import had to go.
- **`@a2ui/web_core` moved from `dependencies` to `devDependencies`.** Runtime code was already bundled
  (`noExternal`), and the published declarations no longer reference it, so consumers no longer install it or the
  unused zod 3 it brought (the 4.4.0 changelog note). The contract's UNKNOWN "whether bundling @a2ui declarations
  removes the need for the @a2ui/web_core runtime dependency" is answered: yes.
- Bundle size **after** (0.15.0, all ESM outputs): 5 files, 1,051,008 bytes raw, 227,147 gzip (+48% raw, +47% gzip
  versus 708,626 / 154,731). `index.mjs` 35,387 / 8,447; `headless.mjs` and `ag-ui.mjs` unchanged; the growth is
  in the shared chunk (Lit and the Custom Element basic catalog). The published JS imports only
  `@prometheus-ags/entity-graph-core`, `dompurify`, `markdown-it`, `react`, `react-dom`, `zod` and `zod/v3`.
- **Risk carried to the boundary (UPG-13):** the headless entry now imports a basic catalog whose components are
  Lit classes. It is bundled with Node conditions, where Lit uses its DOM shim, so it is expected to load in Node;
  this is unverified until the headless Node lane runs.
