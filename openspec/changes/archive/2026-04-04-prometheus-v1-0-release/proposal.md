# Proposal: prometheus v1.0.0 release

## Summary

Ship **@prometheus-ags/prometheus-entity-management@1.0.0** to npm with documentation, tests, CI, skills validation, and examples aligned to [`specs/v1-0.md`](../../specs/v1-0.md).

## Motivation

- Production consumers need a semver-stable release.
- AI agents must rely on skills and docs that match the shipped API.

## Non-goals

- See [v1-0.md §3](../../specs/v1-0.md).

## Success criteria

- [ ] `pnpm publish` dry-run succeeds for `1.0.0`
- [ ] CI green; skills sync script green
- [ ] Spec v1-0.md requirements satisfied
