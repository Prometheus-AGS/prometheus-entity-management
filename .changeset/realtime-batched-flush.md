---
"@prometheus-ags/entity-graph-core": patch
---

**`RealtimeManager` applies each flush as one store write.** `flush()` used to
call a store action per change (`upsertEntity` and then `setEntityFetched` for
every upsert), and each action was its own immer `setState`. Every write copied
the touched maps and notified every subscriber, so the cost grew with the
square of the batch size. An adapter delivering an 8,180-row snapshot blocked
the browser's main thread for about 52 seconds.

The flush now runs every coalesced change and list invalidation inside a single
`setState` recipe, using the same draft mutators as the store actions, and
notifies subscribers once. The resulting graph is unchanged. `setEntityFetched`,
`invalidateEntity` and `invalidateLists` now delegate to new draft mutators so
the store actions and the flush share one implementation.

If a merge strategy throws during a flush, nothing from that flush is
published. Before, the changes applied ahead of the throw stayed in the graph.
