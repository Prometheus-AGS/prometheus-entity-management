## ADDED Requirements

### Requirement: Lifecycle activities are accepted and failures request a resync

An AG-UI `a2ui-surface` activity whose content carries a `status` and no `a2ui_operations` (a lifecycle activity, as `@ag-ui/a2ui-middleware` sends while building, retrying or after failing) SHALL be accepted without changing any surface. A lifecycle activity with `status: "failed"` SHALL produce exactly one resync request with reason `producer-failed` per message id, and activities of unknown types SHALL be ignored without rendering or resyncing.

#### Scenario: Middleware gives up

- **WHEN** `@ag-ui/a2ui-middleware` sends an `a2ui-surface` activity with `status: "failed"`, and redelivers it
- **THEN** no surface changes and the runtime requests exactly one `producer-failed` resync
