# Adversarial review resolution

## Round 1 disposition

- **CRITICAL — premature KBD completion projection:** accepted as a real
  sequencing defect. The signed control plane rejected a transition from
  `Complete` back to `InProgress` with `409 Conflict`, so no generated KBD file
  was hand-edited. Signed plan revision 9 plus phase activation revision 341
  make `/kbd-apply v3-devtools-time-travel` the executable next command. The
  post-gate sequence explicitly requires signed `end-task` canonical task
  completion and unified-position refresh before verify/archive. The legacy
  projection defect is indexed at phase scope and in a postmortem. Archive
  remains blocked pending a clean isolated verdict.
- **WARNING — stale `next_task_pending`:** accepted as part of the same terminal
  projection defect. It cannot be corrected independently through the signed
  transition API. The executable task and retained review evidence remain the
  authoritative record; generated projections are preserved as emitted.
- **WARNING — packed fixture used text stdout:** fixed. Tar output is now
  captured as a raw buffer, compared byte-for-byte, and checked against the
  source SHA-256. The complete assembled gate passed after the correction.
- **WARNING — refiner decision chronology:** corrected without rewriting the
  first immutable history snapshot. Current state records convergence after
  reflect; helper-produced checkpoint files are explicitly classified as
  final-state mirrors, not point-in-time chronology.
- **WARNING — unrelated Prometheus memory duplication:** out of scope and not
  staged. Those user-owned files are preserved unchanged by this task.
- **SUGGESTION — JSON newline termination:** fixed for the current artifact,
  corrected snapshot, and registry. The first immutable snapshot retains its
  original helper bytes, and the validation claim now states that scope.
- **SUGGESTION — fixture store-ID coupling:** clarified in both fixture README
  files. `time-a` is part of the conformance envelope and must be attached or
  replaced consistently before import.

## Round 2 disposition

- **CRITICAL — false terminal projection lacks a signed corrective record:**
  fixed through signed plan revision 8 and the phase-level evidence index.
  Runtime revision 339 now makes task 10's review, sycophancy, verification, and
  archive the exact next work even though the terminal change itself cannot be
  reopened.
- **WARNING — first history snapshot was retroactively rewritten:** fixed. Its
  original decision timestamp and helper-generated newline behavior are
  restored. Corrections remain in later immutable snapshots.
- **WARNING — checkpoint chronology claim:** fixed by restoring current
  checkpoint content and explicitly classifying helper checkpoints as
  final-state mirrors rather than point-in-time audit events.
- **SUGGESTION — stale manifest generation timestamp:** fixed in the current
  artifact at its actual correction time and retained by the latest snapshot.

## Round 3 gate

Round 3 must independently inspect the corrected artifact and return no
blocking finding. The change will be archived only after that verdict passes
the strict anti-sycophancy screen.

## Round 3 disposition

- **CRITICAL — post-gate projection handling absent:** fixed through signed
  plan revision 9 and phase activation revision 341. The retained control-plane
  receipt explicitly sequences review, sycophancy, signed canonical
  `end-task`, verify, and archive. Installed driver inspection proves the
  authoritative-runtime branch does not rewrite the legacy compatibility
  ledger; that observed defect is recorded rather than claimed fixed.
- **WARNING — checkpoint wording remained contradictory:** fixed. Checkpoint
  files are now identified as stale mirrors of the superseded first write;
  `state.json` is the sole refinement chronology authority.
- **WARNING — phase projections lag signed revision:** recorded in the
  phase-level evidence index and correction receipt. Canonical task 10 is
  `in_progress` at revision 341; legacy projections remain at revision 338
  until signed `end-task` regeneration.
- **SUGGESTION — prose exact command:** fixed. The runtime field is now the
  executable `/kbd-apply v3-devtools-time-travel`.

## Round 4 gate

Round 4 must return no blocking finding and pass the strict anti-sycophancy
screen before the signed post-gate sequence runs.

## Round 4 disposition

- **CRITICAL — incomplete history in review manifest:** fixed. The review scope
  includes the complete 20:20:25, 20:26:47, and 20:32:27 snapshots cited by
  retained findings; recursive packet JSON remains excluded.
- **WARNING — unproven projection regeneration:** corrected. Installed
  `kbd-apply` inspection shows `sync_progress` intentionally returns without
  rewriting `progress.json` under the authoritative runtime. The phase
  postmortem records the persistent compatibility-projection defect; no repair
  is asserted.
- **SUGGESTION — ambiguous sycophancy file:** fixed with a Round 1 header. The
  final passing review receives a separately named screen result.
- **SUGGESTION — null active task pointer:** explained at phase evidence scope
  and in the machine receipt as a consequence of phase-level activation.

## Round 5 gate

Round 5 must return no blocking finding and pass its separately recorded strict
anti-sycophancy screen before signed canonical completion and archive.

## Round 5 disposition

