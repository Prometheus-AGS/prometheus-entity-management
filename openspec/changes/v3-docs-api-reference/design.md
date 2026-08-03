# Design: v3-docs-api-reference

## Candidate reuse decisions

### cand-022 — TypeDoc packages-mode API model

- **Verdict:** adapt
- **Decision:** Use TypeDoc as the authoritative export-derived API model; adapt its output into Docusaurus only after a small proof confirms stable routes and source links.
- **Evidence:**
  - Tier 1: TypeDoc packages mode converts package entry points independently and merges them into one API model. (https://typedoc.org/documents/Options.Package_Options.html)
  - Tier 1: TypeDoc can discover package entry points from exports and supports explicit package-level entry point configuration. (https://typedoc.org/documents/Options.Input.html)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

