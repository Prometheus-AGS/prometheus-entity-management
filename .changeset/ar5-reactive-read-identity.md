---
"@prometheus-ags/entity-graph-core": patch
"@prometheus-ags/prometheus-entity-management": minor
---

Reactive read-path fixes from graph-explorer's architectural review (AR5).

**`useEntities` now subscribes to entity data.** Its `items` were computed in
a `useMemo` over `getState()` keyed on the list's ids — no subscription — so
mutating an entity already in the list did not re-render consumers until a
remount. `items` is now a store-subscribed selector under `useShallow`,
reading through the cached `readEntitySnapshot`. Return-shape note: items now
carry `$synced` / `$origin` / `$updatedAt` like `useEntityList` and
`useEntityQuery` already did — additive, and the three hooks now agree.

**`readEntity` has a stable identity contract.** It allocated a fresh
`{...base, ...patch}` merge on every call whenever a patch existed, defeating
shallow comparison in every React consumer. Reads are now cached: same `base`
+ same `patch` (by reference) returns the same object, mirroring
`readEntitySnapshot`'s cache.

**`ingestFetchedList` dedupes ids on the replace path.** The append path
always deduped; the replace path passed fetched ids through verbatim, so a
backend returning two physical rows for one logical id rendered the entity
twice in every list consumer. A list of entity ids never contains the same id
twice, regardless of what a fetch returned.
