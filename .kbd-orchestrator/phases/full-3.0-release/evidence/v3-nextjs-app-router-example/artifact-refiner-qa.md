# Artifact-refiner QA — `v3-nextjs-app-router-example`

Date: 2026-08-03
Artifact: `v3-nextjs-app-router-example-archive-qa`
Current refinement ID: `46725a52-9c0b-409b-bf20-26eb6447cb8e`
Prior refinement ID: `5bcff6b5-4856-4420-92e1-fabd0eb62f42`
Checkpoint: `3d3c977f`
Current history: `.refiner/history/v3-nextjs-app-router-example-archive-qa/2026-08-03_15-47-37Z`
Prior history: `.refiner/history/v3-nextjs-app-router-example-archive-qa/2026-08-03_15-22-06Z`
Decision: **PASS — two review warnings corrected; eight of eight blocking constraints satisfied**

## Delta first

The first isolated review contradicted cycle 1's “no implementation defect”
conclusion. It found stale task metadata and a real runtime ownership gap:
provider-owned graphs did not receive garbage collection. Cycle 2 corrected
both, added a selected-versus-sibling graph regression, synchronized the public
API guidance, regenerated the full packed/browser receipt, and replaced all
six affected evidence hashes.

It does not certify npm publication, stable 3.0, static/ISR rendering, untested
browsers, hosted integrations, or the remaining portfolio. The frozen React
`3.0.0-rc.1` source remains separate from this later-prerelease continuation.

## Blocking constraints

| Constraint | Result |
| --- | --- |
| Every bounded acceptance criterion and review warning has direct evidence | Pass |
| External production consumer uses corrected packed packages only | Pass |
| Scoped GC, SSR, hydration, navigation, reload, mutation, and realtime pass | Pass |
| Regenerated screenshot/trace hashes and accessibility pass | Pass |
| Task metadata, coverage, exports, skills, docs, OpenSpec, Changesets, and evidence agree | Pass |
| Browser/rendering/live/platform limits and release lanes are explicit | Pass |
| Server Action trust boundary remains fail-closed | Pass |
| No npm, stable-release, or fixed-group overclaim | Pass |

## Deterministic validation

- Manifest, constraints, and refinement state schemas: pass.
- Manifest files: 2/2 present and non-empty.
- Blocking constraints: 8/8 satisfied across state, reflection, and validation.
- Review warnings: 2/2 corrected.
- Retained regenerated evidence hashes: 6/6 match.
- Packed verifier commands: 10/10 exit zero.
- Focused and structural tests: 13/13 and 5/5 pass, including independent
  selected-graph garbage collection with the sibling graph unchanged.
- Runtime metrics: 12/12 unique request graphs, 0 hydration fetches/errors,
  2/2 browser tests, 0 serious/critical axe findings; final report task is 5.
- Ledgers and gates: 203/203 exports, 13/13 semantic scenarios, 14/14 coverage
  tests, strict OpenSpec, Changesets, release contract, frozen install, diff
  hygiene, and security pass.

Cycle 1 remains retained as audit history, not current certification. Rebuild
the complete fresh-context adversarial review packet. OpenSpec archive is
allowed only after a non-blocking verdict on the corrected artifact.
