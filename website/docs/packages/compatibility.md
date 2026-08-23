---
title: Compatibility and stability
sidebar_position: 2
---

# Compatibility and stability

| Surface | 3.x compatibility | Distribution |
| --- | --- | --- |
| Node.js | `^22.14`, `^24`, or `>=26` | all twelve npm packages public at `3.0.1` |
| React | React 19 binding, vanilla core underneath | React and core both `3.0.1` on `latest` |
| Svelte | Svelte 5 peer binding | public at `3.0.1` on `latest` |
| Solid | Solid 1.x peer binding | public at `3.0.1` on `latest` |
| Flutter | Flutter 3.44.8 / Riverpod 3 | pub.dev `entity_graph_flutter@3.0.0` |
| Tauri | Tauri 2 JavaScript/Rust plugin | public at `3.0.1`; native signing excluded |

All twelve npm packages move in a fixed 3.x set. Bindings declare core as a
peer so one application cannot accidentally resolve multiple graph singletons.
“Stable” in the release contract describes the intended public contract and
now matches registry state: every npm package has moved `latest` to `3.0.1`;
Flutter is a public stable `3.0.0` on pub.dev.

Generated TypeScript API pages are produced with:

```bash
pnpm run build:packages
pnpm run docs:api
```

The generator packs every npm artifact, extracts it into an isolated directory,
and runs TypeDoc 0.28 in packages mode against the tarballs. It rejects package
identity/version drift before documentation is emitted.
