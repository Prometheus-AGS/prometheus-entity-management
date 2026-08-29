# Prometheus Entity Management 3.0.4

- Fixes issue #42 by making `useGraphStore`'s legacy imperative methods explicit,
  deprecated singleton delegates while provider-aware callbacks capture
  `useGraphStoreApi()`.
- Corrects the Next.js hydration boundary so request state is written only to
  the provider-owned browser graph.
- Adds strict A2UI 1.0-RC compatibility in React and Flutter over the currently
  published official v0.9 renderer engines.
- Adds AG-UI 0.0.59 `a2ui-surface` activity snapshot support with deterministic
  replacement and the existing catalog/action-policy boundary.

All twelve `@prometheus-ags` npm packages are published at 3.0.4. Both `latest`
and `next` point to 3.0.4.
