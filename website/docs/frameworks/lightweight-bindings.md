---
title: Svelte, Solid, Alpine, Web Components, and HTMX
sidebar_position: 5
---

# Lightweight framework bindings

- **Svelte 5** exposes readable entity and list stores over an application-owned
  core peer.
- **Solid** projects entities and lists through fine-grained accessors.
- **Alpine** installs an entity graph plugin without duplicating canonical data
  in component scopes.
- **Web Components** provide framework-neutral controllers and Lit elements.
- **HTMX** keeps the graph server-side and returns projection fragments while
  preserving typed identity and mutation flow.

Each binding observes the same core writes in packed singleton-consumer tests.
Use framework idioms for reactivity, but keep networking in services/adapters
and entity copies out of view components.
