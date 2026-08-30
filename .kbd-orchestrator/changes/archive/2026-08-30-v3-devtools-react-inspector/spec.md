# v3-devtools-react-inspector

## Goal

Deliver the accepted React entity-graph inspector as an optional, debug-only
package surface that answers what changed, what is dirty, and which registered
rendered views are affected. The normal package root remains side-effect-free
and excludes the inspector implementation.

## Authoritative design contract

The complete UI and interaction contract is
`.kbd-orchestrator/phases/v3-devtools-parity/ui-spec.md`. This change implements
that contract without silently reducing its workspaces, causality model,
dirty/original/live semantics, view-membership truthfulness, activation rules,
responsive behavior, or accessibility requirements.

## Dependency and packaging confirmation

The two dependency gates are complete and archived at the branch head used to
begin this change:

- `v3-devtools-entity-inspection` is archived at commit
  `dd574d24f683f13ad218c4e7ccbc921d7a9801e6`. Its seven executable tasks are
  complete and its assembled packed-consumer receipt passed. The optional core
  entry exposes store-scoped entity records, explicit original/patch/live
  values and dirty reasons, registered view records and reverse membership,
  schema-backed relationships, and conflict-safe preview/restore receipts.
- `v3-devtools-time-travel` is archived at commit
  `91fa67cf473c0ee4be24442e06fbb4e4eb003109`. Its seven executable tasks are
  complete and its assembled packed-consumer receipt passed. The same
  controller exposes retained snapshot status, stable/expired cursors, rewind,
  exact return-to-live, mutation-while-rewound ordering, bounded import
  inspection, and explicitly confirmed restoration.
- Both dependency surfaces are exported from
  `@prometheus-ags/entity-graph-core/devtools`; the ordinary core root remains
  separate. The React change consumes these contracts rather than recreating
  projections, receipts, histories, or command semantics.

The existing React package/build conventions at version `3.0.5` are also
confirmed:

- `packages/entity-graph-react/package.json` currently publishes only `.` with
  paired ESM/CommonJS/type conditions. `files` includes only `dist`, README,
  and changelog; the package is presently declared `sideEffects: false`.
- `scripts/tsup-package-config.ts` emits ESM `.mjs`, CommonJS `.cjs`, and both
  declaration forms. Its `entry` option is intentionally overrideable; the
  core package already proves the repository convention for an additional
  `devtools` entry.
- `packages/entity-graph-react/tsup.config.ts` externalizes React, Zustand, and
  package dependencies instead of bundling consumer runtimes. The new entries
  must also externalize the core DevTools subpath and React DOM client surface.
- The root currently exports the lightweight compatibility hook
  `useGraphDevTools` from `src/devtools.ts`. It does not mount DOM, but that
  filename collides with the directory name required for the new feature. Task
  2 will preserve the named root export while moving its implementation to an
  unambiguous internal module.
- Package-contract validation compares the root condition object and permits
  intentional additional export keys whose built files remain under `dist`.
  Export and skills ledgers are refreshed only after the complete public
  surface exists.

## Frozen React entry contract

- `@prometheus-ags/prometheus-entity-management/devtools` is a side-effect-free
  optional entry. It owns the provider, store-scoped hooks/view models,
  explicit `<EntityGraphDevtools />` host component, preload control, and
  shared inspector types.
- `@prometheus-ags/prometheus-entity-management/devtools/auto` is the only
  import-time mounting entry. Importing it is the consumer's explicit debug
  opt-in. It performs environment and host-mode checks before any dynamic
  inspector import or DOM mutation, emits no server markup, and waits for a
  browser document before mounting.
- The package manifest declares only the auto entry as side-effectful. The
  ordinary root and `./devtools` remain tree-shakeable. `typesVersions` mirrors
  both optional subpaths for legacy TypeScript resolution.
- The heavyweight workspaces are reached by dynamic import from the enabled
  host. Launcher hover/focus may preload them, but disabled or production auto
  mode never requests the inspector chunk.
- The embedded mount uses one open Shadow Root with a single scoped style
  sheet. Host applications receive no reset, selector, font request, or global
  custom property mutation. The DevTools token values use
  `--pem-devtools-*` fallbacks so host-defined values inherited by the shadow
  host can intentionally theme the instrument.
- UI components render view-model state and submit intent. Hooks/view models
  coordinate the selected core client/controller; the controller remains the
  single owner of graph projections, event and snapshot history, preview
  receipts, commands, and teardown.

## Implementation boundary

- Implement production tasks 2–6 and 10 completely before running tests or a
  full build.
- The React surface reads controller-owned projections and submits commands;
  it does not own graph business state, snapshot history, view membership, or
  preview receipts.
- Keep all DevTools code behind optional entries. Ordinary root imports must
  remain free of DOM mutation and inspector bundle reachability.
- Run one assembled packed Vite/Next/browser acceptance gate only after the
  complete production path is wired.
- After acceptance, synchronize public records and evidence, run
  artifact-refiner, isolated distinct-model adversarial review, and strict
  sycophancy screening before native verification and archive.

## Architecture impact

- **UI:** optional React provider, hooks/view models, launcher, panel, and four
  inspector workspaces.
- **State:** selected workspace/entity/view/event and local display preferences
  only; graph/controller state remains authoritative.
- **Services:** stable store-scoped DevTools client/controller subscription.
- **Persistence:** versioned non-business UI preferences only.
- **Runtime:** client-only lazy mounting after explicit debug-entry opt-in.
- **Security:** same-origin local inspection may read graph values; serialized
  transports remain governed by the host-owned value/redaction policy.
