# Proposal: a2ui-webcore-node-probe

Phase `phase-v4-a2ui-runtime-hardening` · gates `a2ui-headless-export` (#73).

## Summary

A narrow check that resolves one concrete uncertainty before it is built on: whether `@a2ui/web_core` 0.12.0 processing runs under Node (it depends on `lit`, `@lit/context` and `@preact/signals-core`). The result is a go/no-go for the headless entry. This is a compiler-level uncertainty check, not test evidence.

## Scope

Install dependencies for `@prometheus-ags/a2ui-react` with the frozen lockfile, import the processing entries in a scratch Node script, run a create/update/data-model sequence, and record the result.

## Out of scope

Any change to `packages/a2ui-react` source, and any test file.
