# Proposal: G5: real SQLite persistence conformance

> Gap-closure for v2.2.0 (held) · parity PROVEN, not just contract-correct · branch feat/v2-realtime-fabric-parity

## Summary

Closes a competitive-parity gap where the v2.0 work shipped a seam/contract but parity was unproven (tested against fakes/mocks).

## Acceptance (proven)

Tauri SQLite adapter validated against real better-sqlite3: persist→reopen→hydrate byte-equal. PROVEN: src/adapters/tauri-sql-persistence.real.test.ts.

## Non-goals

- WebRTC/P2P (Flint-owned). No API surface change beyond what the proof requires.
