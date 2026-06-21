# Proposal: Enforce Component→Hook→Store layering (ESLint)

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C8 · addresses GAP-7 · `library: cand-011`

## Summary

Add an ESLint rule that blocks direct store imports (`./graph` / `useGraphStore`) in component files, enforcing the non-negotiable Component→Hook→Store data-flow rule that today is documented but not enforced.

## Motivation

CLAUDE.md makes Component→Hook→Store a non-negotiable rule; large applications need it *enforced*, not just documented. Breaking it creates data silos and defeats cross-view reactivity.

## Library reuse (cand-011)

- **eslint `no-restricted-imports`** (ADAPT) — no off-the-shelf plugin enforces our specific rule. Start with the built-in restricted-imports rule; promote to a custom AST plugin (`eslint-plugin-prometheus-entity`) only if insufficient.

## Non-goals

- A full published ESLint plugin in v2.0 (start with config; promote later if needed).
- Enforcing the hook→no-direct-API rule via lint (harder to express statically; document instead).

## Design

- ESLint flat-config snippet: ban importing `./graph`, `useGraphStore` from `**/components/**` and component `.tsx` files (allow in `**/hooks/**`, `**/*.hook.ts`).
- Document the rule + rationale; ship as example config consumers can copy.

## Success criteria

- [ ] Lint errors on `useGraphStore` import inside a component file.
- [ ] Hooks may import the store without error.
- [ ] Rule documented with rationale + copyable config.
