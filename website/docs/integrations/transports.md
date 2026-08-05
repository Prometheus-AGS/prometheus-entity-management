---
title: REST, GraphQL, WebSocket, and Supabase
sidebar_position: 3
---

# Transport adapters populate one graph

REST adapters normalize response entities and preserve ordered result IDs.
GraphQL adapters use the same graph even when selection sets differ; missing
fields represent incomplete canonical knowledge, not a second query-owned copy.
WebSocket and Supabase adapters translate insert/update/delete events into
`ChangeSet` values and let `RealtimeManager` batch graph writes.

Authentication headers, tenant scoping, server validation, and subscription
authorization belong in services and adapters. Never embed a service-role key
in a browser or generated A2UI surface.
