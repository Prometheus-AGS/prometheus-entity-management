# React inspector task 4 — command and policy contract

Date: 2026-08-29

## Result

COMPLETE. The shared React inspector can select explicitly supplied stores and
submit preview/restore and time-travel commands through the selected core
protocol client. Clipboard and export actions honor the selected controller's
serialized value policy.

## Production surface

- Extended the provider and explicit host with a backward-compatible
  `stores` contract. Named `GraphStore` definitions are de-duplicated by store
  identity, reference-counted through core attachments, and exposed as stable
  descriptors with one selected controller/client.
- Kept store discovery explicit. No process-global React store registry or
  component-owned graph projection was introduced.
- Added framework-independent command services for local preview application,
  exact prior-patch restore, retained-snapshot rewind, exact return-to-live,
  clipboard writes, and JSON download.
- Added command/view-model state for pending operations, actionable errors,
  success receipts, JSON preview drafts, proposed live-value diffs, active
  preview receipts per store/entity, retained cursor selection, and policy
  capability state.
- Added the Overview store selector, explicit value-policy readout, and JSON
  export interaction.
- Added entity identifier copy, policy-projected value copy, preview JSON
  editor, proposed field-path diff, apply receipt, and conflict-safe exact
  restore interaction.
- Added Activity rewind controls, retained cursor selection, visible rewound
  state, expired cursor feedback, and an always-available Return to live action
  while rewound.
- Replaced display-key selection/virtualization with collision-free serialized
  `[type,id]` identities so entity types and IDs containing colons remain
  distinct.

## Security boundary

Clipboard and downloaded files leave the in-memory same-origin inspection
surface and are therefore treated as serialized trust boundaries. Entity value
copy is disabled under metadata-only mode and reads only the controller's
policy-projected entity record when inclusion is enabled. Metadata-only export
actively replaces entity values and removes mutation before/after values even
if another attachment originally created the shared controller with a more
permissive policy. Preview input remains a local command to the selected
store-scoped controller and never bypasses its receipt/conflict semantics.

## Static confirmation

- TypeScript `transpileModule` parsed all 22 DevTools `.ts`/`.tsx` files with
  zero syntax diagnostics.
- Staged whitespace checks passed for every modified and newly added DevTools
  file.
- Source assertions confirmed explicit multi-store selection, the four client
  command names, exact restore and Return to live controls, collision-free
  entity identity, policy-value stripping, JSON export, and continued normal-
  root exclusion.

These are parser/static confirmations, not test evidence. No typecheck, unit,
component, isolated, mock-backed, snapshot, partial integration, full
integration, or build command ran. Task 11 remains the sole assembled packed
Vite/Next/browser gate after tasks 5, 6, and 10 finish the production path.

## Control-plane receipt

Task 4 started at canonical revision 360 and completed at revision 362. The
control socket was unavailable at completion, so the signed command used the
canonical local runtime fallback without changing sovereign sync. The known
task-after parent reset was restored through command
`codex-react-inspector-restore-after-task-4-20260829` at revision 363.