- **CRITICAL — stale projection can drive false archive:** fixed with
  `verify-kbd-archive-guard.mjs`, installed as task 10's native verify command.
  It reads canonical runtime state, refuses open gated tasks, requires final
  review and sycophancy files, and accepts a stale compatibility ledger only
  when the machine correction receipt and postmortem are present. A real
  pre-gate invocation refused canonical open task 10 with exit 1.
- **WARNING — JSON package subpath lacked ledger evidence:** fixed with
  `core-package-subpaths.json` and an exact package-export-map comparison in
  `verify-skills-exports.mjs`; both fixture subpaths pass.
- **WARNING — refiner checkpoint authority only prose:** fixed with
  `state.json.checkpoint_authority`, which identifies `state.json` as the
  sole chronology authority and checkpoints as stale first-write mirrors.
- **SUGGESTION — files.txt looked exhaustive:** clarified at phase evidence
  scope as the review packet's directory/path scope, not a commit inventory.

## Round 6 gate

Round 6 must return no blocking finding and pass its separately recorded strict
anti-sycophancy screen before signed canonical completion, positive guard
verification, and archive.

## Round 6 disposition

- **CRITICAL — refiner report missing from diff:** fixed by force-adding the
  gitignored current and historical `dist/archive-qa-report.md` files declared
  by their manifests.
- **WARNING — sycophancy substring check:** replaced with a JSON receipt that
  requires exact target/phase, `PASS`, `strict`, score below 0.4, and SHA-256
  bindings to the retained final packet and findings.
- **WARNING — package ledger compared keys only:** fixed. The ledger maps every
  JSON subpath to its expected target; verification compares sorted key/target
  pairs and requires each target file to exist.
- **WARNING — defect-record path traversal:** fixed by requiring the exact
  sanctioned relative postmortem path.
- **WARNING — unexecuted browser preview marked pass:** fixed by removing
  preview-status and browser-diagnostic fields; content validation notes remain.

## Round 7 gate

Round 7 must return no blocking finding and pass its cryptographically bound
strict anti-sycophancy receipt before signed completion, positive guard
verification, and archive.

## Round 7 disposition

- **WARNING — current position embeds stale change summary:** recorded in the
  phase evidence index, machine correction receipt, and postmortem.
  `current-waypoint.json` plus canonical status remain the only readiness
  authorities.
- **WARNING — final artifacts absent before finalization:** the guard now checks
  all three paths first and emits a single explicit absence diagnostic.
  `files.txt` documents them as reserved final outputs.
- **WARNING — checkpoint stale marker not colocated:** fixed inside each of the
  three affected current checkpoint files with `stale: true` and
  `superseded_by: ../state.json`.
- **SUGGESTION — review not bound to current worktree:** retained as a residual
  limitation. The final packet/findings/sycophancy hashes bind the isolated
  review artifacts; post-review mutations are limited to those final evidence
  files and signed KBD task/position/archive transitions.

## Round 8 gate

Round 8 must return no blocking finding and pass its cryptographically bound
strict anti-sycophancy receipt before signed completion, positive guard
verification, and archive.

## Round 8 disposition

- **WARNING — post-termination refiner amendments lacked an iteration:** fixed
  with explicit iteration 2 in state, reflection, and refinement log.
- **WARNING — checkpoint marker edit lacked a timestamp:** fixed with
  `marker_inserted_at: 2026-08-29T21:11:03Z` in each affected current
  checkpoint.
- **WARNING — suspected double package prefix:** resolved by retained registry
  evidence. The selected core directory is `entity-graph-core`, and the scoped
  verifier passed all runtime and JSON subpath/target checks.
- **SUGGESTION — malformed final artifacts produced raw errors:** fixed by
  parsing and validating packet/findings shape before using their data.

## Round 9 gate

Round 9 must return no blocking finding and pass its cryptographically bound
strict anti-sycophancy receipt before signed completion, positive guard
verification, and archive.

## Round 9 disposition

- **WARNING — immutable history retains preview PASS fields:** the historical
  bytes remain unchanged; `supersessions.json` machine-marks those three
  manifest validation blocks as superseded by the current manifest.
- **WARNING — isolation provenance not guarded:** fixed. Final findings must
  report distinct judge/producer models, `verified-distinct`, and a
  `rest-gateway:` isolation mode.
- **WARNING — verify ordering was prose-only:** task 10 now explicitly declares
  its native verify command post-`end-task` only.
- **WARNING — review/current-state hash limitation:** retained as an explicit
  machine-readable residual in `control-plane-correction.json`, with the only
  permitted post-review mutation classes named.
- **SUGGESTION — review JSON newlines:** normalized across all retained
  findings files.

## Round 10 gate

Round 10 must return no blocking finding and pass its cryptographically bound
strict anti-sycophancy receipt before signed completion, positive guard
verification, and archive.
