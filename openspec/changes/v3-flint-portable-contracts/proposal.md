# Proposal: v3-flint-portable-contracts — Portable Flint security and data contracts

**Phase:** full-3.0-release  
**Execution round:** 4  
**Depends on:** v3-framework-neutral-core; v3-example-coverage-contract  
**Recommended agent:** Roo Code (Code mode)  
**Model class:** medium

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-flint-portable-contracts` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Do not introduce an unassessed replacement library without updating the decision record.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-flint-portable-contracts` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

