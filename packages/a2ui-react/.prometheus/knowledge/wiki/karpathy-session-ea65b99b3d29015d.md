---
type: SessionRecord
id: karpathy-session-ea65b99b3d29015d
title: Karpathy session ea65b99b3d29
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-12T13:16:27.476494+00:00
created_at: 2026-11-12T13:16:27.476494+00:00
updated_at: 2026-11-12T13:16:27.476494+00:00
revision: 0
---

## Delta

The `a2ui_flutter` choice is recorded, and contract amendment 3 is ready for your signature. The Flutter migration itself is still running in a separate agent, so none of it is done or checked yet.

## Flutter parity
- **New change.** I registered a new KBD change, `flutter-a2ui-1-0-parity`, with three tasks: dependencies and 1.0 messages, the runtime, and acceptance.
- **Spec.** Its OpenSpec change passes `--strict`. The Flutter spec text that recorded the deferral moved there from change 9 and now states 1.0 parity.
- **Scope.** The agent is limited to `examples/flutter-riverpod`. It's replacing `genui` with `a2ui_flutter` 0.3.0 and `a2ui_core` 0.7.0, deleting the old translation layer and keeping the Riverpod action policy. It's also updating the device integration test, which won't run until the final acceptance run.
- **Device.** That run will use an iPhone 17 simulator, which is available on this Mac.

## Conformance harness (change 10)
The files are written, but neither the harness nor its tests have run yet. The agent that built it read the code and predicts that 6 of the 29 upstream cases fail and 2 can't be checked. The contract currently says every case must pass (UPG-3), so as written that scenario can't be met. I checked the claims:
- **Our bug, fixed.** When a function call failed inside a user action, the official processor recorded the error on the surface, and our runtime never sent it to the agent. The runtime now forwards those errors as 1.0 `error` messages. A scoped type check passes; the fix hasn't run yet.
- **Our own rules, kept:**
  - The component allowlist refuses unknown component types instead of rendering a placeholder, and the allowlist is one of the contract's required safety checks.
  - 1.0 input is parsed strictly, so a `theme` is refused rather than silently dropped.
- **Gaps in the bundled `@a2ui` 0.15.0 renderer, confirmed in its source:**
  - User actions never route a function only the agent implements to the agent. The routing function exists, but nothing calls it.
  - `TextField` shows no hints.
  - A hidden button stays focusable, which an accessibility check flags.
- **Can't be checked:** two cases need the official models' listener counts, which aren't exposed.

## Amendment 3
It is in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/amendment-flutter-parity-3.json` and moves the contract to digest `c5c06a04…`. It:
- adds the Flutter scenario (UPG-18) and its check to the final acceptance run
- removes the Flutter exclusion
- allows npm publication of 5.0.0, but only after the acceptance run and the independent review pass, and after you confirm the version and dist-tag
- changes UPG-3 so a fixed list of named cases may fail, each on only one stated check and with its reason recorded. Any other failure still fails the run. The list file is fingerprinted into the evidence.

If you'd rather not accept a list like that, the alternative is to make the package behave the way the upstream cases expect:
- add a lenient parsing mode
- render a placeholder for unknown components
- route agent-implemented functions from user actions ourselves

The first two loosen safety rules we chose deliberately, and the routing is work the official renderer should be doing.

If you choose "Sign and continue", I'll sign with your `~/.ssh/id_ed25519` and record it the same way as amendments 1 and 2. Then I'll add the list to the harness and carry on with the remaining phase steps.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-12T13:16:25.863093Z
- Project: /Volumes/T7/Projects/prometheus/prometheus-entity-management/packages/a2ui-react

## Changed Paths

- ../../.kbd-orchestrator/current-waypoint.json
- ../../.kbd-orchestrator/model-preflight.json
- ../../.kbd-orchestrator/phases/full-3.0-release/progress.json
- ../../.kbd-orchestrator/phases/full-3.0-release/tasks.md
- ../../.kbd-orchestrator/phases/phase-v1-npm-framework/progress.json
- ../../.kbd-orchestrator/phases/phase-v2-examples-and-docs-coverage/progress.json
- ../../.kbd-orchestrator/phases/phase-v2-realtime-fabric-parity/progress.json
- ../../.kbd-orchestrator/phases/phase-v3-universal-platform-evolution/progress.json
- ../../.kbd-orchestrator/phases/phase-v4-prometheus-entity-sync/progress.json
- ../../.kbd-orchestrator/phases/v3-devtools-parity/progress.json
- ../../.kbd-orchestrator/phases/v3-devtools-parity/tasks.md
- ../../.kbd-orchestrator/position-reminder.txt
- ../../.kbd-orchestrator/position.json
- ../../.kbd-orchestrator/project.json
- ../../.prometheus/decisions.md
- ../../.prometheus/knowledge/.prompt-snapshots/project/current
- ../../.prometheus/knowledge/wiki/index.md
- ../../.prometheus/knowledge/wiki/log.md
- ../../.prometheus/session-log.md
- ../../examples/agentic-a2ui-app/README.md
- ../../examples/agentic-a2ui-app/package.json
- ../../examples/agentic-a2ui-app/src/features/agentic/a2a-client-service.ts
- ../../examples/agentic-a2ui-app/src/features/agentic/components/agent-console.tsx
- ../../examples/agentic-a2ui-app/src/features/agentic/fixtures/malformed-unknown-component.v0.9.1.json -> ../../examples/agentic-a2ui-app/src/features/agentic/fixtures/malformed-unknown-component.1.0.json
- ../../examples/agentic-a2ui-app/src/features/agentic/fixtures/task-review.v0.9.1.json -> ../../examples/agentic-a2ui-app/src/features/agentic/fixtures/task-review.1.0.json
- ../../examples/agentic-a2ui-app/src/features/agentic/reference-agent.ts
- ../../examples/agentic-a2ui-app/src/features/agentic/reference-surfaces.test.ts
- ../../examples/agentic-a2ui-app/src/features/agentic/reference-surfaces.ts
- ../../examples/agentic-a2ui-app/src/features/agentic/runtime.ts
- ../../examples/agentic-a2ui/README.md
- ../../examples/agentic-a2ui/package.json
- ../../examples/agentic-a2ui/src/agent/agent-client.ts
- ../../examples/agentic-a2ui/src/agent/agent-flows.ts
- ../../examples/agentic-a2ui/src/agent/surface-messages.ts
- ../../examples/agentic-a2ui/src/pages/agent-console-page.tsx
- ../../examples/agentic-a2ui/tests/golden/surface-task-sync.json
- ../../examples/agui-activity-lab/README.md
- ../../examples/agui-activity-lab/package.json
- ../../examples/agui-activity-lab/server/events.ts
- ../../examples/coverage.json
