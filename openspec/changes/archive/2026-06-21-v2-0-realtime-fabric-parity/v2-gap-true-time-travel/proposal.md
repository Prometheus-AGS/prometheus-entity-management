# Proposal: G4: true graph rewind/replay

> Gap-closure for v2.2.0 (held) · parity PROVEN, not just contract-correct · branch feat/v2-realtime-fabric-parity

## Summary

Closes a competitive-parity gap where the v2.0 work shipped a seam/contract but parity was unproven (tested against fakes/mocks).

## Acceptance (proven)

recordGraphSnapshot/restoreGraphSnapshot rewind the LIVE graph to a prior state and replay forward; no aliasing. PROVEN: src/devtools-time-travel.test.ts. Wired into Timeline tab (⏮ rewind).

## Non-goals

- WebRTC/P2P (Flint-owned). No API surface change beyond what the proof requires.
