---
title: Views, CRUD, and relationships
sidebar_position: 3
---

# Local, remote, and hybrid views

A transport-agnostic filter can compile to a local predicate, REST parameters,
GraphQL variables, or SQL. `local` mode filters a complete graph without I/O;
`remote` forwards the instruction because local data is incomplete; `hybrid`
projects current local results immediately while a service fetches the remote
set.

Edit buffers stay outside the graph until save. Explicit optimistic operations
write a patch together with the exact previous state needed for rollback.
Confirmation replaces canonical data and clears the patch; failure restores the
prior projection rather than guessing a compensating value.

Relationship schemas make invalidation traversable. When a foreign key changes,
the store marks affected lists and related entities stale and follows reverse
relations. Realtime sorted insertion uses binary search so a new entity can join
a list without sorting copied entity objects.
