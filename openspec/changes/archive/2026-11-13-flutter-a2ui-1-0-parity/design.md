## Context

Operator decisions: D7 reversed and the `a2ui_flutter` renderer chosen (`.prometheus/decisions.md`, 2026-11-12).
Contract amendment 3 adds scenario UPG-18 and removes the D7 exclusion.

## Decisions

- **Renderer.** `a2ui_flutter` 0.3.0 + `a2ui_core` 0.7.0, exact pins. `a2ui_core` implements v0.9, v0.9.1 and v1.0
  envelopes, so the showcase needs no translation layer; this mirrors the React side, which routes 1.0 natively through
  the official processor.
- **Authority stays in the app.** The processor's action stream is the only path from the rendered surface to the
  graph, and it goes through `A2uiActionPolicy.execute`; the policy remains allowlist-first and fail-closed.
- **Refusal.** Processor validation errors decide refusal; a refused batch renders no surface and writes nothing.
- **Evidence.** Gate III is the integration test on a booted iOS simulator, run by the verifier once in the boundary
  run. Legacy widget/golden tests under `test/` are not evidence and are not extended.

## Implementation record

- **12.1–12.2 (2026-11-12, profile-I worker `claude-opus-5-5`, reviewed and amended by the driver).**
  `pubspec.yaml` pins `a2ui_core` 0.7.0 and `a2ui_flutter` 0.3.0; genui and 31 transitive packages left the root
  `pubspec.lock`. New `A2uiSurfaceStore` (`lib/features/a2ui/application/a2ui_surface_store.dart`) owns one
  `MessageProcessor` (strict `ValidationConfig`, only createSurface/updateComponents/updateDataModel/deleteSurface)
  and publishes the shown surface or a refusal; `load()` is atomic. Both A2UI paths moved: the app's main path
  (`ShowcaseScreen` → `SafeA2uiSurface` → `agentSurfaceStoreProvider` → `ShowcaseController.handleAgentAction`) and
  the secondary runtime (`ShowcaseA2uiRuntime` → `A2uiActionPolicy.execute`). Fixtures and surface messages are
  1.0 final; the RC→v0.9 validator is deleted.
- **Driver amendments.** (a) The narrowed catalog had kept the basic catalog's id while supporting six components
  and no functions; it now has its own id `urn:prometheus-ags:a2ui:catalog:flutter-showcase-1.0` (`Catalog.derive`
  is documented for new ids). (b) The main path again refuses, at load, a batch naming an action outside
  task.update/archive/delete (`declaredActions`, `UNDECLARED_ACTION`), as the pre-migration validator did; the
  secondary runtime keeps policy-time denial, as before.
- **Behaviour changes accepted.** 1.0 basic Text has only `caption`/`body` variants, so headings render as body
  text; `wantResponse`/`responsePath`/`lastAction` are gone (1.0 Action events allow no extra properties). Runtime
  errors on an accepted surface (`model.onError`) do not refuse it.
- **Static check only.** `dart analyze` of `lib/` and `integration_test/`: no errors or warnings (infos are the
  package's existing `depend_on_referenced_packages`). Legacy `test/` files import a wrong package name
  (`prometheus_flutter_showcase`) from before this change and do not analyze; they are not evidence and were not
  repaired. `test/goldens/a2ui-surface-messages.json` is stale legacy data. Nothing was run.

### Acceptance path (12.3)

`scripts/verify-flutter-a2ui-v1.mjs` (root `verify:flutter-a2ui-v1`, `--report` required) replaces the genui-era
`verify-flutter-riverpod-a2ui-example.mjs`, whose genui pins can no longer hold. It checks the example pubspec and the
workspace `pubspec.lock` (a2ui_flutter 0.3.0, a2ui_core 0.7.0, no genui), boots the named iOS simulator only if it is
not already booted (and shuts down only what it booted), runs `integration_test/mobile_smoke_test.dart`, then runs a
generated copy whose denied-delete expectation is flipped to "allowed" and requires it to fail. The copy is deleted
in a `finally`. `release-check.mjs` runs the new gate with a report in its bundle directory.

Left as is, on purpose: `examples/coverage.json` capability `graph.offline-persistence-sync` still names the retired
command for its 3.0 mobile receipt (historical evidence, not re-run here); the legacy `tests/release` and
`tests/steps` files that import the old script are legacy artifacts and are not run (A-9); the `flutter-a2ui-phone`
golden was captured from the GenUI renderer and is not re-certified by this gate.
