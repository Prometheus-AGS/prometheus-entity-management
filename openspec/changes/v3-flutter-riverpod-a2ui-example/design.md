# Design: v3-flutter-riverpod-a2ui-example

## Candidate reuse decisions

### cand-005 — Flutter GenUI (genui)

- **Verdict:** adopt
- **Decision:** Reuse the official protocol engine and adapt KnowMe's safe catalog/action wrapper rather than own a second Flutter protocol parser.
- **Evidence:**
  - Tier 1: The official Flutter repository is active and provides the maintained GenUI/A2UI implementation. (https://github.com/flutter/genui)
  - Tier 3: pub.dev reported genui 0.10.1 with Dart >=3.10 and Flutter >=3.35.7. (https://pub.dev/packages/genui)
  - Tier 4: GenUI implements A2UI parsing, surface lifecycle, reactive data binding, catalogs, rendering, and user-action emission. (https://pub.dev/documentation/genui/latest/genui/)

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

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

