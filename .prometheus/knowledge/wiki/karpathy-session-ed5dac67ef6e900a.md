---
type: SessionRecord
id: karpathy-session-ed5dac67ef6e900a
title: Karpathy session ed5dac67ef6e
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-12T12:39:22.404238+00:00
created_at: 2026-11-12T12:39:22.404238+00:00
updated_at: 2026-11-12T12:39:22.404238+00:00
revision: 0
---

## Delta

Production work is done: changes 1–9 of 11 are implemented. Nothing has been verified yet, by design: the project rules hold all checks for one boundary run after acceptance authoring. Nothing is committed.

## What changed

1. **0.15.0 baseline.**
   - `@a2ui/*` 0.15.0, with patches for web_core (zod/v3 and the #75 imports) and for `@a2ui/react`'s declarations.
   - The published `.d.ts` no longer import `@a2ui/*`, so #75 can't reach consumers.
   - `@a2ui/web_core` is now a devDependency, so consumers no longer install it or its zod 3.
   - The bundle grew 48%, mostly the Lit-based basic catalog.
2. **Native 1.0 surfaces.**
   - 1.0 messages go to the official processor's own 1.0 support, and a separate 1.0 catalog is built on upstream's.
   - `@`-keys are translated, and processor errors keep their A2UI code.
   - `runtime-core.ts` went from 925 to about 600 lines; the AG-UI transport moved out.
3. **Functions and actions.**
   - 1.0 function calls run in the official processor.
   - New `callAgentFunction(..., { writeTo })`.
   - The opt-in RC-input shim replaces the old bridge.
   - `dispose()` now rejects pending calls, and the `keysOf` carried finding is fixed.
4. **AG-UI `^1.0.0`.** This also fixed a real interop bug: the runtime threw on the A2UI middleware's progress and failure updates.
5. **A2A on the official extension.** SDK 1.3.0, the per-turn capability rule, and client actions through a deny-by-default handler.
6. **Chat stack on AG-UI 1.0.** Cancellation works, and messages live in the graph.
7. **Interrupt approvals** through the action policy, failing closed when no policy is installed.
8. **W5/W6 design records** (design only).
9. **All three examples on 1.0.** Pre-migration streams were recorded first as digested fixtures.

## Where I deviated from the plan

All of these are recorded in the change design docs:
- **No pre-fix reproduction of the abort bug.** I rewrote the hook before running the probe the plan asked for. The defect is cited from the old source only, so the boundary run is the only proof of the fix.
- **New `EntityInterruptApproval` component.** The plan said to extend `EntityApproval`, but that component is the graph-diff review, so interrupts got their own.
- **Two plan details were wrong.** The A2A gate is the per-turn capabilities, not activation alone. `callAgentFunction` is answered by `agentFunctionResponse`, not `rendererFunctionResponse`.
- **The A2A verifier rewrite moved to change 11.** Writing acceptance scripts belongs after production work under A-9.
- **W6 spike measurements weren't taken.**
- **Scoped type checks.** I ran a scoped typecheck twice and package builds three times to resolve concrete implementation questions; none of it counts as evidence.

## Amendment 2 needs your signature

My assessment claimed the middleware sends an `a2ui_recovery` activity. Version 0.0.16 doesn't; it sends a lifecycle update with `status: "failed"`. Together with the corrections above, that changes five scenario descriptions. Scope, budgets and exclusions are unchanged. The manifest is at `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/amendment-execution-findings-2.json`:

```bash
ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n prometheus-kbd-scope-amendment .kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/amendment-execution-findings-2.json
```

The contract file already holds the amended text. Until it's adopted, the readiness check reports the contract as changed since adoption. If you'd rather I not apply it, the previous bound copy is saved at `/private/tmp/claude-501/-Users-gqadonis--claude-spares-spare-WEopOs/4ff3f793-7152-40c8-a92e-a3092232bb8b/scratchpad/adopted-contract.bound-a33d62a7.json`.

**Still open:**
- The legacy browser spec from the previous phase still sends RC envelopes to the lab. It isn't part of this phase's acceptance run.
- I haven't verified whether the external-executor path forwards capability metadata to a remote agent.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-12T12:39:20.520962Z
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
- package.json
- packages/a2ui-react/README.md
- packages/a2ui-react/package.json
- packages/a2ui-react/src/ag-ui/index.ts
