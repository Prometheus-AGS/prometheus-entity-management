# Execution — phase-v4-a2ui-runtime-hardening

**Dispatched:** 2026-10-28 · **Backend:** `openspec` (changes under `openspec/changes/a2ui-*`) · **Task driver:** `/kbd-apply` (owns `begin-task`/`end-task` and all canonical completion updates)
**Scope:** 8 changes, 46 tasks, registered in the runtime (`tasks.json` is a projection-derived coverage file). Execute stays **active** until the completion checklist in `/kbd-execute` is satisfied.

## Authority and references

- Plan: `plan.md` revision 3 (Task model assignments table, keyed by phase path, change ID and task ID).
- Adopted contract: `adopted-contract.json`, digest `22d8555a087078b1a8f70b26924c88a960d5a50a99c5e9ae538b90a8b1c82e40`, plan revision 10, decision `contract-adoption-phase-v4-a2ui-runtime-hardening-22d8555a`. Scenarios `AUI-1..14`; run owner `a2ui-hardening-acceptance#7`. Its gate commands are still BLOCKED-UNTIL-AUTHORED, so a signed amendment is required once the scenarios are authored.
- Method context: `method-context.md` in this directory.
- Readiness gate: READY on the adopted contract.

## Process note (disclosed)

The Execute stage was entered before the execute stage gate passed: the gate blocked on a missing handoff identity and my command did not stop on it. The cause was fixed afterwards by rewriting the plan handoff with the adopted contract's identity (the documented remediation); the gate now passes. The stage entry is append-only in the runtime and was not and cannot be undone.

## Dispatch contract

1. **Order (single writer on `runtime.ts` and `v1-compat.ts`):** `a2ui-release-status-reconcile`, `a2ui-webcore-node-probe`, `a2ui-runtime-limits`, `a2ui-activity-idempotency`, `a2ui-versioned-deltas`, `a2ui-action-ids`, `a2ui-headless-export` (only on a probe `go` and the operator's D2), `a2ui-hardening-acceptance`.
2. **Implementation first.** No unit, isolated, mock-backed or partial tests are written or run, and no verification builds, during implementation. Narrow compiler checks are allowed only to resolve a concrete uncertainty and are not evidence. Test authoring and the single integration run happen in `a2ui-hardening-acceptance#6` and `#7`, after all production tasks are complete and wired.
3. **Gate-derived source constraints (changes 4, 5, 6, 7):** source under `official/`, `react/`, `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl`; `runtime.ts` must not contain `getState(`.
4. **Trust boundary:** agent-generated UI arriving at the runtime. Every new path goes through the catalog and component allowlist and the runtime limits. Never log secrets.
5. **Hard stops, no operator approval assumed:** creating or pushing the `v4.2.0` tag, any publish, any commit or push, editing `release/npm-registry-status.json` values that `npm view` does not report, and any change outside `packages/a2ui-react`, the three bridge documents, the release metadata and the new `examples/agui-activity-lab` package named in the plan.
6. **Builds:** `refresh:exports` runs once, scoped, in `a2ui-hardening-acceptance#5`; one machine-wide build at a time.
7. **Claude decisions still awaiting the operator's explicit confirmation** (work that depends on them proceeds under the operator's "go ahead" but stays flagged): the new example package, emission of action envelopes for executed v0.9.1 actions, the Flutter-contract documentation section, and reconciling the existing bridge-gate expectations at the final boundary.

## Task model dispatch

Recheck result, 2026-10-28: the native Agent tool exposes the session's model family; the `liter-llm` binary is installed at `/usr/local/bin/liter-llm` but its MCP server failed to connect at session start, so **no external route is verified**. Every assignment in `plan.md` therefore runs natively on the model named in its row, with capability evidence still weak and unverified. No row has been deliberately substituted. A row whose named model turns out to be unavailable at dispatch is recorded here before running with a different one.

| Row group | Native model and effort |
|---|---|
| Release metadata, docs, ledgers (profile M) | Haiku 5.5, low |
| Well-specified implementation (profile I) | Sonnet 5.5, medium |
| Design-sensitive runtime logic (profile D) | Opus 5.5, high |
| Final independent review (profile R) | Fable 5.1, high, a different model from every producer |

Worker handoff for every task: scope = the task, working directory = repo root, tools = Read/Edit/Bash/Grep, result returned to the active `kbd-apply` driver.

## Recalled lessons

`prior-context.md` holds two lead-view entries, both summaries of this phase's own earlier stages (assess and plan): no external lesson constrains the work beyond what the plan already states.

## Completion

Not complete. Pending: all 46 tasks, then the single production-path integration gate, one cumulative artifact-only review, and `kbd-apply verify` and `archive` for each change. Evidence, certification and publication stay independent of the implementation counter.
