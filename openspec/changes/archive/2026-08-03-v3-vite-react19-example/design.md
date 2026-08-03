# Design: v3-vite-react19-example

## Candidate reuse decisions

### cand-001 — Vite 8

- **Verdict:** adopt
- **Decision:** Keep and harden the existing Vite app rather than replace it with a third-party starter.
- **Evidence:**
  - Tier 3: The npm registry reported Vite 8.2.0 and active maintenance. (https://www.npmjs.com/package/vite)
  - Tier 4: Vite 8 documents React scaffolding and requires Node 20.19+ or 22.12+. (https://v8.vite.dev/guide/)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

