---
title: PGlite and Loro
sidebar_position: 4
---

# Durable local state and peer convergence

PGlite persists normalized entities and explicit queue/checkpoint state in a
local PostgreSQL-compatible database. Loro adds CRDT convergence as a companion
package rather than a core dependency. The sync bridge projects provider events
into a chosen graph store and suppresses inbound echo.

Use deterministic loopback networks to test offline ordering and conflicts;
use the WebSocket channel integration to test real disconnect and snapshot
recovery. Neither proof substitutes for a production authorization model.
