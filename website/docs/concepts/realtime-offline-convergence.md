---
title: Realtime, offline, and convergence
sidebar_position: 4
---

# Realtime is another graph writer

Realtime adapters emit `ChangeSet` objects. `RealtimeManager` coalesces repeated
changes to the same identity within a 16 ms window, producing one store write
and one reactive notification. Set the interval to zero only when synchronous,
unbatched behavior is a measured requirement.

Offline persistence stores explicit graph and queue state. PGlite provides a
durable local database; Loro providers exchange mergeable operations and use
deterministic peer identity. Reconnect first recovers missed state, then drains
queued intent. The verified loopback covers delivery order, same-field conflict,
echo suppression, snapshot recovery, and forced WebSocket termination.

Convergence is not the same as authorization. A valid remote operation still
crosses tenant, actor, and policy boundaries before it can mutate the graph.
