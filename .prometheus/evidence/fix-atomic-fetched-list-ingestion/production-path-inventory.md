# Fetched-list split-write inventory

Implementation source: `origin/main` at
`e25210010a8eb4e575f7e4fc6e04be598a8c8213`, whose public manifests are 3.0.2.
The signed release control uses `v3.0.2` at
`f29a701649799df3ff64f5f986e3c016246d34b6`.

| owner | production path | current successful write sequence | disposition |
|---|---|---|---|
| Core engine | `packages/entity-graph-core/src/engine.ts` `fetchList` | `upsertEntities` → per-row `setEntityFetched` → replace/append list | migrate to atomic core action |
| React common list hook | `packages/entity-graph-react/src/hooks/use-entities.ts` | `upsertEntities` → per-row `setEntityFetched` → replace list | migrate to atomic core action |
| React query hook | `packages/entity-graph-react/src/hooks/use-entity-query.ts` | `upsertEntities` → per-row `setEntityFetched` → remote list plus first-page base list | migrate both list targets in one atomic action |
| React legacy view | `packages/entity-graph-react/src/view/use-entity-view.ts` | `upsertEntities` → per-row `setEntityFetched` → remote list, then base fetch completion | migrate row/list success and base completion in one atomic action |
| React GraphQL normalization/list hook | `packages/entity-graph-react/src/graphql/client.ts` + `graphql/hooks.ts` | per-node `upsertEntity` → `setEntityFetched`, then a separate list result | batch each descriptor and attach the primary list target to the same atomic action |
| React Electric/PGlite adapter | `packages/entity-graph-react/src/adapters/electricsql-react.ts` | `upsertEntities` → per-row `setEntityFetched` | ingest fetched rows atomically without creating an unused list slot |

The remaining production `setEntityFetched` occurrences are single-entity,
realtime, or CRUD writes. They do not process a fetched list and are outside
this change.
