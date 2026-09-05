# @prometheus-ags/prometheus-entity-management

## 4.0.0

### Patch Changes

- Updated dependencies [d1588d8]
  - @prometheus-ags/entity-graph-react@4.0.0

## Unreleased

- This package became a compatibility alias. The React bindings publish as
  `@prometheus-ags/entity-graph-react`, matching every other framework binding
  in the workspace. This package re-exports that one across all three
  entrypoints, so existing installs keep resolving and no consumer breaks. New
  code should depend on `@prometheus-ags/entity-graph-react` directly.
