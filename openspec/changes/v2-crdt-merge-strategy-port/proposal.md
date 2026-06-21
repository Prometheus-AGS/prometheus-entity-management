# Proposal: Pluggable MergeStrategy port + Loro reference impl

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C1 · addresses GAP-2 · `library: cand-002`

## Summary

Introduce a pluggable `MergeStrategy` seam at the graph's write path (`upsertEntity`) so concurrent writes from realtime (Flint, Supabase, Surreal) and agents (AG-UI) resolve deterministically. Default = current last-write-wins. Ship one optional Loro-backed CRDT strategy.

## Motivation

Today concurrent edits resolve by implicit LWW (shallow merge in `upsertEntity`). For collaborative/agentic multi-writer scenarios — and for the Flint fabric (CRDT-backed) — this is insufficient. This is the **foundation** for C2 (AG-UI) and C3 (Flint), which both produce concurrent writes.

## Library reuse (cand-002)

- **loro-crdt 1.13.5** (MIT, updated 2026-06-21). Wins 2026 crdt-benchmarks; Fugue algorithm (maximal non-interleaving); **LWW-Map maps onto our type:id:field model**; Rust core aligns with Flint's fabric. Evidence: pkgpulse 2026 CRDT guide; loro.dev/docs/performance.
- Automerge (cand-003) / Yjs (cand-004) = reference; reachable through the port, not adopted.

## Non-goals

- Hard-wiring any single CRDT engine. The **port is the deliverable**; Loro is one reference impl.
- Rich-text CRDT (entity fields are scalar/JSON, not collaborative documents).

## Design

- New `src/merge/` module: `MergeStrategy` interface `{ merge(prev, next, meta): merged }`, registry `registerMergeStrategy(type, strategy)`, default `lwwStrategy`.
- `upsertEntity` consults the registered strategy for the type (falls back to LWW).
- `loroStrategy` in a separate entry point with **lazy dynamic import** of `loro-crdt` (optional peer dep) — zero cost unless used.
- Feed `syncMetadata.origin` (server/client/optimistic) into merge decisions.

## Success criteria

- [ ] LWW default preserves existing behavior (all current tests pass unchanged).
- [ ] A registered Loro strategy resolves two concurrent field writes deterministically.
- [ ] `loro-crdt` absent → core still builds and runs (lazy import guarded).
- [ ] New exports reflected in skills ledger (`verify:skills` green).
