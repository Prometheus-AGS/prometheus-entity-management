# Release impact — `v3-skills-ecosystem`

Date: 2026-08-22

## Implementation-ready surface

The skills pack now documents and proves the complete 3.0 surface: twelve
public npm packages, the Dart/Flutter package, and the two Rust crates. Every
package has an export ledger validated against built dists; every public
TypeScript snippet in the pack (19 snippets across 15 docs) compiles against
PACKED tarballs in a temp consumer; every path referenced by the pack exists;
and every binding/integration claim is backed by a consumer fixture or example
through the machine-readable `ecosystem-claims.json` map.

The evidence loop caught and fixed real doc/API drift, including a wholesale
stale v2 API in the Surreal live-query skill (nonexistent `registerAdapter`,
`checkpointResume`, `where`/`normalize` table options) and fourteen
non-compiling snippet fragments. Data-flow language is standardized: hooks
orchestrate store methods; stores/adapters own all I/O.

This makes the skills ecosystem a trustworthy agent-facing surface for the
3.0 RC. It does not authorize publication and does not certify external
marketplace packaging.

## Design decisions that bound the blast radius

- One registry (`scripts/skills-package-registry.mjs`) drives all export
  ledgers; legacy `--sync`/`--a2ui`/`--a2a` flags and the React default keep
  backwards compatibility. Tauri and Dart keep their dedicated contract
  scripts untouched.
- No library code changed; no new runtime dependency. The snippet harness
  packs existing packages and compiles in a temp consumer — nothing in the
  repo is mutated by verification.
- The stale Surreal skill was corrected to the real adapter contract rather
  than deleting the skill; tenant scoping is now taught at the connection
  layer, which is the mechanism the adapter actually has.
- The claims map is enforced by a release test, so future claims cannot be
  added without evidence paths that exist.

## Full-release disposition

The full 3.0 release remains in progress. Docs foundation/API reference,
examples/integrations, cross-ecosystem certification, and stable publication
retain independent plan ownership. The human-gated changes
`v3-release-certification` and `v3-stable-publication` are untouched and remain
the hand-off boundary. This evidence grants no npm, GitHub Release, GitHub
Pages, Pub, Cargo, or app-store publication authority.
