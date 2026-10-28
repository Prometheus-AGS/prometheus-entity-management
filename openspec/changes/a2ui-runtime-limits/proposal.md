# Proposal: a2ui-runtime-limits

Phase `phase-v4-a2ui-runtime-hardening` · operator decision 2026-10-28: add surface and component caps.

## Summary

Neither `@a2ui/web_core` 0.12.0 (only `ValidationConfig.allowedMessages`) nor `a2ui-react` enforces any resource cap. Trust boundary: **agent-generated UI arriving at the runtime**. A faulty or hostile producer can exhaust browser memory or CPU. This change adds typed, configurable limits and the hook every later change wires into.

## Design

- `limits` option on `CreatePrometheusA2uiRuntimeOptions`, validated at construction. Provisional defaults (not measured): 64 surfaces; 2,000 components per surface; 10,000 per runtime; nesting depth 32; 1 MiB data per surface; 500 operations and 1 MiB per activity; 100 buffered deltas for 5 s; 1,000 tracked messages and tombstones.
- Pre-apply check over the operations of one call plus the state held at call time; **whole-call atomic rejection before any mutation**; nothing is truncated.
- New `onProducerFault` callback reports limit name, current and attempted values. Invalid input still throws from `processAgUiEvent` as today.
- `setLimits(partial)` for runtime changes (future calls only, never evicts a surface) and `getLimitUsage()`.
- Counting against state created by later changes (tombstones, buffers, headless) is wired by those changes' own tasks.

## Out of scope

A per-activity limit function (deferred until a requirement appears) and server-side limits (UAR's side).

## Public API

New public exports: needs the ledger refresh, done once in `a2ui-hardening-acceptance#4`.
