# Proposal: v3-tauri-mobile-plugin — Complete Tauri desktop/mobile plugin contract

**Phase:** full-3.0-release  
**Execution round:** 3  
**Depends on:** v3-release-contract; v3-package-module-contracts  
**Recommended agent:** Claude Code  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-tauri-mobile-plugin` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Reuse/adapt analyzed candidates: `cand-012`.
- Close capability gap(s): `build-tauri-mobile-contract`.

## Success criteria

All acceptance criteria under `v3-tauri-mobile-plugin` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

