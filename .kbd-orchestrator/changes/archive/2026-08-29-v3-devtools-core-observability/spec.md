# v3-devtools-core-observability

## Goal

Provide a versioned, optional, transport-independent DevTools surface for every entity graph store without changing graph ownership or widening normal root imports.

## Production requirements

- Export the new public surface through `@prometheus-ags/entity-graph-core/devtools` with ESM, CommonJS, and declaration contracts while keeping normal root imports free of the new implementation payload.
- Attach one reference-counted controller per graph store. Multiple clients share that controller; different stores never share events, history, cursors, commands, or teardown.
- Observe every public graph mutation through one semantic instrumentation boundary with stable versioned envelopes, sequence/correlation data, categories, timing, and before/after counts.
- Keep history bounded and expose explicit lifecycle, connection, capability, snapshot, event, and command results.
- Default to metadata-only inspection. Values cross a client or extension boundary only under an explicit host value/redaction policy.
- Supply a transport-independent client and deterministic disconnect/dispose behavior.
- Preserve deprecated root event/time-travel API behavior without importing the optional controller payload. The legacy event stream remains a history-free graph-transaction op-site shim, while time travel keeps per-store compatibility state; neither may retain one process-global buffer or cursor.

## Acceptance boundary

The production implementation is complete and wired before test execution. Acceptance is one full assembled core/React/packed-consumer DevTools integration gate covering semantic event completeness, batch/coalescing, multi-store isolation, multiple clients, disabled mode, compatibility delegates, bounded history, and teardown. Unit, isolated, mock-backed, snapshot, and partial tests do not count and are not added or run.

Public API/skills ledgers, package documentation, security-boundary notes, and retained evidence must match the shipped surface. Artifact-refiner and artifact-only isolated adversarial review must pass before verification and archive.
