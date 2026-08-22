# Design: v3-skills-ecosystem

## Approach

Implement this as the independent vertical slice defined by the matching phase-plan section. Treat its listed dependencies as hard entry gates and its acceptance criteria as the archive boundary.

## Constraints

- Preserve the repository architecture and package-manager rules.
- Prefer packed/public-artifact evidence over local source aliases.
- Record new decisions or gaps instead of weakening an acceptance criterion.

## Decisions

### D-1: One package registry drives every export ledger

`scripts/skills-package-registry.mjs` becomes the single inventory
(id → package dir, ledger file, dist entry points, legacy flag).
`refresh-exports-ledger.mjs` and `verify-skills-exports.mjs` accept
`--pkg <id>` and keep the legacy flags (`--sync`, `--a2ui`, `--a2a`, default
react) for backwards compatibility. New ledgers are generated for the seven
public npm packages that had none: `core`, `svelte`, `solid`, `alpine`,
`htmx`, `web-components`, `sdl`. Tauri keeps its dedicated contract script
(runtime + declaration entry points); Dart keeps `dart-public-api-contract.mjs`.
Each of the seven packages gets `refresh:exports` / `verify:skills` scripts and
the root `refresh:exports` / `verify:skills` chains are extended to cover all
twelve public npm packages plus Dart. All seven target dists were probe-imported
in Node and load cleanly, so the existing import-the-dist ledger technique works
for them.

### D-2: SKILLS.md becomes the 3.0 ecosystem map

The bundle index gains a package-selection table covering all twelve public npm
packages, the Dart/Flutter package, and the two Rust crates
(`entity-graph-cli`, `entity-graph-mcp`), replacing the React-v2-centric framing
while keeping the existing plugin catalog intact. Data-flow language is
standardized: components use hooks; hooks orchestrate store methods;
stores/adapters own I/O. One observed violation is fixed
(`entity-graph-prisma/CLAUDE.md` line 6: "Components → Hooks → (fetch) → REST
JSON" puts fetch in the hook layer).

### D-3: New shared references fill the guidance gaps

- `package-selection.md` — which artifact for which stack, with packed-evidence
  gate commands per claim.
- `framework-bindings.md` — Svelte/Solid/Alpine/HTMX/Web Components guidance:
  singleton contract, store shapes, and the binding verifier as backing
  consumer fixture.
- `sdl-and-rust-tooling.md` — `entity-graph-sdl` schema mapping and the Rust
  CLI/MCP crates (scope, commands, test lanes).
- `examples-gallery.md` — the certified examples (Vite, Next.js, agentic A2UI,
  Flutter, Tauri universal) with their verifier commands and evidence
  boundaries.
- `ecosystem-claims.json` — machine-readable claim → evidence map: every
  supported binding/integration claim names at least one consumer fixture or
  example path plus its gate command. The release test enforces it.
- Flint guidance is an index entry pointing at `docs/flint-integration.md`
  (owned by v3-flint-portable-contracts), not a second copy.

### D-4: Every public snippet compiles against packed packages

`scripts/verify-skills-snippets.mjs` extracts every ```` ```ts ````/`tsx` fence
from `prometheus-entity-skills/**/*.md`, writes each block as a module into a
temporary consumer, installs PACKED tarballs of the referenced packages
(react, core, sync, a2a, a2ui + peers `react`/`@types/react`/`loro-crdt`),
and runs `tsc --noEmit` over all of them. The 18 existing snippets are edited
to be self-contained (real imports from public packages, declared locals,
fragments wrapped in typed functions) without changing their teaching content.
The consumer tsconfig is strict with `noUnusedLocals`/`noUnusedParameters` off
(doc snippets legitimately omit usage).

### D-5: Release test enforces the acceptance criteria directly

`tests/release/v3-skills-ecosystem.test.mjs` asserts: (a) every public npm
package + Dart + Tauri has a registered ledger that validates; (b) every
repo-relative path referenced in the skills pack exists; (c) every claim in
`ecosystem-claims.json` maps to existing evidence paths and a root gate
command that exists in package.json; (d) the bundle index covers all twelve
public packages plus Dart and the Rust crates; (e) data-flow language rule —
no skill doc prescribes hooks calling fetch/APIs directly.

### D-6: Verifier, BDD, coverage

`scripts/verify-skills-ecosystem.mjs` runs: full `verify:skills` (all
ledgers), the snippet harness, the release test, and the skills-eslint
surface; writes `verification.json`. BDD feature/steps follow the phase
pattern. The `coverage.json` entry owned by this change (SDL/CLI integration,
line ~748) flips to `implemented`; snippet/ledger surface is recorded there.
