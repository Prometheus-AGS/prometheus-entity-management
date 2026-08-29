# React inspector task 5 — launcher and responsive contract

Date: 2026-08-29

## Result

COMPLETE. Explicit development opt-in now presents a visible Graph DevTools
launcher while keeping the normal package root side-effect-free and the heavy
inspector chunk unloaded until the panel opens or the launcher is preloaded.

## Production surface

- Added versioned browser display preferences for four launcher corners, a
  floating-button or compact edge-tab form, and floating, right-docked, or
  bottom-docked panel layouts.
- Added temporary **Hide until reload** and persisted **Hide for this browser**
  controls. The configurable `Mod+Shift+G` shortcut restores either hidden
  surface and can be disabled or remapped by the host.
- Kept `mode="off"` a hard disable and preserved SSR/client-only enablement.
  Auto mounting still requires the explicit `./devtools/auto` opt-in and emits
  no server markup or normal-root side effect.
- Kept the controller provider mounted after explicit enablement so retained
  entity history continues while the panel is closed. `LazyInspector` mounts
  only inside the open panel; launcher focus and pointer hover may preload it.
- Added a non-modal panel shell with layered Escape dismissal, close-to-launcher
  focus return, named icon controls, visible focus, and persisted layout
  controls.
- Added roving workspace tabs with Left/Right/Home/End keyboard movement and
  one tabbable selected tab.
- Added a sub-720px single-pane navigator/detail drill-in for Entities, Views,
  and Activity, explicit Back controls, safe-area padding, contained
  overscroll, horizontal workspace/value tabs, 44px controls, and horizontally
  scrollable forensic diffs without disabling browser zoom.

## Security boundary

Browser storage is mutable outside the component. Preference reads therefore
accept only schema version 1 and recognized launcher/layout enum values, falling
back to the immutable defaults for malformed, stale, or unavailable storage.
The preference record contains display state only; graph/entity values are not
persisted there.

## Static confirmation

- TypeScript `transpileModule` parsed all nine task-touched `.ts`/`.tsx` files
  with zero syntax diagnostics.
- Scoped ESLint passed the eight task-touched files without known baseline
  findings. The view model retains three `react-hooks/exhaustive-deps` findings
  that were reproduced unchanged against `HEAD`; they are not task-5
  regressions.
- Source assertions passed for hard disable/SSR, DOM-ready auto opt-in, lazy
  preload, versioned hide/restore, shortcut remapping, four positions, edge
  tab, three layouts, safe-area mobile drill-in, roving tabs, focus return, and
  layered Escape.
- `git diff --check -- packages/entity-graph-react/src/devtools` passed.

These are parser/static confirmations, not test evidence. No typecheck, unit,
component, isolated, mock-backed, snapshot, partial integration, full
integration, or build command ran. Task 11 remains the sole assembled packed
Vite/Next/browser acceptance gate after tasks 6 and 10 finish the production
path.

## Control-plane receipt

Task 5 started at canonical revision 365 and completed at revision 367 through
the canonical local runtime fallback while the control socket was unavailable.
Sovereign sync was not changed. The known task-after parent reset was restored
through signed command
`codex-react-inspector-restore-after-task-5-20260829` at revision 368.
