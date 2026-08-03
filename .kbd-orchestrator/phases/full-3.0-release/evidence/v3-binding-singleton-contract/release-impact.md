# Release impact — `v3-binding-singleton-contract`

## What is now certified

- React, Svelte, Solid, Web Components, Alpine, and HTMX consume an application-owned compatible `@prometheus-ags/entity-graph-core` peer.
- An isolated strict pnpm consumer resolves one physical core for the application and all six packed bindings.
- Each binding has a public, binding-appropriate behavior proof against that shared graph.
- A supplied incompatible core fails before runtime with actionable peer diagnostics.
- The exact twelve-package npm Changesets fixed group prevents independent core/binding version drift.

## Downstream impact

This dependency is satisfied for:

- `v3-release-pipeline-rc`;
- `v3-vite-react19-example`;
- `v3-nextjs-app-router-example`; and
- later skills, documentation, certification, and publication work that consumes the six JavaScript bindings.

Those changes retain their other dependencies and acceptance criteria; this archive does not make them complete.

## Still open for full 3.0

- Tauri and Flutter/Dart native singleton and platform contracts.
- Five complete showcase applications and their browser/device visual evidence.
- Flint portability, sync/persistence, A2UI, A2A, and skills ecosystem completion.
- Full Prometheus-branded Docusaurus content, GitHub Pages deployment, accessibility, route, and screenshot evidence.
- RC automation, provenance, recovery rehearsal, immutable-commit release certification, manual authority, registry publication, and movement of npm `latest`.

Overall release status remains `in-progress`; stable publication is not authorized.

