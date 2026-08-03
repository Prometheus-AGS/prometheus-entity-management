# Task 5 — clean release gates

Recorded: 2026-08-03T07:32:19Z

## Result

The React 19/Vite 8 showcase and its required JavaScript package boundaries pass
their clean gates. This task does **not** claim that the full 3.0 monorepo is
certified or that npm publication is authorized.

The final clean room was a local Git clone with a deletion-aware overlay of the
current working source. `node_modules`, build outputs, environment files, and
TypeScript build-info caches were excluded before the frozen install. This
preserved Git provenance tests while reproducing current deletions and avoiding
the stale caches that made earlier probes unreliable.

## Corrective attempts

1. The first source-only room found a stale validator that required all five
   showcases to remain planned. The contract now accepts the truthful state of
   one implemented React showcase and four planned showcases.
2. The second room found two missing React hook dependencies. Stable functions
   are now destructured from the view result and used in the effects.
3. The third room found a stale coverage test that selected showcase index zero,
   which is now React and implemented. The test now selects a planned showcase
   by status.
4. A Git-less clean room could not run Flutter provenance tests. A first
   Git-aware overlay retained tracked files deleted by the working source. The
   final clean-room method therefore preserves `.git`, propagates deletions,
   and excludes `*.tsbuildinfo`.

These were observed gate failures; none was waived.

## Passing evidence

- Frozen pnpm install: 15 workspaces, 799 packages, 788 reused, zero downloaded.
- Release contract: pass with 16 artifacts, 12 npm packages, one implemented
  showcase, and four planned showcases.
- Shared semantic coverage: 13/13 scenarios pass.
- ESLint, TypeScript, and production package/example builds: pass.
- React package: 53 tests pass.
- Core package: 175 pass, one optional Flint integration skip, one todo.
- Sync package: 28 tests pass.
- Release, CI baseline, package, framework-neutral, singleton, coverage, sync,
  Flutter-provenance, Tauri-contract, and release-pipeline Node suites: pass.
- Packed package verifier: all 12 tarballs pass payload, manifest, Publint,
  Are The Types Wrong, Node ESM/CommonJS, NodeNext, Node16, and Bundler checks.
- Singleton verifier: six bindings resolve one compatible physical core and
  observe one reactive graph.
- Clean React browser verifier: 14 targeted tests and 3 Playwright flows pass;
  serious and critical accessibility findings are both zero.
- Skills/API ledgers: React 201 exports and sync 16 exports match.
- Production audit: 331 dependencies; two low findings; zero moderate, high,
  critical, or blocking advisories.
- `openspec validate v3-vite-react19-example --strict --no-interactive`: pass.
- `pnpm changeset status`: pass after adding
  `.changeset/certify-vite-react19.md`.
- `git diff --check`: pass.

Machine-readable evidence:

- `clean-package-contract-report.json`
  (`34b97614af67cbe47f4163a9accae8f6a469fdca614d7c5811c46c6b18acf08e`)
- `clean-binding-singletons-report.json`
  (`264cc706a96ab4afb000246c812fc5072eb81cfa3f804713ef2eb649c59b5971`)
- `clean-vite-verification.json`
  (`0b9214624b0db2fdd57388231186f9671e61463d23f59a15dfcb7848560251c1`)
- `clean-gates.json`

All six screenshot and trace hashes declared by the clean browser receipt match
the `clean-*` evidence files in this repository. The original task-3 receipt
and its separately named artifacts also remain internally hash-consistent.

## Broader phase exceptions

The aggregate root `pnpm run ci` did not pass. Its 600-second test gate entered
the full BDD matrix, reported Flutter runtime verifier failures, then timed out
during a cold Tauri compilation. Dart/Melos, native Cargo, and platform bundle
certification are not owned by this React showcase task. The failure remains
visible for the later Flutter, Tauri, and release-certification changes; it is
not being reclassified as green or silently waived.

Docusaurus is likewise owned by later documentation changes and is not present
yet. No documentation-deployment claim is made here.

## Remaining release boundary

The working source is an overlay on
`eb3c9802da5ff10ad6db135fed761bd23ea80b3f`, not an immutable release commit.
The current release contract also uses a coordinated fixed group of twelve npm
packages. Therefore this evidence certifies the React implementation task but
does not authorize npm staging or publication. The early React/core RC lane must
be introduced as an explicit release-policy change and rehearsed from an
immutable source SHA.
