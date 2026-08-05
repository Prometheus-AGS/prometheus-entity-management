---
title: Entity graph theory
sidebar_position: 1
---

# Why normalized identity changes application behavior

When every query owns its own entity copy, a mutation must discover and update
every affected cache entry. A normalized graph reverses that responsibility:
queries contribute entities and ordered IDs; readers resolve the current entity
at render time. One canonical write therefore updates list rows, detail panels,
relationship badges, and agent-generated surfaces together.

Local patches overlay canonical data at read time. This allows immediate UI
feedback and exact rollback without confusing unsaved state with confirmed
server state. Stores and adapters own I/O; hooks and view models orchestrate;
components render state and submit intent.

This model does not eliminate remote caching, pagination, authorization, or
conflict resolution. It gives those concerns one explicit place to interact
with entity identity instead of letting framework query containers become the
untracked application database.
