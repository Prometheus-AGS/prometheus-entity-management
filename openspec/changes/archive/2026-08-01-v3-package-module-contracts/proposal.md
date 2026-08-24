# Proposal: v3-package-module-contracts — Valid npm module, type, and tarball contracts

**Phase:** full-3.0-release  
**Execution round:** 2  
**Depends on:** v3-release-contract; v3-main-ci-baseline  
**Recommended agent:** Claude Code  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-package-module-contracts` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Reuse/adapt analyzed candidates: `cand-018`.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-package-module-contracts` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

