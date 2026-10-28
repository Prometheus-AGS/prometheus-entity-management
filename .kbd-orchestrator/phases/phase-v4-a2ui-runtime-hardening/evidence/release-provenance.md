# Release provenance — @prometheus-ags/a2ui-react 4.2.0

Recorded by `a2ui-release-status-reconcile#1` on 2026-10-28. Every line below was observed in this session; nothing is carried over from the issue text.

| Fact | Observation | How observed |
|---|---|---|
| Registry `latest` | 4.2.0 | `npm view @prometheus-ags/a2ui-react dist-tags.latest`, run from outside the repo root (the repo root rejects npm via devEngines) |
| Publish time of 4.2.0 | 2026-10-10T00:18:33.275Z | `npm view @prometheus-ags/a2ui-react time --json` |
| Tarball `gitHead` | empty (manual publish, no provenance) | `npm view @prometheus-ags/a2ui-react@4.2.0 gitHead` |
| Application-supplied component implementations in 4.2.0 | **Yes.** `createPrometheusA2uiComponent` is present in `dist/index.d.ts` and `dist/index.mjs` of the published tarball | unpacked `npm pack @prometheus-ags/a2ui-react@4.2.0` in a scratch directory outside the repo, then searched for the symbol |
| Last commit touching the published packages | `34a211563fe7f06118996a40cc398c4c3af953ef` (2026-10-09T17:53:18-05:00), "feat(a2ui-react): let applications supply catalog component implementations" | `git log -1 -- packages/a2ui-react packages/entity-graph-core packages/prometheus-entity-management package.json` |
| "Prepare 4.2.0" commit | `580997b5930322390651896ae8865697538a14cb` (2026-10-09T08:31:06-05:00), before the feature commit | `git log -1 580997b5` |
| Current status-file source SHA | `c5a3a101e73cbd421d987e53a199ba223748c092`, the 4.1.1 release commit (2026-10-08T10:28:42-05:00) | `git log -1 c5a3a101` and `release/npm-registry-status.json` |

## Conclusion and its limit

**4.2.0 is the first published version that ships application-supplied component implementations**, because the published tarball contains the symbol and the 4.1.1 source predates it.

The source commit for 4.2.0 is **inferred, not proven**: `gitHead` is empty, so nothing ties the tarball to a commit. `34a21156` is the only commit after the prepare commit that touches the published packages, and the tarball contains its feature, so it is the consistent candidate. A rebuild of that tree compared with the tarball would prove it; that was not done.

The `v4.2.0` tag is **not created** by this change (task 6 prepares the command only).

## Timeline supporting the inference

Feature commit `34a21156`: 2026-10-09T22:53:18Z (17:53:18-05:00). Publish of 4.2.0: 2026-10-10T00:18:33Z, about 85 minutes later. Publishing after the feature commit is consistent with the tarball containing it; it does not prove which tree was built.
