---
type: SessionRecord
id: karpathy-session-4437106dd057c74c
title: Karpathy session 4437106dd057
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-13T01:06:14.010246+00:00
created_at: 2026-11-13T01:06:14.010246+00:00
updated_at: 2026-11-13T01:06:14.010246+00:00
revision: 0
---

## Delta

The fix from run 4 worked: in run 5, eight of the nine A2UI 1.0 scenarios in step 8 (`verify:a2ui-v1`) passed, including UPG-7 and UPG-17. That confirms the version bug also caused their timeouts.

The last failure, in UPG-4, was another real bug in the package:
- **What broke:** a 1.0 surface naming the v0.9.1 catalog was refused with `CATALOG_ERROR`, as it should be. But the error reached the caller raw, not as this package's `PrometheusA2uiError` with code `protocol-error` and a `protocolCode`.
- **Why:** the runtime recognised official errors by checking whether the class name starts with `A2ui`. Minifiers rename classes, so in any minified production build (the test page's Vite build, or a consumer's app) official errors slipped past that check. Callers branching on `protocolCode`, as the migration guide tells them to, would have missed them.
- **Fix:** the check now also uses `instanceof` against the official `A2uiError` class, which is bundled into our package. The name check stays as a fallback, and nothing else in the source identifies errors by name.

The package type-checks and builds. I recorded run 5 in its evidence folder and the release design record, then started a full rerun, since the package changed. It's attempt 5 of the 10 the contract allows. Nothing is published or committed.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-13T01:06:05.166090Z
- Project: /Volumes/T7/Projects/prometheus/prometheus-entity-management

## Changed Paths

- No changed paths detected.
