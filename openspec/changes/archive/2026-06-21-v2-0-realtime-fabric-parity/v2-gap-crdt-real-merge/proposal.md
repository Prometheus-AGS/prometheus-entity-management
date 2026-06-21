# Proposal: G2: real loro-crdt convergence parity

> Gap-closure for v2.2.0 (held) · parity PROVEN, not just contract-correct · branch feat/v2-realtime-fabric-parity

## Summary

Closes a competitive-parity gap where the v2.0 work shipped a seam/contract but parity was unproven (tested against fakes/mocks).

## Acceptance (proven)

createLoroMergeStrategy exercised with real loro-crdt: divergent concurrent field writes converge identically regardless of order. PROVEN: src/merge/loro-real.test.ts.

## Non-goals

- WebRTC/P2P (Flint-owned). No API surface change beyond what the proof requires.
