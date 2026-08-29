# ASSESSMENT: v3-devtools-parity

**Recovered:** 2026-08-29
**Canonical authority:** signed KBD runtime revision 269, plan revision 5
**Phase-local progress:** 0 of 9 changes complete

## Observed state

- The signed runtime has `v3-devtools-parity` active and `v3-devtools-core-observability` in progress.
- The phase contains nine dependency-ordered changes and 81 registered tasks after plan revision 5.
- Historical core-observability tasks 2–5 are recorded complete in the signed ledger, but the current branch does not contain their claimed production surface: `@prometheus-ags/entity-graph-core` has no `./devtools` export, no v1 per-store controller, and still exposes the legacy global event/time-travel APIs from its root entry.
- Historical tasks 6–8 were cancelled. Replacement tasks 9–11 require a source re-audit, complete implementation, one assembled integration/acceptance gate, documentation/evidence, and final quality/archive gates.
- Existing core DevTools behavior is split across `devtools-event-bus.ts`, `devtools-time-travel.ts`, the global engine tap, React's legacy hook, and extension helpers. This is useful source material but does not satisfy the per-store v1 contract.
- The control service is online and accepted signed plan/task/change mutations through revision 269.

## Architecture and affected subsystems

The work is intentionally sequenced from protocol/core ownership outward:

1. Core protocol, controller, lifecycle, instrumentation, compatibility delegates, and client.
2. Entity/view/relationship projections and safe preview/restore.
3. Controller-owned time travel and return-to-live.
4. React inspector and debug-only embedded entry.
5. Flutter controller and VM-service bridge.
6. Chrome MV3 extension.
7. Flutter DevTools extension.
8. Documentation, examples, README/version parity, and evidence.
9. Packed, security, performance, browser, Flutter, and release certification.

The production data flow remains `UI -> hooks/view models -> stores -> services/adapters`. DevTools observes and commands an explicit graph-store controller; it must not create a second business-state owner or bypass graph mutation APIs.

## Constraints and decisions

- Implement complete production call graphs before running tests.
- Only full assembled integration/acceptance gates count as test evidence. Do not add or run unit, isolated, mock-backed, snapshot, or partial tests for this phase.
- Avoid full workspace/package/platform builds during implementation. Build once at the applicable change or release boundary.
- Keep normal root imports free of the new DevTools payload; expose the new surface through explicit `./devtools` entries while preserving deprecated root compatibility delegates where required.
- Preserve store isolation, bounded memory, deterministic teardown, versioned envelopes, metadata-only defaults, and explicit value/redaction policy at real tool and extension trust boundaries.
- The project has no concrete KBD model-policy registry. All dispatches therefore use the active frontier session model without inventing model identifiers.

## Readiness conclusion

Execution may continue at core-observability task 9. No downstream change may start until its declared dependency is complete and archived. No historical completion claim is accepted as source or verification evidence unless it is reproduced by the current implementation and the designated assembled gate.
