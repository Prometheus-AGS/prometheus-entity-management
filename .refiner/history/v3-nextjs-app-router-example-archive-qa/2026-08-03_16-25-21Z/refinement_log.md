# Refinement log — `v3-nextjs-app-router-example-archive-qa`

## Cycle 4, iteration 1 — 2026-08-03

### Delta first

Cycle 3 was rejected by a complete review. The packed receipt certified an
empty substituted config instead of the checked-in Next config, and the scoped
realtime manager retained its initial provider store. This iteration corrects
both. It does not certify npm publication, stable 3.0, untested browsers or
rendering modes, hosted integrations, or the remaining showcase portfolio.

### Specify

Retained the eight KBD/OpenSpec constraints and added explicit success criteria
for byte-preserved config certification, source-alias rejection, provider
rebinding, prior-adapter cleanup, and replacement-graph runtime behavior.

### Plan

Preserve and inspect the real Next config, record its hash, key the manager to
the provider store, make the caller effect own adapter replacement, add direct
regressions, rerun the exact packed gate, recompute hashes, and persist cycle 4.

### Execute

- Removed the release-only empty config rewrite; the verifier now compares the
  copied config byte for byte, rejects workspace source aliases, and records
  SHA-256 `49ebd9f84c79dde5cac32bf1909c674b21897948c837205ddc66ef97df25c4e3`.
- Replaced the hook's initial-store `useState` instance with `useMemo` keyed by
  the current store and flush interval.
- Made the realtime page effect depend on the manager, unregister the exact old
  adapter, and preserve its running intent across recreation.
- Added a runtime regression proving events after provider replacement mutate
  only the replacement graph; declared its direct test dependency in the copied
  external application boundary.
- Passed the exact verifier with 10/10 commands, 16/16 focused runtime tests,
  8/8 structural tests, 12/12 isolated requests, 2/2 browser flows, and zero
  serious or critical accessibility findings.
- Recomputed all six retained hashes and revalidated 203 React exports, 13/13
  semantic scenarios, 14/14 coverage tests, strict OpenSpec, Changesets,
  release contract, frozen install, diff hygiene, and production security.

### Reflect

The cycle-3 BLOCK was valid: a replacement config made the packed claim too
broad, and initial-store retention violated provider ownership. Both findings
now have direct regressions. No critical or blocking constraint remains, but a
new full-diff adversarial review is mandatory because the artifact changed.

### Persist

Persisted cycle-4 specification, plan, constraints, reflection, validation,
archive report, decision, and converged state under refinement ID
`002133fd-50f7-45e4-b762-9693aa8f442b`.
