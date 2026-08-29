# Round 3 finding resolutions

Date: 2026-08-29

## Critical: mixed entity revision keys

Resolved. Fetch/sync changes now resolve the legacy metadata key against actual
entity/patch buckets and update `entityRevisions` under the same JSON-encoded
identity used by entity/patch changes and `recordFor`. The assembled
`compositeMetadataIdentity` scenario proves both colon-colliding identities
advance and no phantom record appears.

## Warning: naive colon metadata parsing

Resolved by the same bucket-first resolver. First-colon parsing remains only a
fallback for metadata-only state that has no canonical or patch identity from
which an unambiguous pair can be recovered.

## Warning: root CRUD registry reader

Clarified in the change specification. `getRegisteredSchemas` is an internal
module export, not re-exported from `src/index.ts`; the built root ledger remains
exactly 128 names. The optional DevTools relationship module is the only new
consumer. This is the minimal seam for reading the existing schema source
without duplicating registry state or pulling DevTools into root imports.

## Warning: preview patch keys

No production change. The now-complete staged packet includes the actual graph
boundary: `previewPatch = { ...patch }` followed by
`patchEntity` merging `{ ...existing, ...patch }`. Object spread creates own
data properties and does not invoke the legacy `__proto__` setter on a target;
`constructor` and `prototype` may also be legitimate domain fields. Rejecting
those names would silently narrow the entity model without an observed exploit.

## Warning: stale KBD next task

The canonical control plane already stores tasks 6–8 as `Cancelled`; signed
transition attempts returned 409 `Cancelled to Cancelled`. The generated
`progress.json` selector ignores that status and chooses task 6 text anyway.
The file is generated and must not be hand-edited. Task 10 is the sole backend
task still open, and its signed completion/archive transition is the valid way
to advance the projection.

## Warning: incoherent duplicated packet post-images

Resolved structurally. All scoped code, fixtures, docs, KBD, review, and refiner
artifacts were staged after the final implementation correction. The next
packet is built with no unstaged scoped file, so each file has one post-image
and all new modules/fixtures are present. Unrelated `.prometheus/knowledge` and
event-log changes remain unstaged.

## Suggestions

- Disposed view registration remains an idempotent no-op handle because the
  controller lifecycle is already closed; no membership or event can be
  retained after disposal. Transport commands still return typed `disposed`
  failures at the remote boundary.
- `merged: null` for a patch-only record is deliberate: the production graph's
  `readEntity` returns `null` without a canonical base. Projecting the patch as a
  live merged value would misreport what application consumers render.
