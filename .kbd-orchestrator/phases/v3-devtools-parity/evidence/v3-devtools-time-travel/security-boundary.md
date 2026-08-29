# DevTools time-travel security boundary

Date: 2026-08-29

Time travel is an explicit local developer-tool mutation boundary over one
concrete `GraphStore`. It is available through the optional versioned
`@prometheus-ags/entity-graph-core/devtools` entry. The controller does not
authenticate or authorize a remote client; browser, extension, VM-service,
socket, or other transport adapters must establish that authority before
forwarding commands, import candidates, events, or results.

## Snapshot values and retention

- A retained snapshot contains the complete mutable graph data slice:
  `entities`, `patches`, `entityStates`, `syncMetadata`, and `lists`. It may
  therefore contain secrets or sensitive application data even when ordinary
  DevTools event/inspection values use the metadata-only policy.
- Snapshot payloads stay inside the owning in-process controller. Mutation
  events, snapshot references, status responses, rewind/return receipts, and
  import-inspection receipts carry cursor/time/size/source metadata only; they
  do not serialize retained graph values.
- Both count and byte ceilings apply. Eviction removes complete oldest
  snapshots, oversize data is marked unavailable rather than partially stored,
  clearing releases retained payloads, and final detach releases snapshots,
  protected live state, imported candidates, and listeners.
- The deprecated root facade owns no payload, cursor, or retention state. Its
  cross-bundle global symbol contains only a versioned delegate/factory/listener
  bridge so independently bundled ESM/CommonJS entries reach the same optional
  controller.

## Rewind mutation authority

- A successful rewind or return writes the complete historical/live graph data
  through the existing Zustand state boundary. Every application subscriber
  observes that write; this is not a read-only inspection command.
- Commands resolve an exact stable controller-local cursor. Future/unknown
  cursors do nothing; evicted, cleared, and unavailable cursors return typed
  expiry receipts and never substitute a different retained snapshot.
- The first rewind protects an exact deep clone of the live head. Explicit
  return restores it. A real application mutation while rewound releases that
  future, emits a visible live transition, and becomes the new branch rather
  than being hidden or discarded.
- Internal replay publications are controller-marked and excluded from
  ordinary semantic capture. This prevents recursive history and makes audit
  ordering distinguish DevTools writes from application writes.

## Imported history boundary

- Imported history is untrusted command input. Inspection accepts only finite,
  acyclic, plain JSON with the current protocol version, exact controller store
  ID, ordered positive cursors, parseable timestamps, and structurally complete
  graph data.
- Imported snapshots share the controller's count/byte budget with retained
  local history. Inspection is inert and exposes metadata only.
- Restore requires explicit `confirm: true`, the exact one-shot candidate ID,
  and a cursor in that candidate. A different inspection, live graph activity,
  confirmation, clearing, or disposal invalidates the candidate.
- Successful import restore uses the same replay-marked graph boundary and
  exact return-to-live protection as a retained rewind. No import persists
  beyond controller memory or commits to an external service.

## Store and lifecycle isolation

- Snapshot payloads, stable cursors, protected live heads, imported candidates,
  listeners, and mode belong to one controller keyed by one `GraphStore`.
  Separate stores cannot rewind, return, import into, or inspect one another.
- Multiple attachments to the same store reference-count one controller. The
  first attachment owns its configuration until the final detach.
- Root-only imports do not load or attach the optional controller. Once the
  explicit DevTools module is loaded, compatibility calls delegate to the
  selected store controller; scoped-store arguments never fall back to the
  package singleton.

## Evidence

`task-9-packed-acceptance.json` records the packed fixture hash/parity, package
payload and root-exclusion checks, root-only ESM, full ESM, CommonJS, and strict
NodeNext consumers, and passing retention, expiry, rewind/live, branching,
import, isolation, teardown, and compatibility scenarios.
