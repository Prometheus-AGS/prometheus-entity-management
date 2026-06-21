# Proposal: G3: full incremental view maintenance

> Gap-closure for v2.2.0 (held) · parity PROVEN, not just contract-correct · branch feat/v2-realtime-fabric-parity

## Summary

Closes a competitive-parity gap where the v2.0 work shipped a seam/contract but parity was unproven (tested against fakes/mocks).

## Acceptance (proven)

IncrementalView: single-row update at 100k rows touches <200 entity reads (sub-linear) and stays byte-identical to applyView. PROVEN: src/view/incremental.test.ts.

## Non-goals

- WebRTC/P2P (Flint-owned). No API surface change beyond what the proof requires.
