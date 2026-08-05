---
"@prometheus-ags/entity-graph-core": patch
"@prometheus-ags/prometheus-entity-management": patch
---

Scope engine dedupe, subscribers, fetches, React hooks, mutations, and realtime
writes to an application-owned graph so concurrent Next.js requests can
dehydrate and hydrate without sharing process-global entity state.
