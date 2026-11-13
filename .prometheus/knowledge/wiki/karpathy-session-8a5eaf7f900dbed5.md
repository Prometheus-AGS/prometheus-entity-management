---
type: SessionRecord
id: karpathy-session-8a5eaf7f900dbed5
title: Karpathy session 8a5eaf7f900d
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-13T07:49:34.060886+00:00
created_at: 2026-11-13T07:49:34.060886+00:00
updated_at: 2026-11-13T07:49:34.060886+00:00
revision: 0
---

## Delta

The Flutter showcase now works end to end on the iOS simulator. Run 13 still stopped at step 13 because the test script couldn't find a control on screen. That's fixed and the full packet is rerunning.

**Run 13:**
- **Passed:** steps 1–12 again.
- **Build:** the iOS app built and launched first time, so the retry never triggered.
- **What worked on screen:**
  - the A2UI 1.0 surface rendered through `a2ui_flutter`
  - the denied delete left a denial receipt and didn't change the graph
  - the allowed update left a receipt and changed the graph
- **Negative control:** the deliberately wrong copy of the test failed where it should.

**What failed:** the last part of the test turns on the "Load hostile unknown-component fixture" switch, which sits above the surface on the page. By then the test had scrolled down to press the action buttons. A Flutter list stops building rows that are off screen, so the switch didn't exist and the test couldn't find it.

**Fix:** the test now scrolls the list back until the switch is visible, then taps it. This changes only the test, not the app, and the line the negative control alters is untouched.

Run 13 is written up in its evidence folder, and the full packet is running again. This is repair attempt 13 of 20. If step 13 passes, step 14 (skills, validate, docs) runs for the first time. Nothing is published or committed.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-13T07:49:28.973725Z
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
- examples/agentic-a2ui-app/CHANGELOG.md
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
- examples/agentic-a2ui/CHANGELOG.md
- examples/agentic-a2ui/README.md
- examples/agentic-a2ui/package.json
- examples/agentic-a2ui/src/agent/agent-client.ts
- examples/agentic-a2ui/src/agent/agent-flows.ts
- examples/agentic-a2ui/src/agent/surface-messages.ts
- examples/agentic-a2ui/src/pages/agent-console-page.tsx
- examples/agentic-a2ui/tests/golden/surface-task-sync.json
- examples/agui-activity-lab/CHANGELOG.md
- examples/agui-activity-lab/README.md
- examples/agui-activity-lab/package.json
