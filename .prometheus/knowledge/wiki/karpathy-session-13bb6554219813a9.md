---
type: SessionRecord
id: karpathy-session-13bb6554219813a9
title: Karpathy session 13bb65542198
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-12T13:28:01.414581+00:00
created_at: 2026-11-12T13:28:01.414581+00:00
updated_at: 2026-11-12T13:28:01.414581+00:00
revision: 0
---

## Delta

The Flutter showcase now renders A2UI 1.0 through `a2ui_flutter` 0.3.0, and the docs are updated to match. Nothing has run yet: the only check was a static `dart analyze` of the app code and the integration test, with no errors or warnings. The next steps are still waiting on your signature for amendment 3.

**What the migration changed**
- **Dependencies:** `genui` is replaced by `a2ui_core` 0.7.0 and `a2ui_flutter` 0.3.0, and genui's 31 indirect packages are gone from the lockfile.
- **Messages:** the showcase sends `version: "1.0"` messages directly, and the old release-candidate translation layer is deleted.
- **Both A2UI paths moved.** The app has two: the main screen, and a second panel the app never navigates to. Both still send every user action through the app's own Riverpod action policy. Rejected input shows a refusal card and writes nothing to the graph.
- **Integration test:** rewritten to check the new surface, an allowed action, a denied action and a rejected batch. It runs once, on an iPhone simulator, in the final acceptance run.
- **Two corrections I made to the migration:**
  - The cut-down catalog had reused the official basic catalog's id while supporting only six components. It now has its own id, `urn:prometheus-ags:a2ui:catalog:flutter-showcase-1.0`.
  - On the main screen, a batch naming an action outside update/archive/delete is again rejected when it loads, as it was before. The migration had dropped that check.
- **Visible behaviour changes:**
  - Headings now look like body text, because A2UI 1.0 Text only has `caption` and `body` styles.
  - Errors that happen on a surface after it has loaded no longer cause it to be rejected.

**Found along the way**
- **React examples:** three of them sent the heading style `h2` in their 1.0 surfaces, which 1.0 doesn't allow, so those surfaces would probably have been rejected when loaded. I removed it from `agentic-a2ui-app` (the fixture and the reference surfaces) and from `agentic-a2ui`.
- **Library fix:** the runtime fix that sends surface errors to the agent is in, and the package type-checks.

**Docs:** about 25 pages and READMEs now describe native 1.0 rendering, and `examples/coverage.json` still parses. Three things are left for later:
- The skills reference docs still mention GenUI. I'll update them in the exports-and-skills sync step, where `verify:skills` checks them.
- Some docs still quote Flutter test counts from before the migration.
- The Flutter phone screenshot in the evidence gallery was taken from the old GenUI rendering.

Some old test files under `examples/flutter-riverpod/test/` import a package name the example doesn't have; that was already broken before this work. They aren't part of the evidence, so I left them.

**What I'll do once amendment 3 is signed**
- Add the divergence list to the conformance harness and write its spec, which closes 10.3.
- Write the Flutter check script `verify:flutter-a2ui-v1`, which boots the simulator and runs the integration test, closing 12.3.
- Then the remaining acceptance scripts, the exports and skills sync, the independent review and the final acceptance run.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-12T13:27:58.973356Z
- Project: /Volumes/T7/Projects/prometheus/prometheus-entity-management

## Changed Paths

- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/model-preflight.json
- .kbd-orchestrator/phases/full-3.0-release/progress.json
- .kbd-orchestrator/phases/full-3.0-release/tasks.md
- .kbd-orchestrator/phases/phase-v1-npm-framework/progress.json
- .kbd-orchestrator/phases/phase-v2-examples-and-docs-coverage/progress.json
- .kbd-orchestrator/phases/phase-v2-realtime-fabric-parity/progress.json
- .kbd-orchestrator/phases/phase-v3-universal-platform-evolution/progress.json
- .kbd-orchestrator/phases/phase-v4-prometheus-entity-sync/progress.json
- .kbd-orchestrator/phases/v3-devtools-parity/progress.json
- .kbd-orchestrator/phases/v3-devtools-parity/tasks.md
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
- .kbd-orchestrator/project.json
- .prometheus/decisions.md
- .prometheus/session-log.md
- README.md
- examples/README.md
- examples/agentic-a2ui-app/README.md
- examples/agentic-a2ui-app/package.json
- examples/agentic-a2ui-app/src/features/agentic/a2a-client-service.ts
- examples/agentic-a2ui-app/src/features/agentic/components/agent-console.tsx
- examples/agentic-a2ui-app/src/features/agentic/fixtures/malformed-unknown-component.v0.9.1.json -> examples/agentic-a2ui-app/src/features/agentic/fixtures/malformed-unknown-component.1.0.json
- examples/agentic-a2ui-app/src/features/agentic/fixtures/task-review.v0.9.1.json -> examples/agentic-a2ui-app/src/features/agentic/fixtures/task-review.1.0.json
- examples/agentic-a2ui-app/src/features/agentic/reference-agent.ts
- examples/agentic-a2ui-app/src/features/agentic/reference-surfaces.test.ts
- examples/agentic-a2ui-app/src/features/agentic/reference-surfaces.ts
- examples/agentic-a2ui-app/src/features/agentic/runtime.ts
- examples/agentic-a2ui/README.md
- examples/agentic-a2ui/package.json
- examples/agentic-a2ui/src/agent/agent-client.ts
- examples/agentic-a2ui/src/agent/agent-flows.ts
- examples/agentic-a2ui/src/agent/surface-messages.ts
- examples/agentic-a2ui/src/pages/agent-console-page.tsx
- examples/agentic-a2ui/tests/golden/surface-task-sync.json
- examples/agui-activity-lab/README.md
- examples/agui-activity-lab/package.json
- examples/agui-activity-lab/server/events.ts
- examples/coverage.json
- examples/flutter-riverpod/integration_test/mobile_smoke_test.dart
