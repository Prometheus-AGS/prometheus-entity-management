# v3 package module contracts — implementation evidence

Date: 2026-08-01  
Change: `v3-package-module-contracts`  
Task: 2 of 6

## Implemented release boundary

- Centralized the twelve public npm builds in `scripts/tsup-package-config.ts`.
- Emit loader-distinct runtime artifacts: ESM `dist/index.mjs` and CommonJS `dist/index.cjs`.
- Emit and conditionally route matching declarations: ESM `dist/index.d.ts` and CommonJS `dist/index.d.cts`.
- Normalized all twelve manifests with author, MIT license, supported Node engine, monorepo repository directory, package homepage, issue URL, README, changelog, and explicit `files` allowlists.
- Added user-facing package documentation for `@prometheus-ags/entity-graph-core` and `@prometheus-ags/entity-graph-sdl`.
- Narrowed the Tauri npm payload to its TypeScript distribution plus the Rust Cargo manifest, build script, required `tauri.conf.json`, source, and generated capability schemas. `Cargo.lock` remains intentionally excluded for the bundled library crate.
- Added exact development dependencies `publint@0.3.22` and `@arethetypeswrong/cli@0.18.5`.
- Added `scripts/verify-package-contracts.mjs`, which packs every package, rejects leaked workspace/local paths and unintended source trees, runs strict Publint and ATTW checks, installs one coherent tarball candidate set, and executes Node ESM, Node CommonJS, TypeScript NodeNext, and TypeScript Node16 consumers.
- Added a deterministic Lit declaration rewrite for the web-components `.d.cts` branch. It uses TypeScript import-mode resolution attributes for Lit's ESM-only public types while retaining a CommonJS declaration entry.

## Smoke results

| Check | Result |
|---|---|
| `pnpm run build` | PASS — all packages and both existing examples |
| `node scripts/verify-package-contracts.mjs` | PASS — 12/12 tarballs |
| strict Publint | PASS — 12/12 |
| strict Are The Types Wrong | PASS — 12/12 |
| isolated Node ESM imports | PASS — 12/12 |
| isolated Node CommonJS requires | PASS — 12/12 |
| isolated TypeScript 6 NodeNext resolution | PASS — 12/12 |
| isolated TypeScript 6 Node16 resolution | PASS — 12/12 |
| `pnpm run lint` | PASS |
| `pnpm run typecheck` | PASS — 17/17 Turbo tasks |

## Adversarial findings retained

The first consumer run accidentally mixed the packed candidates with the already-published alpha through nested semver dependencies. That old registry core still advertised `dist/index.js` and failed under `type: module`. The verifier now applies pnpm overrides for every internal package name so all dependency edges resolve to the candidate tarballs; registry artifacts cannot make the check pass or fail.

The core declaration graph currently imports a React type through framework-neutral table types. Removing that leak belongs to the explicitly separate `v3-framework-neutral-core` change and was not hidden by expanding this task. The representative all-package type consumer installs the declared ecosystem type environment, while ATTW independently validates each tarball's module-resolution matrix. Stable 3.0 remains blocked until the later core change proves a genuinely React-free core declaration surface.

No public runtime export was added or removed in this task, so the skills export ledger does not require a surface update. No rendered UI changed; visual evidence is not applicable to this package-artifact task.

The clean-state native boundary check later proved that `tauri_build::build()` reads `tauri.conf.json` from the unpacked crate. The original allowlist excluded that required input, so a real npm tarball failed standalone `cargo check`. The allowlist, documentation, and BDD assertion were corrected to include the configuration; the Cargo lockfile remains excluded.
