---
title: Concepts
slug: /concepts/
sidebar_position: 2
---

# One identity, many projections

The graph separates canonical server-confirmed entities, local-only patches,
and ordered list membership. That separation is the mechanism behind
cross-view reactivity—not a slogan or a naming convention.

| Structure | Owns | Never owns |
| --- | --- | --- |
| `entities[type][id]` | canonical entity data | view-local flags |
| `patches[type][id]` | optimistic and UI augmentation | server truth |
| `lists[queryKey].ids` | order, pagination, fetch state | copied entities |

Queries are instructions to populate these structures. They are not durable
containers for separate copies of application data. Read the full
[entity graph theory](entity-graph-theory.md) for data flow, consistency, and
trade-offs.
