# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 17 of 28 changes
**Current round:** Round 5 (next dependency-ready change)
**Updated:** 2026-08-21T02:25:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-tauri-universal-example`

## Exact next command

```text
/kbd-apply v3-tauri-universal-example
```

The Flutter/Riverpod A2UI example is certified and archived (2026-08-21): the `examples/flutter-riverpod` app composes `entity_graph_flutter@3.0.0` with genui `SurfaceController` A2UI surfaces under an app-owned fail-closed action policy (allowlist `task.update`, approval-gated `task.replace`, denied `task.delete`, tenant guard); 29/29 tests pass with message-stream and phone/tablet goldens, and debug APK plus simulator iOS builds succeed (compile-level platform smoke; no booted-device run — retained limit). Build the universal Tauri example next: desktop build + command E2E, Android/iOS build/smoke recorded, denied permissions and offline restart tested. `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
