# Design: v3-flutter-source-provenance

## Candidate reuse decisions

### cand-007 — KnowMe prometheus_entity_management Flutter package

- **Verdict:** adapt
- **Decision:** Import its generic provider/view/CRUD concepts with history, then decouple them from the KnowMe-specific FFI implementation behind an adapter package.
- **Evidence:**
  - Tier 1: The 2,704-line source package contains Riverpod 3 provider families, transport, view, sync, generated models, and CRUD, but no package-local test directory. (file:///Users/gqadonis/Projects/know-me/know-me-system/flutter_packages/prometheus_entity_management)

### cand-009 — KnowMe gen_ui_widgets

- **Verdict:** adapt
- **Decision:** Extract the safe A2UI wrapper into a focused Flutter A2UI integration; keep or separately package generic ContentBlock widgets only if their public scope is approved.
- **Evidence:**
  - Tier 1: The 2,701-line package delegates A2UI parsing/state/schema work to genui and forwards typed actions to the host, but has no package-local tests and includes broader KnowMe ContentBlock/media concerns. (file:///Users/gqadonis/Projects/know-me/know-me-system/flutter_packages/gen_ui_widgets)

### cand-013 — KnowMe desktop and mobile applications

- **Verdict:** reference
- **Decision:** Port small boundary patterns and scenario slices, not entire product directories. Never copy from the dirty working tree.
- **Evidence:**
  - Tier 1: KnowMe contains a production-scale React 19/Tauri desktop, Flutter/Riverpod mobile app, A2UI adapters, and entity runtime boundary patterns. (file:///Users/gqadonis/Projects/know-me/know-me-system)

### cand-014 — KnowMe Builder Flutter/A2UI templates as a migration source

- **Verdict:** reference
- **Decision:** There is no Flutter/A2UI runtime library in this repository to move. Reject it as a code-migration source while retaining a reference verdict for its templates, audits, and downstream package-consumer updates.
- **Evidence:**
  - Tier 1: The repository is a generator/template package, explicitly contains no runnable product application, and defines sovereign-hybrid, Flutter mobile, and Tauri desktop profiles. (file:///Users/gqadonis/Projects/hybrid-mobile-architecture-src/builder.manifest.json)
  - Tier 1: Inspected Flutter material is under assets/templates/flutter-feature and assets/templates/profiles/*/mobile; no reusable top-level Flutter package/lib source exists to migrate. A2UI material is likewise template/skill guidance rather than a canonical runtime library. (file:///Users/gqadonis/Projects/hybrid-mobile-architecture-src/assets/templates)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

