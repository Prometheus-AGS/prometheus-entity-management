# Release impact — `v3-a2ui-protocol-bridge`

Date: 2026-08-01

## What this change makes release-ready

- `@prometheus-ags/a2ui-react` now has an honest official A2UI v0.9.1 package root backed by the maintained official message processor, schemas, catalog implementations, data/surface model, and React renderer.
- Prometheus supplies the narrow pieces it owns: exact-version enforcement, an explicit official-catalog subset, React lifecycle wrappers, default-deny action policy, and normalized entity-graph projection.
- Valid protocol actions cannot bypass application authority. Entity type, action, fields, tenant/scope authorization, and destructive approval are explicit and executable.
- The alpha AG-UI chat/state surface survives under the separately named `./ag-ui` compatibility entry instead of being mislabeled as A2UI.
- Packed A2UI candidates now work in ESM and CommonJS at runtime and compile under strict NodeNext and Node16 declarations. The clean gate corrected the upstream ESM-only declaration interop defect without consumer `skipLibCheck`.
- Browser, keyboard, accessibility, video, trace, and immutable-hash evidence prove the shipped renderer and visible policy outcomes.
- Coverage, package/release documentation, changesets, and agent export ledgers describe the same boundary without promoting downstream showcases or full-release certification.

## Compatibility and dependency effect

- The package root change is intentionally breaking for `3.0.0-alpha.0` consumers that imported `EntityChat` or related AG-UI APIs. They must migrate imports to `@prometheus-ags/a2ui-react/ag-ui`; runtime names remain available there.
- The stable wire target is A2UI `v0.9.1`. Distribution pins are independently fixed at `@a2ui/react@0.10.2`, `@a2ui/web_core@0.10.5`, and `@a2ui/markdown-it@0.1.0` with `zod@3.25.76`.
- Official A2UI runtime code is bundled into both ESM and CommonJS artifacts because upstream `web_core` is ESM-only. React, the canonical graph, and validation/runtime singletons retain their declared external boundaries.
- A fail-closed build step annotates generated CommonJS protocol declarations with import-mode type resolution; strict packed Node16 compilation detects drift.
- The frozen release inventory remains twelve npm packages. No thirteenth AG-UI package or alternate protocol runtime was introduced.

## What remains incomplete for full 3.0

This archive certifies the package-level official A2UI bridge, not the complete agent platform or full release. A2A AgentCard/task/stream/cancel conformance, the keyless agentic example, Flutter/Riverpod A2UI, native Tauri desktop/mobile behavior, Flint portability, all other showcase applications, and the complete Prometheus-branded Docusaurus/GitHub Pages site remain open under their declared changes.

Release provenance, RC/recovery rehearsal, immutable-commit certification, registry authority, stable npm publication, and movement of `latest` also remain open. The coverage ledger therefore remains `in-progress`, all five showcases and the documentation site remain planned, and `releaseCertified` remains false.

## Publication authority

Publication remains unauthorized. Archiving this implementation change may unblock its declared dependents, but it cannot authorize `changeset publish`, npm `latest`, a GitHub release, documentation deployment, or any other external mutation.
