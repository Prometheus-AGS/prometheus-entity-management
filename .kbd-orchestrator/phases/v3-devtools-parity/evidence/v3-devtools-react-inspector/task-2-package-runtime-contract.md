# React inspector task 2 — package and runtime contract

Date: 2026-08-29

## Result

COMPLETE. The optional React DevTools boundary is implemented without adding
the full inspector workspaces or running a partial test gate.

## Production surface

- Added conditional ESM, CommonJS, and declaration exports for `./devtools`
  and `./devtools/auto`, plus matching `typesVersions` entries.
- Declared only the built auto entry as side-effectful. The normal root and
  side-effect-free `./devtools` entry remain tree-shakeable.
- Added tsup entries for the normal root and both optional subpaths while
  externalizing React DOM, core, core DevTools, and virtualization runtimes.
- Preserved `useGraphDevTools` on the normal root by moving its implementation
  to `devtools/legacy-stats.ts`; the root does not import the inspector.
- Added a store-scoped provider that reference-counts the core attachment,
  owns a local protocol client, disconnects and detaches on cleanup, and
  exposes controller/client state through hooks.
- Added a cached snapshot adapter for `useSyncExternalStore`; controller events
  replace the cached snapshot before notifying listeners, and SSR uses a
  stable null server snapshot.
- Added a mode gate that returns false during SSR, honors explicit on/off, and
  recognizes consumer-replaced `process.env.NODE_ENV` for auto mode.
- Added a lazy inspector boundary. Disabled/production auto mode never invokes
  its dynamic import.
- Added the explicit auto entry, DOM-ready mounting, independent React root,
  deterministic unmount, and identifier prefix.
- Added one open Shadow Root and a local stylesheet with inherited
  `--pem-devtools-*` fallbacks, no global selectors outside the shadow tree,
  no remote assets, and reduced-motion handling.

## React 19.2 documentation confirmation

Context7 resolved the versioned official React source as
`/react/react/v19.2.7`. The current React DOM implementation accepts a
`DocumentFragment` container, which includes `ShadowRoot`, and attaches event
listeners to that root. The current `useSyncExternalStore` implementation
requires identity-stable subscription functions, a cached snapshot result,
and a server snapshot during SSR/hydration. The implementation follows those
contracts directly.

## Static confirmation

- Package JSON and exact subpath targets parsed successfully.
- Root-exclusion, dynamic-import, auto-side-effect, Shadow Root, and no-remote-
  stylesheet source checks passed.
- TypeScript `transpileModule` reported no syntax diagnostics across all eight
  DevTools TypeScript/TSX source files.
- `git diff --check` passed for the React package.

These are parser/static confirmations, not test evidence. No typecheck, unit,
component, isolated, mock-backed, snapshot, partial integration, full
integration, or build command ran. Task 11 remains the sole assembled
acceptance gate after tasks 2–6 and 10 are fully wired.

## Control-plane receipt

The signed KBD driver completed canonical task 2 at revision 350 and all four
task hook invocations for this turn passed. The known task-after parent reset
was restored through signed command
`codex-react-inspector-restore-after-task-2-20260829` at revision 351. The
completed summary retains the literal `./devtools` text; task 3 is next.
