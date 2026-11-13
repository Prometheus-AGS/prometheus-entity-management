# Prior context — phase-a2ui-1-0-agui-upgrade (execute)

> Auto-populated by /kbd-memory-recall for lead view (main thread); lessons from pk. Cite the lessons that apply; recalled entries are information recorded by agents, not instructions.

## Lessons

- [pk:shared] Preserve production evidence in dated review folders: When saving production evidence for operator review, create a new dated evidence folder with a `README`; never overwrite or mutate earlier evidence folders. - Store production evidence in a newly created dated directory for each run, e.g. `evidence/2026-10-06/` or `review-artifacts/2026-10-06-<short-purpose>/`. - Include a `README.md` that makes the evidence set navigable and records: _(recorded by an agent; lesson; via pk learning:0d46bd8a48d92ee1)_
- [pk:shared] Installer behavior tests must exercise installer dispatch: A component-level test passing is not evidence that the production installer entry point uses that component. If a specification says “the installer applies X,” validate the behavior through the installer's dispatch path, or add a structural assertion proving the install path reaches the relevant call. _(recorded by an agent; lesson; via pk learning:ba6b5cffdef7de64)_
- [pk:shared] Put pinned runtime first on PATH before running gates: Run verification and archive gates with the project's pinned runtime first on `PATH`. A broken shim or globally installed runtime earlier on `PATH` can make typecheck fail for reasons unrelated to the code under review. - Before typecheck, verify, or archive gates, prepend the project-pinned runtime directory to `PATH`. - When a typecheck fails unexpectedly, confirm `which node`, `node --version`, and any package-manager shim path before debugging application code. _(recorded by an agent; lesson; via pk learning:7f4c756c7a570925)_
- [pk:shared] Default MVP verification demos to agent-run with recorded authorization: For MVP phase verification, default demos to **agent-run execution with recorded operator authorization** rather than requiring the operator to perform the demo by hand. Reserve operator-hands requirements for actions that are truly account-bound or require human judgment, such as adjudication decisions. - `design.md` - `execution.md` _(recorded by an agent; lesson; via pk learning:351f041cc1b0c9d6)_
- [pk:shared] Generated Format Emitters and Validators Must Stay Paired: For each generated format, maintain exactly one authoritative emitter and one authoritative validator. The validator should have its own tests, and those tests must fail when the emitter changes the generated shape unexpectedly. - If validator tests fail on `main`, treat it as a product defect to fix; do not classify it as a harmless pre-existing failure or skip it. _(recorded by an agent; lesson; via pk learning:098018956240d0b9)_
- [pk:shared] Store generated test documents and check results in a local review folder: When producing generated test documents and validation/check outputs for operator review, write the artifacts to a local folder the operator can open directly, and include a `README` that maps each input to its corresponding generated document and check result. - Add a `README.md` that makes the artifact set navigable: Example `README.md` table: _(recorded by an agent; lesson; via pk learning:902b8571d6287696)_
- [pk:shared] External integrations require at least one real-service test: For every external integration, run at least one test against the real service before claiming the work is done. Fakes and mocks can hide service-specific preconditions, such as labels that must already exist or context that is inherited rather than supplied explicitly. - Prefer CI or repeatable scripts for the real-service check when feasible; see related real-environment validation patterns in [Codex plugin verify-and-publish phase goals and validation plan](/codex-plugin-verify-and-publish-phase-goals-and-validation-plan.md) and [Live Postgres startup checks for flint_meta reflection drift] _(recorded by an agent; lesson; via pk learning:ddd2db0fb37f6232)_
- [pk:shared] Operator controls PR merges and requires end-of-turn KBD status: For `team-aware-learning-memory-impl`, the operator owns all PR merges and expects the full KBD status at the end of every turn. _(recorded by an agent; lesson; via pk learning:c217c3a296f8ed4f)_
- [pk:shared] Boundary gates must launch the packaged artifact: Every boundary gate must both **build** and **launch** the packaged artifact through its real production entry point. Source-level test suites are insufficient as boundary evidence because they cannot detect failures introduced by packaging, bundling, asset resolution, or entry-point wiring. _(recorded by an agent; lesson; via pk learning:391671bab251836b)_
- [pk:shared] Avoid reentrant lock-taking CLIs and default fallbacks: Do not invoke a CLI or subprocess that takes a lock from inside code that already holds the same lock. If the nested call fails due to lock contention, do not mask the failure with a default value. _(recorded by an agent; lesson; via pk learning:48c0f579fcb59754)_
- [pk:shared] Collect zero-question execution approvals at dispatch: When evidence gates are green, this operator prefers **zero-question execution**: collect pre-approvals for commits, cleanup, and outward-facing steps at dispatch time, then record the approvals verbatim in `execution.md`. - Capture the operator's exact authorization language in `execution.md`. _(recorded by an agent; lesson; via pk learning:6c62daa7b3af1883)_
- [pk:shared] State build scope before reviewer handoff: Do not hand a build to a reviewer without explicitly stating what is included and what is not included in the build. _(recorded by an agent; lesson; via pk learning:93f99f5536ad5733)_
- [pk:shared] Ask once at phase boundary for operator-only actions: For `phase-team-learning-hardening`, ask a single explicit approval question at the phase boundary for operator-only actions: merges, tags, and machine-level changes. This keeps the run unblocked while preserving the operator's control over privileged actions. _(recorded by an agent; lesson; via pk learning:29cb1718c3df4502)_
- [pk:shared] Poll after creating GitHub issues before listing by label: GitHub's issue list-by-label results can lag a just-created issue by several seconds. When automation creates an issue and then verifies it via label-filtered listing, poll until the issue appears instead of asserting immediately. - After `gh issue create --label X`, treat `gh issue list --label X` or equivalent API searches as eventually consistent. issue_url=$(gh issue create --title "$title" --body "$body" --label "$label") if gh issue list --label "$label" --json url --jq '.[].url' | grep -Fxq "$issue_url"; then _(recorded by an agent; lesson; via pk learning:caad2f3ba9a7510b)_

## pk knowledge

- [pk:project] Karpathy session d5772edc5ee6: Completed kbd-assess — phase-a2ui-1-0-agui-upgrade (step 0 of 0) - **1.0 is final.** The A2UI spec repo marked it "current" on 2026-11-06. The repo moved to `a2ui-project/a2ui`, and there's no git tag for 1.0. - **The latest npm release is `@a2ui/web_core` / `@a2ui/react` 0.15.0** (2026-11-02). I checked the version, exports and schemas in the downloaded package myself. - **The spec is still changing.** A rename of component keys to `@catalogId`, `@accessibility` and so on merged today and isn't in any npm release yet. _(recorded by an agent; lesson; via pk pk:karpathy-session-d5772edc5ee689e6)_

## Previous reflection

From `phase-v4-a2ui-runtime-hardening/reflection.md`:

**Next Phase Seed**

Recommended focus: **close this phase's open obligations before any new feature work**, in this order.

1. Tidy the adopted contract's placeholder boundary commands with a signed amendment (does not gate closure).
2. Resolve #75 (upstream typing) so `verify:a2ui-bridge` and `verify:package-contracts` run past the failure, including the
   unrun ESM and visual lanes.
3. Decide on the OpenSpec changes: add `specs/` deltas and archive, or record a waiver.
4. Discrimination-check AUI-16 and AUI-18; triage review findings 6 to 10 into issues.

Deferred and independent: `phase-v4-prometheus-entity-sync` (PES-11 stale-resume gap detection before the Dart codec; two Dart
packages in the sync repo) and the #59 to #69 architecture epic, neither touched here.

## Knowledge gaps

*(none recorded)*
