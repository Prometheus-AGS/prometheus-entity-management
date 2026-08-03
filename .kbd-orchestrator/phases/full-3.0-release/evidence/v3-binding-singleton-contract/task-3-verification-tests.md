# Task 3 — verification tests

## Outcome

The binding singleton contract now has executable acceptance language, fail-closed policy unit tests, and an isolated packed-consumer integration test in the root verification path.

## BDD red to green

- Red evidence: [`bdd-red.md`](./bdd-red.md)
- Red result: 4 undefined scenarios and 19 undefined steps, exit 1, before step definitions existed.
- Green command: `pnpm run bdd:binding-singletons`
- Green result: 4 scenarios passed, 19 steps passed, 3 hooks passed, exit 0.

The BDD step layer caches one expensive verification report for all scenarios. It checks:

1. Six source manifests use `workspace:^` as the required core peer and `workspace:*` for development, with no production core dependency or optional core peer.
2. Packed peers are publishable semver ranges that accept the candidate core.
3. The Changesets fixed group matches the exact twelve-package npm release contract once.
4. The application and all six bindings resolve one physical core instance.
5. React, Svelte, Solid, Web Components, Alpine, and HTMX all observe the shared graph through binding-appropriate reactive paths, including Solid's `createGraphStore` accessor and HTMX's change event.
6. A fake core `4.0.0` consumer fails strict peer installation with actionable package and peer context.
7. Evidence limitations explicitly avoid browser, device, publication, or registry claims.

## Fail-closed unit coverage

- Command: `pnpm run test:binding-singletons`
- Result: 5 tests passed, 0 failed, exit 0.
- Mutations rejected:
  - source or packed production core copies;
  - missing source peer or development core;
  - optional core peer metadata;
  - packed workspace-protocol leakage;
  - packed peer ranges excluding the candidate;
  - missing or duplicate exact Changesets fixed groups.

The focused unit suite is wired into the root `pnpm run test` chain before the full BDD suite. Dedicated scripts are `test:binding-singletons` and `bdd:binding-singletons`.

## Packed integration evidence

- Command: `pnpm run verify:binding-singletons -- --report .kbd-orchestrator/phases/full-3.0-release/evidence/v3-binding-singleton-contract/task-3-binding-singletons-report.json`
- Result: 12 package builds passed; 6 packed bindings resolved one compatible core and observed one reactive graph; the incompatible peer fixture failed as required.
- Machine-readable report: [`task-3-binding-singletons-report.json`](./task-3-binding-singletons-report.json)

## Supporting gates

- Focused ESLint over the verifier, steps, and Node test: exit 0, zero warnings.
- `pnpm run validate:release-contract`: zero errors; 12 npm packages and 5 planned showcases retained.
- `pnpm exec openspec validate v3-binding-singleton-contract --strict`: valid.
- `git diff --check`: exit 0.

## Evidence boundary

No screenshots are applicable to this headless package-topology task. The verifier claims neither browser/device runtime nor publication. Browser, mobile, desktop, and documentation-site visual evidence remains a separate requirement for the applicable later changes; no npm or dist-tag mutation occurred.
