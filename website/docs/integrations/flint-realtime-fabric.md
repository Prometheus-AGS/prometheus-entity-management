---
title: Flint Realtime Fabric
sidebar_position: 1
---

# Flint Realtime Fabric

The Flint adapter converts `watchEntities` events into `ChangeSet` values.

`RealtimeManager` coalesces repeated writes before updating the graph.

Tenant, channel, and consumer identity are explicit.

Checkpoints and offsets support restart without putting delivery state in a
component.

The deterministic loopback contract runs without sibling repositories.

Live evidence is separate, opt-in, and fail-closed.

Live paths cross real trust boundaries that the hosting application configures:

- issuer, tenant, `kid`, and JWKS identity;
- roles, service-role provisioning, and RLS access;
- mutation publishing and reconnect behavior.

See the complete [Flint integration track](flint-guide.md).
