## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `a2ui-1-0-release-sync` / `a2ui-1-0-release-sync#<n>`.

- [x] 11.1 Author `verify:a2ui-v1`, `verify:agui-run-stack` and `verify:a2ui-examples` with their negative controls and report path arguments; a `capture:a2ui-visual` script that writes into the boundary folder with `verify-a2ui-visual-evidence.mjs` retargeted to read it; the TS2835 control consumer and the zod-resolution assertion in `verify-package-contracts.mjs`; and the scratch-copy control for `verify:skills`
- [x] 11.2 Update `site/docs` and `website/docs` with the 1.0 migration guide, client-only basic catalog, RC-input shim, AG-UI `^1.0.0` and the A2A extension
- [x] 11.3 Run `pnpm run refresh:exports`, update the skill docs, regenerate the website packed API reference and search index, and make `pnpm run verify:skills` pass
- [x] 11.4 Add the major changeset for the fixed group and CHANGELOG entries, without tagging or publishing
- [x] 11.5 Run isolated adversarial review of the cumulative diff and the sycophancy screen, and fix CRITICAL findings before the boundary run
- [x] 11.6 Run the boundary packet once, rerunning only scenarios affected by a repair, and record receipts in a new dated evidence folder
- [x] 11.7 Archive the changes whose scenarios passed
