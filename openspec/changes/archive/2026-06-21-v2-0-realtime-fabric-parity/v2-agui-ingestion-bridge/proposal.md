# Proposal: AG-UI agent-state ingestion bridge

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C2 · addresses GAP-4 · `library: cand-005, cand-006` · depends on C1

## Summary

Bridge AG-UI agent state into the entity graph: `applyAgUiSnapshot()` (STATE_SNAPSHOT → graph) and `applyAgUiDelta()` (STATE_DELTA, RFC-6902 JSON Patch → graph). An agent emits a state delta → it lands in the graph → every view updates. **The headline agentic capability.**

## Motivation

Non-trivial agentic apps need agent state and traditional UI state in one reactive store. We already export graph→LLM tools (`createGraphTool`); this adds the missing inbound direction. **Highest-leverage/lowest-effort win**: AG-UI STATE_DELTA is RFC-6902 JSON Patch and our `patchEntity()` is already JSON-Patch-shaped.

## Library reuse (cand-005, cand-006)

- **@ag-ui/core 0.0.57** (optional peer) — typed event vocabulary (17 event types; STATE_SNAPSHOT, STATE_DELTA). Evidence: docs.ag-ui.com/sdk/js/core/events. Pin (0.0.x churn); isolate behind our bridge.
- **fast-json-patch 3.1.1** (cand-006) — RFC-6902 applier, **only if** `@ag-ui/client` does not already expose one (prefer reusing AG-UI's — one fewer dep; Spec confirms).

## Non-goals

- A full AG-UI client / transport (use @ag-ui/client for that). This is ingestion → graph only.
- A2A / A2UI (agent↔agent) — that is Flint's `frf-agentproto`, consumed via C3.

## Design

- New `src/agent/ag-ui-bridge.ts`: map AG-UI state-path → `type:id:field`; snapshot → `replaceEntity`/`upsertEntity`; delta → `patchEntity` for UI-overlay paths or canonical write via the C1 MergeStrategy for shared/server-authoritative paths.
- Path-mapping config (how an agent's state tree projects onto entity types).
- `@ag-ui/*` optional peer; bridge degrades with a clear error if absent.

## Success criteria

- [ ] STATE_SNAPSHOT populates entities; subscribers re-render.
- [ ] STATE_DELTA (add/replace/remove ops) mutates the correct entity fields.
- [ ] Conflicting shared-path deltas route through the MergeStrategy (C1).
- [ ] No hard runtime dep on @ag-ui/*; core bundle unchanged.
- [ ] New exports in skills ledger (`verify:skills` green).
