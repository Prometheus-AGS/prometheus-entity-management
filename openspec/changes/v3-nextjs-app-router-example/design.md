# Design: v3-nextjs-app-router-example

## Candidate reuse decisions

### cand-002 — Next.js 16 App Router

- **Verdict:** adopt
- **Decision:** Retain the existing App Router example but make SSR/hydration the reason it exists instead of duplicating the Vite UI wholesale.
- **Evidence:**
  - Tier 3: The npm registry reported Next.js 16.2.12, newer than the example's 16.2.1. (https://www.npmjs.com/package/next)
  - Tier 4: The App Router defines explicit Server and Client Component boundaries suitable for demonstrating server preload plus client graph hydration. (https://nextjs.org/docs/app/getting-started/server-and-client-components)
  - Tier 4: Next recommends end-to-end testing for async Server Components where unit tooling is incomplete. (https://nextjs.org/docs/app/guides/testing)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

