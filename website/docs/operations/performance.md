---
title: Performance and tuning
sidebar_position: 3
---

# Measure the graph, transport, and projection separately

Normalization reduces copied writes, but it does not make every query or render
free. Measure entity write frequency, subscriber count, list joins, transport
latency, persistence time, and bundle payload independently.

- Keep lists as IDs so a canonical change does not rebuild copied rows.
- Let `RealtimeManager` coalesce bursty updates; change its 16 ms interval only
  from observed latency or render evidence.
- Use local view mode only when completeness is proven. Hybrid mode can provide
  immediate local results while remote data reconciles.
- Tune stale and GC times to real navigation/reconnect behavior. Aggressive
  revalidation can hide a broken subscription while increasing I/O.
- Keep CRDT, A2A, A2UI, Tauri, and UI packages optional so consumers pay only
  for selected capabilities.
- Compare bundle sizes with the same minification, tree-shaking, compression,
  and peer-dependency methodology.

Lighthouse delivery budgets are mobile performance ≥90, accessibility/best
practices/SEO ≥95, LCP ≤2.5 s, and CLS ≤0.1. They are T3 deployment gates, not
the edit loop.
