# Release impact — `v3-agentic-a2ui-example`

## Implementation-ready surface

The dedicated `examples/agentic-a2ui` showcase proves the agentic slice of the
3.0 contract end to end: a keyless deterministic A2A v1 agent streams official
A2UI v0.9.1 surfaces for the shared domain, and every agent-initiated action
crosses the declared entity/action/field catalog with tenant authorization and
human approval for destructive operations. Mutations land once in the
normalized graph and propagate to every joined view.

This makes the A2A + A2UI pairing a viable early RC consumer surface alongside
the certified Vite and Next.js examples. It does not make the complete 3.0
portfolio stable or authorize registry mutation.

## Design decisions that bound the blast radius

- No library API changed. The app composes the existing public surfaces:
  `createA2AServer`/`buildAgentCard`/deterministic executor from
  `@prometheus-ags/entity-graph-a2a` and
  `createPrometheusA2uiRuntime`/`createEntityGraphA2uiActionPolicy` from
  `@prometheus-ags/a2ui-react`.
- The interactive task-board surface (`surface-task-sync`) is application-owned
  deterministic messages validated against the official schema; the library's
  executor and renderer stay untouched.
- Two defects were found and fixed by the evidence loop, both in the example:
  unstable Zustand selector snapshots (React #185) fixed by stable slice
  selection plus memoized joins, and double realtime registration across two
  adapter channels. No library fixes were needed.
- Golden transcripts pin the four protocol flows; drift is a hard CI failure
  with an explicit `UPDATE_GOLDEN=1` regeneration path.

## Full-release disposition

The full 3.0 release remains in progress. Flutter/Riverpod, universal Tauri,
Flint portable contracts, skills, docs, cross-ecosystem certification, and
stable publication retain independent plan ownership. The human-gated changes
`v3-release-certification` and `v3-stable-publication` are untouched and remain
the hand-off boundary. This evidence grants no npm, GitHub Release, GitHub
Pages, Pub, Cargo, or app-store publication authority.
