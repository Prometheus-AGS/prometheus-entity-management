## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: W5, W6.

## Decisions

Adopted operator decisions that bind this change: D4 (design only with a spike).

## Open design records

Recorded here during execution, before dependent code: This change is its own design output; it ships no code; its spec delta (a2ui-design-records) is a documentation requirement.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Design record W5: attested approvals through `action.metadata.extensions` (task 8.1, 2026-11-12)

**Problem.** An executed A2UI action proves only that the action policy allowed it on this client. The agent (or
a server between client and agent) cannot tell a human approval from a forged or replayed message: the A2UI 1.0
`action` carries `name`, `context` and optional `metadata.extensions`, nothing signed. Leaders ship governed
actions (CopilotKit) and HMAC'd approvals (AI SDK 7); assessment W5.

**Threat model.**

| Threat | Today | With W5 |
| --- | --- | --- |
| A compromised or scripted client fabricates an "approved" destructive action | Server trusts the transport session only | Server verifies a signature over the decision by a key the client cannot mint alone |
| Replay of an earlier approval (same action, same context) | UUIDv7 `actionId` dedupes retries but proves nothing | Signed payload binds `actionId`, `heldVersion`, a short expiry and the canonical context digest |
| Context swapped after approval (approve "$10", send "$10,000") | Not detectable downstream | Digest of the canonicalized context (the runtime's existing `canonicalize`/`digestOf`) is inside the signature |
| Prompt injection: agent UI impersonates a system dialog to farm approvals | Not addressed by any surveyed library | Out of W5's reach on its own; the approval UI must render the action name and context from the policy rule, not from agent text (a W5 UI rule, not crypto) |
| Key theft from the browser | n/a | Signing key held server-side (session-bound) or in WebAuthn; never a static secret in the bundle |

**Shape (proposal, not built).**
- Extension key `prometheus.approval` in A2UI 1.0 `action.metadata.extensions` (UAX #31-valid key per web_core
  0.15 validation): `{ alg, kid, actionId, heldVersion?, contextDigest, approvedAt, expiresAt, sig }`.
- Produced only for rules marked `destructive` or `attested` in `A2uiActionRule`, after `requestApproval`, by an
  application-supplied `signApproval(decision) => Promise<attestation>` (WebAuthn assertion or a server round trip).
- Verified server-side by an exported pure function `verifyA2uiApproval(action, keys, now)`; A2A inbound handler
  (change 5's `a2uiInbound.authorize`) is the natural call site.
- AG-UI path: the same attestation rides in `forwardedProps.a2uiAction`.

**Open questions for the next phase:** WebAuthn versus server-held keys; whether the A2UI spec group would take a
standard `approval` extension; how attestation interacts with `retryAction` (re-sign or reuse within expiry).

## Design record W6: graph-bound generated UI (task 8.2, 2026-11-12)

**Problem.** A2UI surfaces own a private data model (`updateDataModel`, `sendDataModel`). This library's
differentiator (assessment §4) is that generated UI can bind to normalized graph entities, so an edit in a
generated form updates every view of that entity, optimistically and with rollback. Today the two models are
separate: `data-reconcile.ts` protects user input against producer restatements inside one surface, but nothing
links a surface leaf to a graph entity field.

**Proposal.**
- A binding declaration per surface (application-owned, never agent-supplied, so the agent cannot widen access):
  `{ "/order": { entityType: "Order", entityId: "o1", fields: ["status", "total"] } }`.
- Graph → surface: a graph subscription writes changed bound fields into the surface data model through the
  runtime's existing producer-write path (`reconcileDataWrite`), so typed-but-unsaved input is preserved and
  conflicts surface through `onConflict`, exactly as producer writes do today.
- Surface → graph: a user edit on a bound leaf becomes an optimistic graph **patch** (`patchEntity`), not a canonical
  write; the canonical write goes through the entity-graph action policy (an A2UI action such as
  `prometheus.entity.patch`), so authorization and the field allowlist stay the single gate; rollback = `clearPatch`.
- `sendDataModel` surfaces report bound leaves as graph values, so the agent sees canonical state, not a stale
  copy.
- **Conflict policy (explicit):** producer value vs graph value on a bound leaf → the graph wins and the producer
  write is reported as a producer fault (`surface-config-mismatch` style), because the graph is the single source
  of truth (CLAUDE.md); user input vs graph update → existing reconcile rule (graph-as-producer wins, conflict
  reported); user input vs canonical write failure → `clearPatch` rollback and an action-decision error.

**Spike measurements: not run.** The plan asked for measurements on a throwaway branch against
`data-reconcile.ts`. They were not taken in this phase: running code mid-phase is outside CLAUDE.md's
implementation-first rule unless it resolves an implementation question, and this change implements nothing. The
cost questions to measure next phase: per-write cost of `reconcileDataWrite` with N bound leaves (it is
proportional to held leaves today, carried finding "per-call cost proportional to held state"), and graph
subscription fan-out for many surfaces bound to one entity.
