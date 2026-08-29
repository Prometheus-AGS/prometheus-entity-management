# Core DevTools security boundary

Date: 2026-08-29

The DevTools controller is an explicit inspection boundary over a concrete
`GraphStore`. It is attached only through the optional versioned DevTools
subpath. The deprecated root event stream is a history-free graph-transaction
op-site shim and never attaches the controller.

## Data handling

- The default value policy is metadata-only. Entity, patch, list, fetch-state,
  and synchronization values are not placed in events, history, commands, or
  transports.
- A host must select `values.mode: "include"` to cross that boundary. The host
  redactor receives the store, category, key, entity, side, field path, and
  destination context before the value becomes transport-safe data. In v1 an
  empty field path means the redactor receives the whole changed value; nested
  paths are reserved for later field-level inspection.
- A throwing redactor yields a non-sensitive `redaction-error` marker and the
  change reports `valueState: "redaction-error"`. Its exception text and the
  original value are not forwarded.
- Values are normalized to JSON-safe data. Circular references, functions,
  symbols, `undefined`, `bigint`, dates, and errors do not escape as live
  objects.
- Per-event, history-count, and history-byte limits bound inspection data.
  Included values are removed first; if metadata alone remains oversized, the
  event reports the exact `changesOmitted` count without claiming values were
  truncated.

## Isolation and lifecycle

- Controllers are keyed by `GraphStore` in a `WeakMap`; stores cannot share
  events, histories, clients, commands, or teardown.
- Attachments are reference-counted. The final detach unsubscribes from the
  store, clears retained history, disconnects observation, and removes the
  controller registry entry.
- `enabled: false` skips only that attachment. It does not tear down a
  controller referenced by another attachment; observation ends after every
  active attachment detaches.
- Multiple clients share one controller sequence. Disconnect is idempotent and
  a closed client receives a typed `disposed` result instead of executing more
  commands.
- Unknown envelopes, incompatible versions, wrong-store commands, unsupported
  commands, and disposed controllers return typed failures.
- Listener and projection failures are isolated from production graph writes.
  Projection failure emits a value-free diagnostic event.

## Evidence

The assembled packed-consumer gate at
`task-10-packed-acceptance.json` passed ESM, CommonJS, strict NodeNext types,
semantic mutation coverage, batching/coalescing, multi-store and multi-client
isolation, disabled mode, compatibility delegates, bounded history, teardown,
value/redaction cases, physical ESM/CommonJS root-payload exclusion, and the
multi-entry skills export ledger.
