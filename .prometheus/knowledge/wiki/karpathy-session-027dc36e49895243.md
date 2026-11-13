---
type: SessionRecord
id: karpathy-session-027dc36e49895243
title: Karpathy session 027dc36e4989
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-13T01:02:33.705566+00:00
created_at: 2026-11-13T01:02:33.705566+00:00
updated_at: 2026-11-13T01:02:33.705566+00:00
revision: 0
---

## Delta

Run 4 found a real bug in the package, not the setup. It's fixed, and the full acceptance run has started again.

**What passed:** steps 1–7, including the package-contracts check (UPG-15). That covers:
- the strict type-checking consumers
- zod 4.6.7 via `zod/v3`
- the control that must fail with TS2835

**What failed:** step 8, `verify:a2ui-v1`, the first time it has actually run. Four of its nine scenarios passed (UPG-2, 5, 6, 8); five failed (UPG-1, 4, 7, 13, 17).

**Cause:** creating a 1.0 surface worked, but every later 1.0 message on that surface was refused as if it were v0.9.1. A helper I wrote this phase, `isV1Surface`, expected the official model to store the version as `"v1.0"`, but it stores `"1.0"`. Before each batch the runtime re-checks existing surfaces, so held 1.0 surfaces were rebuilt as v0.9.1 and their next update failed. In practice that would have broken every real 1.0 surface after its first message.

The round-1 review "fix" to surface-error forwarding came from the same wrong code comment. My original check there was right, and the corrected helper now covers both.

**Fix:** `isV1Surface` accepts both `1.0` and `v1.0`. After rebuilding, a direct check confirmed that create, update and a mixed batch all succeed. The UPG-7 and UPG-17 failures were agent-function timeouts. I expect the same bug caused them, because the test page answers those calls by updating the affected surfaces, but I haven't confirmed that yet.

**Now:** run 4 is written up in its evidence folder. Because the package changed, the rerun covers all 14 steps; it's the fourth of the 10 repair attempts the contract allows. Nothing is published or committed.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-13T01:02:17.698721Z
- Project: /Volumes/T7/Projects/prometheus/prometheus-entity-management

## Changed Paths

- No changed paths detected.
