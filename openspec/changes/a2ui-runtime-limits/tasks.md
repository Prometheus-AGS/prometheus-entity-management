# Tasks: a2ui-runtime-limits

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.

- [x] 1 Add the typed `PrometheusA2uiLimits` option with provisional defaults validated at construction, and the `onProducerFault` callback option
- [x] 2 Add the pre-apply check over one call's operations plus held state, rejecting the whole call atomically before any mutation
- [x] 3 Add `setLimits(partial)` (future calls only, never evicts) and `getLimitUsage()`
- [x] 4 Document the `limits` option, defaults and fault reporting in the package README
