# React inspector task 3 — shared workspace contract

Date: 2026-08-29

## Result

COMPLETE. The optional React DevTools entry now renders the shared inspector
through a controller-backed model and view-model boundary. This task does not
add commands, the floating action button, responsive behavior, example wiring,
or the final Graph Pulse refinement assigned to later tasks.

## Production surface

- Added an animation-frame-coalesced inspector model store that projects the
  controller-owned snapshot, entity metadata, registered views, relationships,
  and retained events.
- Joined canonical, local patch, and merged values directly from the selected
  same-origin `GraphStore`. Values are not added to the serialized transport,
  so the controller's metadata-only remote policy remains intact.
- Added a coordinating React view model for workspace navigation, deferred
  entity search, dirty/error filtering, entity selection, original/patch/live/
  diff projections, related views, relationships, entity history, event
  filtering, and a stable paused activity snapshot.
- Added pure Overview, Entities, Views, and Activity workspaces. Components
  render view-model state and submit intent; controller/store projection logic
  remains outside the UI layer.
- Added field-path diffs, JSON value inspection, cross-workspace navigation,
  expired event selection feedback, registered-list health and ordered
  membership, mutation publication details, and screen-reader status output.
- Added stable-key virtualization above 50 rows with measured rows and eight-row
  overscan, while small collections render without virtualization.
- Replaced the lazy placeholder with the shared inspector shell and exported
  the model, view model, and shell from the optional `./devtools` surface only.
- Extended the open Shadow Root stylesheet with the desktop forensic workspace
  visual contract, focus-visible treatment, dense data displays, and reduced-
  motion handling. Responsive/FAB behavior remains task 5.

## Current library documentation confirmation

Context7 resolved TanStack Virtual as `/tanstack/virtual`. Current documentation
confirms the React `useVirtualizer` adapter, `getVirtualItems`, stable custom
`getItemKey`, and `measureElement` contracts used by the shared list component.

## Static confirmation

- `git diff --check -- packages/entity-graph-react` passed.
- TypeScript `transpileModule` parsed all 20 DevTools `.ts`/`.tsx` files with
  zero syntax diagnostics.
- Source assertions confirmed animation-frame projection cadence, same-origin
  graph value joins, four workspace modules, TanStack virtualization with
  stable item keys, optional-entry exports, and inspector exclusion from the
  normal root.

These are parser/static confirmations, not test evidence. No typecheck, unit,
component, isolated, mock-backed, snapshot, partial integration, full
integration, or build command ran. Task 11 remains the sole assembled packed
Vite/Next/browser acceptance gate after the production path is complete.

## Control-plane receipt

Task 3 started at canonical revision 352. The first completion attempt exposed
a missing guard start receipt and repaired phase projections at revisions
353–354 through the official guard recovery path. KBD then completed task 3
with a signed after receipt at revision 357. The known task-after parent reset
was restored through signed command
`codex-react-inspector-restore-after-task-3-20260829` at revision 358.
