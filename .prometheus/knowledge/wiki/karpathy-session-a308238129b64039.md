---
type: SessionRecord
id: karpathy-session-a308238129b64039
title: Karpathy session a308238129b6
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-12T01:11:55.424143+00:00
created_at: 2026-11-12T01:11:55.424143+00:00
updated_at: 2026-11-12T01:11:55.424143+00:00
revision: 0
---

## Delta

The A2UI 1.0 research is back, and it settles the main question. **A2UI 1.0 is final**: the spec repo marked it "current" on 2026-11-06, five days ago, and it now lives at `a2ui-project/a2ui`. There's no git tag for it. The latest npm release is **`@a2ui/web_core` 0.15.0** (2026-11-02), which routes messages by their `version` field and has a native `/v1_0` path.

Our RC bridge doesn't match 1.0 final on the wire in at least six ways:
- **Version string:** we send `"v1.0"`; final uses `"1.0"`.
- **Function and response messages:** we use `callFunction` / `actionResponse`; final uses `callRendererFunction` / `agentFunctionResponse`. In the other direction, final defines `action` / `callAgentFunction` / `rendererFunctionResponse` / `error`.
- **Binding syntax:** final binds data with `{"@path"}` and calls functions with `{"@call"}`. Bare `path` objects are now treated as literal data.
- **Media type:** final uses `application/a2ui+json`; the old form was `application/json+a2ui`.
- **A2A extension:** the official URI is `https://a2ui.org/a2a-extension/a2ui/v1.0`. Ours is a custom URI on v0.9.1.
- **Theme:** `theme` is removed in final; catalogs now need `protocolVersion: "1.0"`.

There's also a **moving-target risk**. A further envelope change (`@catalogId`, `@accessibility`, …) merged today and isn't in any npm release yet.

I'm still waiting on the AG-UI/A2A research before writing the assessment.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-12T01:11:53.799748Z
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
- .prometheus/session-log.md
- .kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/
