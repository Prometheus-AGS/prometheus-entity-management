---
title: Flint integration track
sidebar_position: 2
---

# Event, checkpoint, and trust flow

```mermaid
sequenceDiagram
  participant Fabric as Flint Fabric
  participant Adapter as Flint adapter
  participant Manager as RealtimeManager
  participant Graph as Entity graph
  Fabric->>Adapter: watchEntities(event, offset)
  Adapter->>Adapter: validate tenant/channel/consumer
  Adapter->>Manager: ChangeSet
  Manager->>Graph: coalesced canonical write
  Adapter->>Fabric: persist checkpoint
```

Resume a consumer from its stored offset, not from UI state. Publish mutations
through `mutateEntity`; do not expose Forge or service-role credentials to
clients. On reconnect, resume from the last acknowledged checkpoint and allow
the manager to collapse repeated entity changes inside its configured window.

The repository proves a deterministic fixture plus immutable sibling-source
contracts. A hosted Flint deployment, Forge adapter, or registry artifact is
not claimed by that evidence.
