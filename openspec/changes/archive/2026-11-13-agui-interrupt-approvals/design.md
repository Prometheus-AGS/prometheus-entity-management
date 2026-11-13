## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: W4.

## Decisions

Adopted operator decisions that bind this change: D4 (W4 in scope).

## Open design records

Recorded here during execution, before dependent code: Mapping of Draft interrupt outcome fields, isolated in one module.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: implementation (tasks 7.1–7.3, 2026-11-12)

- **7.1** `chat/interrupts.ts` is the only module that knows the Draft wire shapes (`readInterruptOutcome`,
  `toResumeInput`, `ChatInterrupt`, `ChatResumeEntry`, mirroring `@ag-ui/core` 1.0.4). The conversation store sets
  `runStatus: "interrupted"` and records the interrupts on `RUN_FINISHED` with an interrupt outcome;
  `decideInterrupt` collects decisions; once all are decided, `resume(entries, …)` starts the next run with
  `streamFactory(history, { signal, resume })` (`ChatStreamContext.resume`, in wire shape).
- **7.2** `useChatSession` returns `interrupts` and `resolveInterrupt(id, { approved, payload? })`:
  - deny → `cancelled` (`reason: "denied-by-user"`), no policy call;
  - approve → the interrupt is mapped to an action (`interruptToAction`, default
    `metadata["prometheus.action"] = { name, context }`, an object payload replacing the context:
    edit-before-approve) and decided by the installed `actionPolicy` (the A2UI action policy, and so the entity-graph
    policy when that is the one installed): `executed` → `resolved` with the approved values; `denied` →
    `cancelled` with the policy's reason and code;
  - fail closed: no `actionPolicy`, or an interrupt that maps to no action, resolves as `cancelled`;
  - `onInterruptDecision(interrupt, entry, decision?)` reports each one; the policy's own `onDecision` audits it.
  New presentational `EntityInterruptApproval` (approve, deny, JSON edit with validation) is rendered by
  `EntityChat` for each pending interrupt. **Naming deviation:** the plan said "add to `EntityApproval`"; that
  component is the graph-diff review and keeps that job, so interrupts got their own component.
- **7.3** `agui-interrupt-approvals` spec delta validated.
- Executing an approved action through the policy performs its effect in the local graph (for example an
  entity patch with the edited values); the agent then receives `resolved` with the same values in `resume[]`.
