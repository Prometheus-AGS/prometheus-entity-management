# Proposal: Time-travel DevTools (timeline + diff + snapshot I/O)

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C5 · addresses GAP-5 · BUILD on in-repo materials

## Summary

Add a **Timeline** tab to the EntityExplorer: jump-to-state, before/after state diff, snapshot import/export, and pin-to-entity watch — making the new realtime/agent surfaces debuggable.

## Motivation

Our live inspector is good but lacks the time-travel/diff that Redux & TanStack DevTools set as the bar. The raw materials already exist in-repo: `graph-actions.ts` (action log), `exportGraphSnapshot`, `devtools-event-bus` (ring buffer + replay). No third party fits a Zustand-graph panel.

## Library reuse

- None adopted. Reference **Automerge** (cand-003) history UX for ideas only.

## Non-goals

- A general Redux-DevTools clone; scope is the entity graph.
- Persisting time-travel history to disk (in-memory ring buffer is sufficient for v2.0).

## Design

- New `src/ui/entity-explorer/tabs/timeline-tab.tsx` driven by graph-action records.
- State diff: compare snapshot-before/after per action (reuse `exportGraphSnapshot`).
- Import/export buttons (JSON) via existing snapshot export.
- Pin-to-entity: filter the timeline to one `type:id`.

## Success criteria

- [ ] Timeline lists graph actions chronologically with before/after diff.
- [ ] Selecting an entry shows the graph state at that point (read-only inspection).
- [ ] Snapshot export downloads JSON; import re-hydrates an inspection view.
- [ ] No new core data structures; uses existing action log + event bus.
