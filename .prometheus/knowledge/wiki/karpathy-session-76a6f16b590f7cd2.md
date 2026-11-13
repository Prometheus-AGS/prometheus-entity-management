---
type: SessionRecord
id: karpathy-session-76a6f16b590f7cd2
title: Karpathy session 76a6f16b590f
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-12T20:43:20.175678+00:00
created_at: 2026-11-12T20:43:20.175678+00:00
updated_at: 2026-11-12T20:43:20.175678+00:00
revision: 0
---

## Delta

A second worker has finished: it wrote the examples verifier (UPG-14) and the A2UI visual capture. I've added both to `package.json` as `verify:a2ui-examples` and `capture:a2ui-visual`. Nothing has run yet beyond a syntax check, so none of this is verified.

**How the examples verifier works:**
- It builds each of the three examples, serves it, and drives it in Chromium.
- For each, it checks that the main surface renders and that one action completes.
- Every A2UI message captured from the running app must have `version: "1.0"`. An example where nothing is captured fails.
- As the check against itself, it runs the same rule on each example's recorded pre-migration messages, which must fail.

**How the visual capture works:**
- `capture:a2ui-visual` writes the existing set of screenshots, keyboard recording and accessibility checks into the evidence folder, with a hash for every file.
- The visual check reads that folder when `A2UI_VISUAL_EVIDENCE` is set and behaves as before when it isn't.

What the worker found:
1. **The visual evidence still shows the v0.9.1 path, not 1.0.** The test page it photographs sends v0.9.1 messages. The contract has no scenario that requires 1.0 visual evidence, and v0.9.1 is still supported, so it still counts for the bridge. It just isn't evidence for 1.0 rendering, and the manifest records the protocol honestly. Moving it to 1.0 means changing that test page.
2. **The test page can't build from its own config.** Its Vite and React dependencies aren't installed at the repo root, so the capture borrows them from `examples/agentic-a2ui-app`. That works but is fragile.
3. **The acceptance run might trip on a rebuild.** It rebuilds `a2ui-react` after the capture. If that build isn't byte-identical, the visual check's file-hash comparison fails. I expect the build to be deterministic, but it hasn't been checked.
4. **One message source in `agentic-a2ui` isn't captured.** That example's own A2A server sends its A2UI artifact without the page ever seeing it. The artifact is still guarded, because creating it rejects anything that isn't 1.0. The verifier instead captures the messages the page's own planner hands to the runtime.
5. **An old acceptance step-definitions file still expects v0.9.1 and the old port.** It isn't part of the acceptance run, so it's left alone.

I'll write these up in the release design record. Two workers are still running: `verify:a2ui-v1` and `verify:agui-run-stack`.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-12T20:43:18.321539Z
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
