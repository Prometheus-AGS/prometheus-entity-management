# Visual evidence certification — Dart cross-view widget harness

Date: 2026-08-02  
Scope: Flutter host widget harness at 960×600

## Result

**PASS for scoped cross-view optimistic propagation; NOT APPLICABLE for full
application, device, or accessibility certification.**

Original-resolution inspection of the initial and optimistic images confirms
that the Prometheus dark/orange list and detail cards remain aligned without
clipping, overflow, collapsed content, or ambiguous state. The optimistic
image changes `Alice Rivera` to `Alicia Rivera` in both joined surfaces. Stable
Flutter rendering differs from the earlier beta only at rounded-border
anti-aliasing pixels.

- `packages/entity_graph_flutter/test/goldens/cross-view-initial.png` —
  SHA-256 `cf8cafe9e6ef51f7138f74f73ae732d7286d695b9c3bad1afb46a8730f648e3a`
- `packages/entity_graph_flutter/test/goldens/cross-view-optimistic.png` —
  SHA-256 `e1e6ea7a4e4f4fe9339111f2a4ec1a1bbe9d81ca3c3a993b60bf58cb8ca8aac3`

The widget test and behavioral suite prove that both surfaces rejoin one graph
record and that rollback restores hidden graph metadata. The images alone do
not prove those rules.

This evidence does not include application navigation, A2UI rendering,
Android/iOS runners, phone/tablet layouts, keyboard/focus behavior,
accessibility semantics/contrast/target-size checks, physical devices, or app
store packaging. Those visual/platform obligations remain with
`v3-flutter-riverpod-a2ui-example`.
