---
title: Graph lifecycle, SWR, GC, and Suspense
sidebar_position: 2
---

# From population instruction to collected entity

A hook describes an entity or list population instruction and subscribes to
the graph. The engine deduplicates concurrent identical work, records subscriber
tokens, returns current data, and revalidates stale subscribed entries in the
background. Focus and reconnect mark subscribed data stale; unsubscribed data
is not revalidated merely because it exists.

Stale-while-revalidate keeps the last usable projection visible while a service
refreshes canonical data. Suspense may coordinate the initial absence of data,
but it does not become the state owner. Garbage collection removes entities
after the configured retention boundary when no lists, relations, or active
subscribers require them.

Tune `staleTime`, retry, and GC from observed application behavior. A shorter
timer is not automatically more correct: it increases I/O and can hide an
incomplete realtime contract.
