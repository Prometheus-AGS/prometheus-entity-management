---
type: SessionRecord
id: karpathy-session-b8474e4789294084
title: Karpathy session b8474e478929
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-13T01:25:16.197194+00:00
created_at: 2026-11-13T01:25:16.197194+00:00
updated_at: 2026-11-13T01:25:16.197194+00:00
revision: 0
---

## Delta

Run 10 got the furthest yet: steps 1–10 all passed. Step 11 (the examples) failed, and the fix is ready. The next rerun would spend the contract's last repair attempt, so I've stopped to ask how to handle that.

**What now passes (steps 1–10):**
- The bridge and the visual accessibility gate.
- Package contracts.
- All nine A2UI 1.0 scenarios.
- A2A conformance.
- The AG-UI run stack.

**Why step 11 failed:** A2UI 1.0 requires component ids to be identifiers (letters, digits, underscores), so hyphens are refused. The example surfaces used ids like `update-button` and `mark-done`. The `agentic-a2ui-app` example's surface was refused, and the browser run ended there, so the other two examples recorded nothing. I confirmed the cause by loading the example's surface into the built runtime directly.

**Fix (prepared, not yet run):**
- Renamed every hyphenated component id to snake_case:
  - both React examples and their fixtures
  - both Flutter surfaces, which hadn't run yet and would have hit the same rule
  - the activity-lab surface inside the examples verifier
- Both React example surfaces now load without error.
- Added the rule to the 5.0 migration guide and the skill reference, since consumers with hyphenated ids will hit the same refusal.

Run 10 is written up in its evidence folder. Nothing is published or committed.

**The budget question:** the contract allows 10 repair attempts and I've used 9. Steps 12–14 have never run: upstream conformance, the Flutter simulator run, and the skills/validate/docs checks. A failure in any of them after the last attempt would leave the phase blocked with no budget left.

- **Raise budget, sign (my recommendation):** I draft amendment 5 raising the repair budget from 10 to 20, nothing else, sign it with your key as before, adopt it, then rerun.
- **Use last attempt:** I rerun now. If anything in steps 12–14 fails, the phase is blocked and we'd need an amendment anyway.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-13T01:25:12.677449Z
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
