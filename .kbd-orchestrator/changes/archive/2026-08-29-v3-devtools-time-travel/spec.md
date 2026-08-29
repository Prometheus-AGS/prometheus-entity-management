# v3-devtools-time-travel

## Goal

Replace the legacy time-travel registry with controller-owned, store-isolated
snapshot history that can rewind the actual graph, report expired cursors, and
return exactly to the captured live head. The controller remains an observer
and explicit debug-command surface; graph data remains owned by `GraphStore`.

## Confirmed prerequisite contracts

The prerequisite core controller is complete and archived. At commit
`dd574d24f683f13ad218c4e7ccbc921d7a9801e6` the production contracts used by
this change are:

- `attachGraphDevtools` reference-counts one controller per `GraphStore` in a
  `WeakMap`; two stores never share controller state, sequence numbers,
  clients, events, or teardown.
- The controller subscribes once at the Zustand publication boundary and emits
  one ordered semantic mutation event for each completed graph publication.
  Hydration, rollback, adapter writes, and public `setState` calls therefore
  pass through the same observation seam.
- Every event has stable `storeId`, monotonically increasing `sequence`,
  `eventId`, and `correlationId`. Sequence identifiers are never reused after
  eviction or clearing.
- Event history is already bounded independently by both event count and
  serialized bytes. Host-owned metadata/include/redaction policy applies
  before values enter retained event history or a serialized envelope.
- Controller disposal unsubscribes from the store and clears listeners,
  retained events, entity revisions, view registrations, and preview receipts.
- The legacy `devtools-time-travel.ts` still owns a separate per-store
  `WeakMap`, cursor, snapshot ring, and listeners. Its root exports are
  compatibility API only; task 5 delegates them to the default-store
  controller and removes this second ownership path.

## Production requirements

- Extend only the optional `@prometheus-ags/entity-graph-core/devtools`
  controller/protocol surface. Preserve root compatibility delegates without
  pulling the optional implementation into normal root imports.
- Capture the complete mutable graph data slice—`entities`, `patches`,
  `entityStates`, `syncMetadata`, and `lists`—without retaining store action
  functions or DevTools-owned state.
- Capture an initial attach baseline and the completed state associated with
  every semantic graph mutation event. Each retained mutation event references
  the stable cursor of its captured post-publication snapshot.
- Keep rewind cursor, protected live head, imported candidates, replay markers,
  and retained snapshots inside the owning controller lifecycle.
- Rewind through the graph's existing Zustand state boundary so application
  subscribers render the selected historical state. Internal rewind and
  return-to-live publications are explicitly marked and must not be captured
  as ordinary business mutations or recursively create history.
- Preserve the exact pre-rewind live head. An explicit return-to-live command
  restores that deep-cloned data atomically and clears the rewind cursor.
- If a non-replay graph publication occurs while rewound, leave rewind mode
  before publishing that mutation event and treat its completed state as the
  new live branch. The ordering is therefore explicit: return-to-live state
  transition, semantic mutation event, then its captured live snapshot. No
  background mutation is hidden behind a historical cursor and no observed
  mutation is discarded to recover the old head.
- Resolve commands by stable cursor, never by current array index. An evicted
  cursor returns a typed `expired-history` result containing the retained
  cursor range and does not mutate the graph.
- Inspect imported history as a bounded, versioned, inert candidate. Restore
  only after an explicit confirmation command validates the same store and
  protocol contract; inspection alone never mutates graph state.
- Deep-clone on capture and restore so live writes cannot alias or corrupt
  retained snapshots.

## Single snapshot-retention policy

Time-travel snapshots use one policy owned by the controller. It is separate
from semantic event retention because an event can remain useful after its
rewind payload expires, and a snapshot must never be inferred from an event
whose values were redacted or omitted.

| Rule | Contract |
| --- | --- |
| Default count ceiling | 50 retained snapshots per controller |
| Default byte ceiling | 10 MiB of retained snapshot data per controller |
| Effective bound | Both ceilings apply; evict until count and bytes are each within their ceiling |
| Eviction unit | Whole oldest snapshots only; never truncate a graph snapshot |
| Oversize capture | Do not retain a snapshot larger than the byte ceiling; expose a typed unavailable/expired result instead of partial state |
| Stable identity | Controller-local monotonic cursor IDs are never reused |
| Initial baseline | Captured on attach and governed by the same ring; if evicted, its cursor is visibly expired |
| Protected live head | One deep-cloned pre-rewind head is retained only while rewound so exact return remains possible; it is released on return, live-branch mutation, or disposal |
| Clearing | Clears retained snapshot payloads and advances the expired boundary; it never rewinds the graph and never resets cursor IDs |
| Disposal | Releases snapshot payloads, protected live head, imported candidates, and listeners |
| Configuration | Attach-time non-negative count/byte ceilings only; reaching either zero disables the time-travel capability for that controller |

The effective default is therefore whichever ceiling is reached first: at
most 50 complete snapshots and at most 10 MiB. There is no second legacy ring,
unbounded export cache, or independent UI-owned snapshot retention.

## Cursor and event invariants

- `live` is an explicit controller state, not the newest retained array index.
- Retained cursors are ordered by capture and tied to exactly one store.
- A mutation event may reference a cursor that later expires; readers receive
  an explicit expired state rather than a different snapshot at that position.
- Rewind and return publications carry internal replay markers so the observer
  can distinguish DevTools writes from application writes without bypassing
  the graph store.
- View/UI layers submit rewind intent and render controller state. They do not
  own cursors, snapshots, branching rules, or retention.

## Acceptance boundary

Implement production tasks 2–5 completely before running tests. Acceptance is
one assembled multi-store core/packed-consumer integration gate covering
count/byte eviction, oversize capture, stable and expired cursors, rewind,
exact return-to-live, a mutation while rewound, import inspection/confirmation,
store isolation, teardown, and deprecated root compatibility. Unit, isolated,
mock-backed, snapshot, and partial tests are excluded.

After that gate passes, synchronize public API and skills ledgers,
documentation, fixtures, security/evidence receipts, artifact-refiner output,
and artifact-only isolated adversarial review before verification and archive.

## Architecture impact

- **State owner:** the existing per-store DevTools controller only.
- **Production flow:** command/client -> controller -> atomic `GraphStore`
  restore; the store publication remains the sole application notification
  boundary.
- **Persistence:** none. Snapshot history is bounded debug memory and is
  cleared on controller disposal.
- **UI/runtime impact:** downstream React and Flutter surfaces consume stable
  cursors, visible expiry, rewind state, and explicit return-to-live results.
- **Security boundary:** local snapshot payloads contain complete graph data;
  serialized inspection/export remains governed by explicit host policy and
  import restore requires confirmation. Detailed enforcement evidence belongs
  to task 10 after the production path exists.
