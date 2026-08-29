# React inspector task 10 — accepted UI specification contract

Date: 2026-08-29

## Result

COMPLETE. The accepted `ui-spec.md` is implemented across the controller event
boundary and the shared React inspector. The debug-only launcher remains the
explicit development entry, while the inspector now answers which publication
changed which entities and registered views without constructing a second
mutable graph in React.

## Production surface

- Added truthful per-publication `affectedEntities` and `affectedViewIds`
  projections, ordered registered membership, and rendered subscriber counts to
  the core protocol. List causality attributes only IDs whose ordered position
  changed; metadata-only list changes still attribute the registered view.
- Added a serializable version-1 inspector state contract plus an SSR-safe URL
  adapter for workspace, store, entity, view, event, search, filters, and value
  projection. Embedded hosts remain session-local unless they supply an adapter.
- Added Graph Pulse as a real-event causal ribbon. Selecting a segment retains
  its event cursor and highlights controller-attributed entities and views across
  the active workspace.
- Added independently collapsible entity navigation and causal-trace rails,
  original confirmation time, original/patch/live/diff inspection, dirty field
  paths, relationship navigation, registered-view position/subscriber state,
  and retained entity history.
- Added registered-view coverage disclosure, current subscriber count, ordered
  membership position, normalized-list versus rendered membership readouts, and
  the last retained event attributed to the selected view.
- Added Overview event rate and rendered-subscriber health, Activity correlation
  identifiers, affected entity/view readouts, before/after entity counts,
  projection timing, and explicit retained-value/change omission reporting.
- Added the accepted forensic visual tokens, three-column entity workspace,
  narrow single-pane behavior, causal highlighting, quiet dirty/error launcher
  badge, responsive Graph Pulse, `content-visibility` for off-screen details,
  and transform/opacity-only motion with reduced-motion suppression.
- Hidden workspaces use React's public `Activity` boundary when available and
  fall back to ordinary unmount semantics on older compatible React versions.

## Security boundary

The optional URL adapter parses mutable address-bar state at an actual browser
input boundary. It accepts only schema version 1, known enum values, safe integer
event sequences, and strings/null for identifiers; malformed state is ignored.
It carries inspector navigation state only and does not serialize entity values.
The existing remote metadata/include/redaction policy remains the sole authority
for values crossing a transport boundary.

## Static confirmation

- `pnpm --filter @prometheus-ags/entity-graph-core typecheck` passed after the
  final ordered-membership and causal-attribution correction.
- Scoped ESLint passed every task-touched core and React source file. A directory
  sweep reproduced two pre-existing provider hook-dependency findings in
  unchanged `provider.tsx`; they are outside this task's diff.
- Source assertions passed for development/lazy activation, hide/restore and
  layouts, affected entity/view protocol fields, ordered membership and
  subscribers, Graph Pulse, causal rail, original confirmation, registered-view
  coverage, last-changing event, Activity retention reporting, URL state, React
  Activity compatibility, attention badge, reduced motion, and the absence of
  `transition: all`.
- `git diff --check` passed.
- The React package typecheck was intentionally not promoted as a passing gate:
  it resolves the previously built core declarations, so its only seven
  diagnostics are the new `affectedEntities`, `affectedViewIds`, and
  `subscriberCount` fields absent from stale `core/dist`. Task 11 owns the one
  dependency-ordered package build and packed acceptance run that refreshes
  those declarations.

These are compiler/static confirmations, not test evidence. No unit, component,
isolated, mock-backed, snapshot, partial integration, full integration, or build
gate ran in task 10. Task 11 remains the sole assembled packed Vite/Next/browser
acceptance gate.

## Control-plane receipt

Task 10 started under canonical revision 375 and completed at revision 377
through the canonical local runtime fallback. The known task-after parent reset
was restored with signed command
`codex-react-inspector-restore-after-task-10-20260829` at revision 378.
Sovereign sync was not changed.
