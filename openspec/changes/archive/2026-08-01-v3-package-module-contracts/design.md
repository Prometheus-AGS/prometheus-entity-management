# Design: v3-package-module-contracts

## Candidate reuse decisions

### cand-018 — Publint + Are The Types Wrong

- **Verdict:** reference
- **Decision:** The checks are technically valuable and Publint found a real blocker, but final adoption remains conditional on a maintenance/version check in Spec/Plan because Analyze exhausted its registry-query budget.
- **Evidence:**
  - Tier 4: Publint validates package compatibility and already detected the shared broken CommonJS entries in this repository. (https://publint.dev/docs/)
  - Tier 4: The CLI checks packed package type resolution across module modes. (https://www.npmjs.com/package/@arethetypeswrong/cli)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

