# Verification: a2ui-hardening-acceptance

Every scenario is **PROPOSED, not adopted, not run.** Authoring owner `a2ui-hardening-acceptance#6`; run owner `a2ui-hardening-acceptance#7`. Statuses: PASS / FAIL / BLOCKED / NOT_EXERCISED.

## Shared declarations

| Field | Declaration |
|---|---|
| Source identity | `prometheus-entity-management` `main` plus this phase's changes at the candidate commit; built `examples/agui-activity-lab` |
| Production entry | A real Chromium page running the lab example, fed over SSE by the lab's AG-UI 1.0 producer, driving `PrometheusA2uiRuntime` through its hooks layer |
| Real collaborators | The lab producer process, a real browser, the real `@a2ui/web_core` 0.12.0 processor; for headless scenarios a real Node process |
| Isolation | Scratch ports chosen by the runner; no real credentials; the producer records envelopes in a scratch directory removed by the gate runner |
| Prerequisites | Playwright Chromium, pnpm 10.33 workspace install, all production tasks wired |
| Final local gate | One run at the completed-phase boundary; exact argv fixed when authored (`#6`). Never CI |
| Limitations | Chromium only; the producer is repo code, so AUI-5 and AUI-7 prove the runtime's behavior against our producer, not a third party's |

## Scenarios

| ID | Name | Oracle | Negative control |
|---|---|---|---|
| AUI-1 | Duplicate create activity is a no-op | held surface and typed input unchanged | same epoch and version with a different digest: first kept, fault reported |
| AUI-2 | Duplicate and out-of-order versioned updates | nothing already applied changes; typed input survives | stale version under a new `messageId` also ignored; versionless producers outside the guarantee |
| AUI-3 | `MESSAGES_SNAPSHOT` replay keeps surface and input | surface and input unchanged | snapshot omitting the activity does not delete the surface; redelivered `createSurface` after `deleteSurface` does not resurrect it |
| AUI-4 | Newer restatement applies as updates | unchanged producer values never overwrite typed input; final value follows producer-wins and the conflict is reported | surface omitted from the restatement survives |
| AUI-5 | Two concurrent streams, one activity | applied once, including the same surface version under two `messageId`s | same key, different digest: first kept |
| AUI-6 | Versioned delta, gap, refusal | ordered apply; gap or missing snapshot triggers resync; refused batch reports the validation error | delta introducing a component outside the allowlist is rejected, surface unchanged; versionless delta rejected |
| AUI-7 | Held-version report on reconnect | only the missing operations return | limitation above |
| AUI-8 | Distinct `actionId`s across contexts and reload | two contexts and a reload yield distinct ids at the producer; runtime retry reuses one | two distinct actions never share an id |
| AUI-9 | Envelope fidelity | the envelope the producer received from a real browser action for v0.9.1 and v1, with and without `sendDataModel` | missing data model when `sendDataModel` is set fails |
| AUI-10 | Export fixed point (conditional) | export → fresh runtime → export is identical, incl. v1 action responses | export losing `rootId` or `catalogId` fails |
| AUI-11 | Headless and React agree (conditional) | same accept and reject corpus | corpus includes allowlist and limit violations |
| AUI-12 | Unreachable components pruned (conditional) | absent from the export | a reachable component is never pruned |
| AUI-13 | Release records match the registry (**delivery-only**) | status files, both changelogs and bridge pins agree with `npm view` output | a stale pin fails; the tag part is NOT_EXERCISED until approved |
| AUI-14 | Stale-action rejection operations are applied | returned operations applied | rejection with no operations triggers resync |
| AUI-15 | A failing action response does not undo its batch (review finding 1) | the batch's surfaces are applied and its version held; a redelivery is a no-op | the failing write is reported as a producer fault, not thrown |
| AUI-16 | Oversize delta rejected before buffering; a waiting delta is held once (finding 2) | limit fault for the oversize delta; one resync for three deliveries | the oversize delta is not buffered |
| AUI-17 | Component bytes cap (finding 3) | the call that grows past the cap is rejected whole | earlier calls under the cap are accepted |
| AUI-18 | Unreadable data keys do not wedge updates (finding 4) | later updates apply and nothing is refused | the same updates apply without the key |
| AUI-19 | Delete and create in one activity restores data (finding 5) | the recreated surface shows the restated data | n/a |

Cross-cutting negative control (the trust boundary): an activity that exceeds a configured limit or names a component outside the allowlist is rejected whole and leaves the surface unchanged, on every path.
