# Proposal: v3-docs-api-reference — Multi-language package and API reference

**Phase:** full-3.0-release  
**Execution round:** 5  
**Depends on:** v3-package-module-contracts; v3-dart-graph-riverpod; v3-tauri-mobile-plugin; v3-docs-foundation-brand  
**Recommended agent:** Claude Code  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-docs-api-reference` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Reuse/adapt analyzed candidates: `cand-022`.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-docs-api-reference` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

