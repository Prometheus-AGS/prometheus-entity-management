# Design: v3-main-ci-baseline

## Approach

Implement this as the independent vertical slice defined by the matching phase-plan section. Treat its listed dependencies as hard entry gates and its acceptance criteria as the archive boundary.

## Constraints

- Preserve the repository architecture and package-manager rules.
- Prefer packed/public-artifact evidence over local source aliases.
- Record new decisions or gaps instead of weakening an acceptance criterion.

