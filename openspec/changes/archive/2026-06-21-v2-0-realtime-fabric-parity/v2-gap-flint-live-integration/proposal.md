# Proposal: G1: Flint live round-trip parity

> Gap-closure for v2.2.0 (held) · parity PROVEN, not just contract-correct · branch feat/v2-realtime-fabric-parity

## Summary

Closes a competitive-parity gap where the v2.0 work shipped a seam/contract but parity was unproven (tested against fakes/mocks).

## Acceptance (proven)

Real @prometheusags/frf-entity-management RealtimeAdapter round-trips a published entity event into the graph via createFlintAdapter over a loopback spine (real wire contract). PROVEN: src/adapters/flint-live.test.ts.

## Non-goals

- WebRTC/P2P (Flint-owned). No API surface change beyond what the proof requires.
