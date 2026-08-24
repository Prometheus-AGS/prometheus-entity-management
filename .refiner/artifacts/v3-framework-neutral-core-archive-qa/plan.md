# Refinement plan

1. Cross-check the plan acceptance criteria, OpenSpec tasks, coverage entry, verification report, and release-impact record.
2. Re-run the packed framework-neutral verifier and inspect core/React ownership seams.
3. Parse all authoritative JSON reports and reject missing or empty coverage evidence.
4. Record constraint results, regressions, and the archive-versus-release decision.
5. Validate and persist the manifest, refinement log, and converged state.

The content report template was considered, but an HTML derivative is unnecessary for this headless archive gate: Markdown is the canonical reviewable evidence and no rendered UI claim is in scope.

