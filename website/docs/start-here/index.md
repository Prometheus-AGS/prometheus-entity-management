---
id: index
title: Start Here
slug: /start-here/
sidebar_position: 1
description: Choose the right package and learn the Prometheus entity graph in ten minutes.
---

# Start with the graph, not a framework cache

Prometheus Entity Management stores each entity exactly once at a stable
`type + id` address. Queries populate that graph. Lists keep ordered IDs. Views
join those IDs to the current canonical entity plus local patches, so a change
in one workflow is visible everywhere that entity is projected.

```mermaid
flowchart LR
  UI["View submits intent"] --> VM["Hook / ViewModel"]
  VM --> Store["Graph store"]
  Store --> Service["Service / adapter"]
  Service --> External["REST · GraphQL · Realtime · Local"]
  External --> Store
  Store --> UI
```

## Current release boundary

The active documentation line is **3.x**. All twelve npm packages are public
at stable `3.0.2` on the `latest` tag (published 2026-08-23; the short-lived
`3.0.0` manifests shipped an unresolved `workspace:` protocol and are
deprecated). Flutter is public as `entity_graph_flutter@3.0.0` on pub.dev. See
the [verified registry snapshot](../packages/index.md) before choosing an
install command.

## Choose your next step

- [Understand normalized identity and ID-only lists](../concepts/index.md)
- [Choose a framework binding](../frameworks/index.md)
- [Connect a realtime or local-first integration](../integrations/index.md)
- [Inspect runnable examples and their status](../examples/index.md)
- [Select from the package family](../packages/index.md)
- [Audit the evidence behind public claims](../evidence/index.md)
