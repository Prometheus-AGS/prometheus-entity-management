# Refinement log

## Iteration 1 — 2026-08-29

- Restored the accepted ui-spec and packed task-11 evidence.
- Confirmed Impeccable is unavailable; loaded Anthropic frontend-design,
  Vercel React best practices, and freshly fetched Vercel web-interface rules
  in the required remaining order.
- Inspected retained desktop and responsive 500-event screenshots.
- Corrected tab-count separation, secondary-control hover feedback,
  touch-action handling, tabular telemetry, and unconditional select autofocus.
- Replaced the old event-bus-only public guide with the optional React
  inspector contract across package/root README, Docusaurus, examples, package
  chooser generation, changelog, skills, and public API guidance.
- Expanded the React runtime ledger from the root only to `.`, `./devtools`,
  and `./devtools/auto`.
- The first generated API run exposed 34 undocumented stable exports. Added
  source comments and an explicit generator workaround for TypeDoc 0.28
  dropping comments from named multi-entry re-exports. The corrected generator
  passed without expanding the undocumented baseline.
- Retained the ui-spec's non-waivable 12-developer usability criterion as an
  unresolved blocking constraint; no participant record was discovered.

## Iteration 2 — 2026-08-29

- The first isolated `k3` review blocked on a truthful release defect: the
  documentation paired unreleased inspector imports with npm `3.0.5` even
  though that already-published tarball does not contain the subpaths.
- Marked every public inspector guide as repository/unreleased until the next
  minor release and replaced the manual changelog entry with a Changesets
  minor-release record.
- Audited every `library-exports.json` reader. The React ledger verifier and
  API generator already accepted entry-keyed data; the Flint contract verifier
  was the one array-only consumer and now flattens all entry arrays.
- Replaced global frozen TypeDoc fallback prose with package-scoped recovery of
  the actual nearest source JSDoc; deleting source documentation now fails the
  policy.
- Aligned the package Next.js snippet with the retained unmount guard.
- Corrected the packed verifier so `dirtyTaskFiles` is measured over the
  production/package/browser-gate scope rather than hardcoded `true`.
