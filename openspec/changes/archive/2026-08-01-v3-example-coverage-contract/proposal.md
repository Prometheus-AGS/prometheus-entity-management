# Proposal: v3-example-coverage-contract — Machine-verifiable example feature contract

**Phase:** full-3.0-release  
**Execution round:** 2  
**Depends on:** v3-release-contract  
**Recommended agent:** Roo Code (Architect mode)  
**Model class:** medium

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-example-coverage-contract` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Do not introduce an unassessed replacement library without updating the decision record.
- Close capability gap(s): `build-example-coverage-contract`.

## Success criteria

All acceptance criteria under `v3-example-coverage-contract` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

