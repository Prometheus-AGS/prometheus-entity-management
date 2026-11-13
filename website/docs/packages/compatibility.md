---
title: Compatibility and stability
sidebar_position: 2
---

# Compatibility and stability

| Surface | 3.x compatibility | Distribution |
| --- | --- | --- |
| Node.js | `^22.14`, `^24`, or `>=26` | all thirteen npm packages public at `4.1.1` |
| React | React 19 binding, vanilla core underneath | React and core both `4.1.1` on `latest` |
| Svelte | Svelte 5 peer binding | public at `3.2.0` on `latest` |
| Solid | Solid 1.x peer binding | public at `3.2.0` on `latest` |
| Flutter | Flutter 3.44.8 / Riverpod 3 | pub.dev `entity_graph_flutter@3.1.0`; official DevTools companion; native A2UI 1.0 rendering in the showcase via `a2ui_flutter` 0.3.0 |
| Tauri | Tauri 2 JavaScript/Rust plugin | public at `3.2.0`; native signing excluded |

All thirteen npm packages move in a fixed 4.x set. Bindings declare core as a
peer so one application cannot accidentally resolve multiple graph singletons.
“Stable” in the release contract describes the intended public contract and
now matches registry state: every npm package has moved `latest` to `3.2.0`;
Flutter is a public stable `3.1.0` on pub.dev. React and A2UI React are public
at `3.2.0`. From 5.0.0, A2UI React targets A2UI 1.0, `@a2ui/*` 0.15.0 and AG-UI 1.0
(`@ag-ui/core` `^1.0.0`); `entity-graph-a2a` uses the official A2UI A2A extension
and `@a2a-js/sdk` 1.3.0. The Flutter showcase renders A2UI 1.0 natively through `a2ui_flutter` 0.3.0.

Generated TypeScript API pages are produced with:

```bash
pnpm run build:packages
pnpm run docs:api
```

The generator packs every npm artifact, extracts it into an isolated directory,
and runs TypeDoc 0.28 in packages mode against the tarballs. It rejects package
identity/version drift before documentation is emitted.
