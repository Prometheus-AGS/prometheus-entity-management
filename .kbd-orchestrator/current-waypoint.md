# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 7 of 28 changes
**Current round:** Round 3 (next dependency-ready change)
**Updated:** 2026-08-01T18:40:16Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-a2ui-protocol-bridge`

## Exact next command

```text
/kbd-apply v3-a2ui-protocol-bridge
```

The release contract, main CI baseline, package module contracts, framework-neutral core, binding singleton contract, shared example coverage contract, and mandatory PGlite/Loro sync path are archived, and all seven promoted specs validate. Separate AG-UI transport from official A2UI rendering and graph projection next. `v3-release-pipeline-rc` remains pending until its Dart/Riverpod and Tauri mobile prerequisites are complete.
