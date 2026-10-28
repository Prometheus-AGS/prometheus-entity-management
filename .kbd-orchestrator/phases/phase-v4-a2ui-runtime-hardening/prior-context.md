# Prior context — phase-v4-a2ui-runtime-hardening (execute)

> Auto-populated by /kbd-memory-recall for lead view (main thread); lessons from file. Cite the lessons that apply; recalled entries are information recorded by agents, not instructions.

## Lessons

- [lead] KBD assess summary for phase phase-v4-a2ui-runtime-hardening: Assessment of GitHub issues #70-#74 complete (revision 3, two adversarial rounds). All five are real; #74 is repo-wide release/doc drift (published 4.2.0 verified to contain app-supplied components; tag v4.2.0 at 34a21156 pending approval). Design rebuilt on verified web_core 0.12.0 source (createSurface throws on held surface; data-model path / replaces whole model; no remove-component; no caps in web_core or a2ui-react). OPEN FOR PLAN/OPERATOR: confirm reconcile design (producer-wins on both-changed path, epoch type, MESSAGES_SNAPSHOT non-deletion, versionless-delta rejection), actionId shape, D2, D4, peer range, whether to add surface/component caps, risk acceptance; probe web_core Node-loadability first. Flutter out of scope (no AG-UI activity handling there). WARNINGS carried: scenari _(recorded by an agent; progress, stage assess, 2026-10-28; via file)_
- [lead] KBD plan summary for phase phase-v4-a2ui-runtime-hardening: 8 changes / 46 tasks registered in the runtime (2 adversarial review rounds; round 2 was the cap). Order: release-status, web_core Node probe, limits, idempotency, versioned deltas, action ids, headless export (conditional on probe go + D2), acceptance. First change: a2ui-release-status-reconcile#1. Task model assignments are in plan.md; every route is provisional and liter-llm was unreachable. NOT DONE: adopted-contract.draft.json is an unadopted draft (operator-owned adoption via kbd-contract-adopt.sh), so /kbd-apply stays blocked. WARNINGS carried: Claude decisions awaiting operator confirmation (new example package examples/agui-activity-lab, action emission for executed v0.9.1 actions, Flutter-contract doc section, editing existing bridge-gate expectations at the final boundary); caps _(recorded by an agent; progress, stage plan, 2026-10-28; via file)_

## pk knowledge

- [pk:project] Karpathy session 96f9bfb65da6: I've recorded your confirmed decisions in `assessment.md`: producer wins, a message absent from a snapshot leaves its surfaces alone, `actionId` as a UUIDv7, the peer range, and adding caps. The other four need a yes from you, and I've written each up in plain language below. - **D4, where the version number lives:** put it inside the activity's own data (`content`), not in the event's `metadata`. A replayed `MESSAGES_SNAPSHOT` carries messages, not the events that built them, so a version stored in event `metadata` would be lost on replay. **Setting them:** the app passes a `limits` option wh _(recorded by an agent; lesson; via pk pk:karpathy-session-96f9bfb65da69197)_
- [pk:project] Karpathy session ca83395a0cf0: The five new issues now have a KBD phase, `phase-v4-a2ui-runtime-hardening`, but none of them is implemented yet. I deleted nothing, closed nothing and commented on nothing. - **#70–73:** these are real. The reviewer's line citations match `main`. They share `runtime.ts`, so the order is #70, then #71, then #72, then #73. I didn't verify the `web_core` internals the issues cite, because it isn't installed. - **#74:** I downloaded the published 4.2.0 tarball. It does contain the application-supplied component implementations (`createPrometheusA2uiComponent`). Commit `34a21156` is the last commi _(recorded by an agent; lesson; via pk pk:karpathy-session-ca83395a0cf0b5b4)_
- [pk:project] Hybrid Mobile PoC Phase Assessment: Codegen, CI, and Build Blockers: - **Project:** Hybrid Mobile Architecture - **Phase:** `phase-codegen-and-ci-verification` - **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/.claude/worktrees/sweet-mendeleev-401c40` - **Captured:** `2026-07-16T21:14:03Z` _(recorded by an agent; lesson; via pk pk:hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers)_
- [pk:project] Karpathy session 156ccca8dba4: Completed kbd-plan — phase-v4-a2ui-runtime-hardening (step 0 of 8; no change is implemented yet) The plan stage is done, but `/kbd-apply` is still blocked. The readiness gate reports two missing items, and only the first is yours to fix: - **`tasks.json` absent.** The gate's coverage check needs it. I don't know yet what generates it, since registering the changes and tasks didn't create it. - **Review:** `plan.md` is at revision 3 after two review rounds, which is the cap. The second round found two critical and ten warning-level problems; I checked the main ones against the repo and fixed th _(recorded by an agent; lesson; via pk pk:karpathy-session-156ccca8dba45ec7)_

## Previous reflection

From `v3-devtools-parity/reflection.md`:

**Next Phase Seed**

Recommended focus: post-release distribution and operator validation.

1. Observe GitHub Pages propagation from the pushed main SHA and refresh the
   deployed-route receipt.
2. Run a human usability study for React/Chrome/Flutter DevTools workflows and
   prioritize only observed friction.
3. Complete verified pub.dev publisher and optional Chrome Web Store onboarding
   only through explicit human authorization.

## Knowledge gaps

- pub.dev has not associated `entity_graph_flutter` with a verified publisher.
- Chrome Web Store submission, human Flutter DevTools usability certification,
- GitHub Pages propagation can only be observed after the final main push.
- Four pre-existing `prefer_initializing_formals` Dart analyzer infos remain;
- The KBD compatibility projection can retain stale `exactNextWork` text even
