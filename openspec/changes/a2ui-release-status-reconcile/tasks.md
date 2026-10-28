# Tasks: a2ui-release-status-reconcile

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.

- [x] 1 Record provenance of the published 4.2.0: tarball exports `createPrometheusA2uiComponent`, `gitHead` is null, source `34a21156` inferred
- [x] 2 Update `release/npm-registry-status.json` for all 13 package entries to what `npm view` reports, set both source SHAs to the full 40-character SHA of `34a21156`, and regenerate `website/static/api/packed-inventory.json` and the README registry table with the repository generators
- [x] 3 Correct the stale `web_core`, `@a2ui/react` and `markdown-it` pins in `release/a2ui-protocol-bridge.md` and in `prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md`
- [x] 4 Fix the root `CHANGELOG.md` 4.2.0 heading and add a changeset stating that 4.2.0 first ships application-supplied component implementations
- [x] 5 Record every reader of the edited files and confirm by reading that their expected strings still match, listing any conflicting assertion for the acceptance change
- [x] 6 Prepare the `v4.2.0` tag command at `34a21156` and record it as pending operator approval; do not create or push it
