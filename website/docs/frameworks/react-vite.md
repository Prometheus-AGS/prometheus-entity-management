---
title: React 19 + Vite 8
sidebar_position: 1
---

# React 19 and Vite 8

The React binding subscribes components to a vanilla application-owned graph.

Components consume hooks, hooks orchestrate graph methods, and transports stay
inside stores or adapters. The verified showcase covers:

- normalized cross-view identity and relationships;
- exact optimistic confirm and rollback;
- local, remote, and hybrid views with realtime coalescing;
- PGlite, Loro, Suspense, DevTools, and accessibility.

Install the published stable `3.0.5` pair:

```bash
pnpm add @prometheus-ags/entity-graph-core \
  @prometheus-ags/prometheus-entity-management \
  react@19 react-dom@19
```

To run the complete source-workspace showcase:

```bash
pnpm install --frozen-lockfile
pnpm run dev:vite
```

See the [React/Vite example evidence](../examples/react-vite.md).

Generated UI remains a separate boundary: `@prometheus-ags/a2ui-react@3.0.5`
accepts A2UI 1.0-RC envelopes through the maintained official v0.9.1 renderer
and consumes AG-UI 0.0.59 activities without granting them graph authority.
