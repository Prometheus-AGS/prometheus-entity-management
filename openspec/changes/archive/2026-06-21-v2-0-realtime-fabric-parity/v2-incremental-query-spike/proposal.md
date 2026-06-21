# Proposal: Incremental-query evaluation SPIKE (gated)

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C7 · addresses GAP-3 · `library: cand-007, cand-010 (reference)` · GATED

## Summary

**Time-boxed research spike.** Benchmark the current `view/evaluator` re-derivation against differential-dataflow approaches at scale, and decide: adopt a differential engine OR ship a documented scale ceiling + virtualization guidance.

## Motivation

TanStack DB's d2ts gives sub-ms incremental query updates at 100k rows; our re-derivation is O(n) per change. For large agentic dashboards this could be the bottleneck. But d2ts is 0.1.x (pre-production) and integrating differential dataflow is a deep change — so this is research, not a committed feature.

## Library reuse (reference only)

- **@electric-sql/d2ts 0.1.8** (Apache-2.0, cand-007) — reference; too early to adopt outright.
- **TanStack DB** (cand-010) — study its live-query/collection ergonomics; never a dependency (moat).

## Non-goals (this spike)

- Committing to a differential engine in v2.0.
- Replacing `view/evaluator` wholesale.

## Design (spike)

- Benchmark harness: current evaluator vs d2ts at 1k / 10k / 100k rows (filter+sort, single-row update).
- **DECISION GATE:** if incremental wins decisively AND integration risk is acceptable → schedule adoption (likely v2.1). Otherwise → ship a documented scale ceiling + `@tanstack/react-virtual` guidance as the v2.0 deliverable.

## Success criteria

- [ ] Benchmark numbers recorded (current vs d2ts, 3 dataset sizes).
- [ ] A written decision (adopt-later vs ceiling-doc) in the change + decision-log.
- [ ] v2.0 deliverable produced either way (ceiling doc at minimum).
- [ ] **Does NOT block** release of C1–C6/C8 — may slip to v2.1.

## Trade-off (S-03)

This is the one change with genuine schedule risk. It is explicitly allowed to slip with the ceiling-doc as the floor deliverable, so the spike cannot delay the rest of v2.0.
