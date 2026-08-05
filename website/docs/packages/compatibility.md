---
title: Compatibility and stability
sidebar_position: 2
---

# Compatibility and stability

| Surface | 3.x compatibility | RC distribution |
| --- | --- | --- |
| Node.js | `^22.14`, `^24`, or `>=26` | npm `next` after trust verification |
| React | React 19 binding, vanilla core underneath | `prometheus-entity-management` package |
| Svelte | Svelte 5 peer binding | separate package |
| Solid | Solid 1.x peer binding | separate package |
| Flutter | Flutter 3.44.8 / Riverpod 3 source candidate | monorepo until pub.dev authority |
| Tauri | Tauri 2 JavaScript/Rust plugin | npm package; native signing excluded |

All twelve npm packages move in a fixed 3.x set. Bindings declare core as a
peer so one application cannot accidentally resolve multiple graph singletons.
“Stable” in the release contract describes the intended public contract; it
does not mean the RC has already been promoted to `latest`.

Generated TypeScript API pages are produced with:

```bash
pnpm run build:packages
pnpm run docs:api
```

The generator packs every npm artifact, extracts it into an isolated directory,
and runs TypeDoc 0.28 in packages mode against the tarballs. It rejects package
identity/version drift before documentation is emitted.
