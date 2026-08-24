# Task 1 — Dependency and input-contract gate

Date: 2026-08-01  
Change: `v3-framework-neutral-core`

## Verdict

**PASS.** Both declared prerequisites are complete, archived, promoted, and strictly valid. The change may proceed. The phase projection records 3/28 completed changes and identifies `v3-framework-neutral-core` as active.

| Prerequisite | Completion evidence | Promoted contract | Verdict |
| --- | --- | --- | --- |
| `v3-release-contract` | `openspec/changes/archive/2026-08-01-v3-release-contract`; phase status `COMPLETE`, 6/6 tasks | `openspec/specs/v3-release-contract/spec.md` passes strict validation | Pass |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; phase status `COMPLETE`, 6/6 tasks | `openspec/specs/v3-package-module-contracts/spec.md` passes strict validation | Pass |

No undeclared prerequisite is needed for this vertical slice. The binding-wide one-singleton proof is deliberately owned by the later `v3-binding-singleton-contract`; this change must expose a framework-neutral store contract that makes that proof possible without prematurely claiming all bindings are already correct.

## Inherited release contract

- `@prometheus-ags/entity-graph-core` is a stable, required npm artifact whose declared role is the **framework-neutral normalized graph**.
- The core remains in the fixed npm 3.x version group and retains the package module/type contract already promoted by `v3-package-module-contracts`.
- Lists continue storing entity IDs only; canonical entities and local patches remain separate.
- Components continue reading through hooks; stores and adapters own external I/O.
- The React package remains the stable React 19 hook/UI binding and must preserve compatible behavior over the neutral core.
- Packed artifacts—not source aliases—must prove runtime and declaration independence.
- The release contract does not authorize a new compatibility package or a second canonical graph. No migration alias may reintroduce React into core.

## Deep-research and Feynman transfer

The phase readiness report and teaching artifact were reread before implementation. Their applicable lesson is the “reservoir and faucets” model: the normalized graph is one framework-independent reservoir, while React and other bindings are subscription/rendering faucets. A React hook-shaped store in core makes the reservoir depend on one faucet. Moving only type names without changing the runtime store entry would therefore be a cosmetic fix, not the promised architecture.

The same proof rule used by package contracts applies here: monorepo typecheck cannot establish independence. Task 3 must build a clean non-React packed consumer and inspect the packed dependency/declaration graph, while React tests prove that the binding still observes the same graph.

## Current-state contradiction

The package description and source banner say “framework-agnostic” and “zero React”, but authoritative current artifacts contradict that claim:

- `packages/entity-graph-core/src/graph.ts` and `src/local-first-runtime.ts` import `create` from `zustand`, the React-bound entry point, rather than `zustand/vanilla`.
- Packed runtime output imports/requires `zustand` directly (`dist/index.mjs` and `dist/index.cjs`).
- `packages/entity-graph-core/src/table/types.ts` imports the React type namespace and exposes `ReactNode` and `ComponentType` in public renderer/icon fields.
- Both `dist/index.d.ts` and `dist/index.d.cts` begin with a React import and expose those React types.
- The current production dependency resolution reaches React and `@types/react` through Zustand's React-facing peer surface.
- The React binding imports `useGraphStore` from core throughout hooks, CRUD, view, GraphQL, devtools, and adapter modules, and its UI consumes the core table types.

This is recorded as an implementation gap, not waived as an acceptable transitive detail.

## Task 2 input contract

Implementation must satisfy all of the following together:

1. Build the canonical graph on `zustand/vanilla`, with an explicit factory and a stable default store identity suitable for non-React callers.
2. Keep selectors, synchronous reads/writes, subscriptions, entity normalization, patches, ID-only lists, engine behavior, and mutation APIs framework-neutral.
3. Move or redesign React-valued table/view types so packed core runtime and both declaration branches contain no React runtime or type dependency.
4. Adapt the React package to subscribe through React-owned Zustand APIs while preserving its public hook behavior and compatibility re-exports where those re-exports remain React-owned.
5. Add fail-closed guards for source imports, packed runtime dependencies, declarations, and clean non-React installation.
6. Prove a non-React consumer can create and share one graph, and prove React compatibility remains green.

## Explicit non-scope

- Do not claim every framework binding resolves one singleton; that requires isolated binding consumers in `v3-binding-singleton-contract`.
- Do not redesign table functionality beyond what is required to remove React ownership from core.
- Do not add a replacement state library; Zustand remains the assessed store engine.
- Do not alter registry publication, stable tags, documentation deployment, Flutter, Tauri runtime behavior, A2UI/A2A, or example visuals.
- No rendered UI changes in this dependency task; visual evidence is not applicable yet. Later implementation must rerun React behavior tests, and later showcase changes own screenshot/video certification.
