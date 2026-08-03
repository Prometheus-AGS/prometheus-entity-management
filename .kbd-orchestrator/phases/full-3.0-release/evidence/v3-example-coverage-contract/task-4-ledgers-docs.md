# Task 4 ledger, skills, and documentation evidence

Change: `v3-example-coverage-contract`  
Task: 4 of 6  
Recorded: 2026-08-01

## Outcome

Synchronized the machine coverage ledger, release guidance, example documentation, and agent teaching surfaces with the implemented shared semantic contract. No package runtime export was added or changed by this change.

## Machine declarations

`examples/coverage.json` now registers `release.examples.shared-semantic-contract` as an implemented quality gate with:

- owner: `v3-example-coverage-contract`;
- command: `pnpm run verify:example-coverage`;
- BDD: `tests/features/release/v3-example-coverage-contract.feature`;
- authoritative release, coverage-schema, scenario-contract, and scenario-schema policies;
- reproducible task 1–4 evidence paths.

Both `scripts/verify-example-coverage.mjs` and `scripts/validate-v3-release-contract.mjs` fail closed if the gate identity, owner, command, BDD tags, policies, evidence paths, or feature path drifts. Duplicate quality-gate identities are rejected.

## Documentation and skills

Updated:

- `README.md` and its documentation map;
- `RELEASING.md` operator commands and evidence interpretation;
- `examples/README.md` showcase contract guidance;
- `release/README.md` implemented-gate status and limitations;
- `prometheus-entity-skills/SKILL.md` and `SKILLS.md` routing;
- `_shared/references/v3-release-contract.md`;
- new `_shared/references/example-coverage-contract.md` with the required agent workflow and truthful evidence rules.

The shared reference routes agents to machine-readable sources rather than copying scenario inventories into skill text. It explicitly forbids treating semantic evidence as framework, browser, device, accessibility, or visual certification.

## Public API ledger audit

The following SHA-256 hashes were captured before and after task-4 edits and are identical:

| File | SHA-256 |
| --- | --- |
| `packages/entity-graph-core/src/index.ts` | `26f4039da22b8cb22a4338733549afc78e3546b6e9ae21134c0c1a592125032f` |
| `packages/entity-graph-react/src/index.ts` | `ce32939f98e503b164cddf124ff2ca060c91a1fedb4f8844622f81640ddeeca2` |
| `prometheus-entity-skills/_shared/references/library-exports.json` | `1360b50e8a514f6afdad3cf889e94b4c4db7d3926bed8ea66cd48e957a7f2bed` |

`pnpm run verify:skills` passed with 201 built runtime exports matching the existing ledger. Therefore refreshing the ledger would have been an unjustified rewrite.

## Red-to-green and gate receipts

- Red: 12 tests passed and one failed because the implemented quality-gate declaration was missing (`task-4-bdd-red.md`).
- Green unit: example coverage 13/13; release contract 14/14.
- Green BDD: example coverage 4 scenarios / 27 steps; release contract 5 scenarios / 32 steps.
- Machine BDD: `task-4-cucumber.json`, 1 feature / 4 scenarios / 27 steps / 0 failed.
- `pnpm run validate`: pass, 13/13 semantic outcomes, 16 stable capabilities/artifacts, 5 planned showcases, `releaseCertified: false`.
- `pnpm run verify:skills`: pass, 201 runtime exports.
- Focused ESLint: pass.
- Eight declared contract/doc paths: present and nonempty.
- Strict OpenSpec validation: pass.
- Scoped `git diff --check`: pass.

## Explicit limitations

This synchronization does not add application runtime, platform, browser, accessibility, screenshot, trace, video, golden, or publication evidence. The five showcase entries and documentation deployment remain planned. Visual certification is neither applicable nor claimed for this headless contract task.
