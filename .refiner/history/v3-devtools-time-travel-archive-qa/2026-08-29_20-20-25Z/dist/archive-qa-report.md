# DevTools time-travel archive QA

## Delta

The controller implementation and first packed acceptance receipt existed, but
the public package guide and human API table did not describe controller-owned
snapshot history, the skills pack had no time-travel contract, there was no
versioned TypeScript/Flutter time-travel fixture, and no change-specific
security record named the sensitive snapshot-value and rewind/import mutation
boundaries.

## Corrections

- Documented complete graph capture, the single count/byte retention policy,
  stable and expired cursors, rewind and exact live return, mutation branching,
  inert/confirmed import, disposal, and deprecated root delegation.
- Added a dedicated skills reference and declaration-oriented API entries while
  preserving the generated runtime ledger: 128 root exports and 7 optional
  `./devtools` exports.
- Added and published `time-travel-v1.json` with a byte-identical Flutter source
  copy, and made the packed ESM acceptance flow consume its import envelope.
- Added security and verification receipts that name full-value controller
  memory, metadata-only serialization, local graph mutation authority,
  untrusted import validation, per-store ownership, and host transport
  responsibility.
- Preserved downstream boundaries: no React/Flutter UI, extension, site,
  performance, release, or publication claim is certified here.

## Deterministic validation

- Complete packed acceptance: pass after correcting one verifier-generated ESM
  import omission; production code had not executed on the failed run.
- Scoped built runtime ledger: pass (`128` root, `7` `./devtools`).
- Receipt: fixture parity/packing, all 3 package checks, 4 consumers, and 12
  runtime scenarios pass.
- Fixture parity: byte-identical TypeScript and Flutter copies.
- Fixture SHA-256:
  `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`.
- Working-tree whitespace and JSON parsing: pass.
- Unit/component/isolated/mock/snapshot/partial tests: none created or run.

## Constraint disposition

- `api-ledger-truth`: satisfied. Built runtime names equal the committed ledger;
  new public documentation correctly describes controller methods and protocol
  types as declaration surface.
- `time-travel-semantics-truth`: satisfied. Public content matches production
  capture, retention, stable cursor, rewind/live, import, lifecycle, and facade
  behavior.
- `security-boundary-truth`: satisfied. Sensitive values, mutation authority,
  validation, serialization, store isolation, and transport authority are
  explicit.
- `evidence-and-fixture-integrity`: satisfied. Every required receipt status and
  all three fixture representations pass at the retained hash.
- `scope-honesty`: satisfied. All downstream product and publication work is
  explicitly excluded.

## Scope

This QA certifies only `v3-devtools-time-travel`. React and Flutter inspector
surfaces, Chrome and Flutter extensions, documentation scenarios, performance
budgets, release certification, npm/pub.dev publication, and store submission
remain later changes in `v3-devtools-parity`.
