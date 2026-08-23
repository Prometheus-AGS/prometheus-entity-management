---
title: Compatibility and stability
sidebar_position: 2
---

# Compatibility and stability

| Surface | 3.x compatibility | RC distribution |
| --- | --- | --- |
| Node.js | `^22.14`, `^24`, or `>=26` | core and React RCs public; nine npm RCs staged |
| React | React 19 binding, vanilla core underneath | React `@latest`; core `@next`, both `3.0.0-rc.1` |
| Svelte | Svelte 5 peer binding | RC staged; public `latest` remains alpha |
| Solid | Solid 1.x peer binding | RC staged; public `latest` remains alpha |
| Flutter | Flutter 3.44.8 / Riverpod 3 | pub.dev `entity_graph_flutter@3.0.0` |
| Tauri | Tauri 2 JavaScript/Rust plugin | RC staged; native signing excluded |

All twelve npm packages move in a fixed 3.x set. Bindings declare core as a
peer so one application cannot accidentally resolve multiple graph singletons.
“Stable” in the release contract describes the intended public contract. It is
not a registry-state label: only the React package has intentionally moved npm
`latest` to `3.0.0-rc.1`; Flutter is a public stable `3.0.0` on pub.dev.

Generated TypeScript API pages are produced with:

```bash
pnpm run build:packages
pnpm run docs:api
```

The generator packs every npm artifact, extracts it into an isolated directory,
and runs TypeDoc 0.28 in packages mode against the tarballs. It rejects package
identity/version drift before documentation is emitted.
