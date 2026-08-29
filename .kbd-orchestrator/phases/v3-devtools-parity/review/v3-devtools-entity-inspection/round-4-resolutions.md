# Round 4 finding resolutions

Date: 2026-08-29

The fresh-context, distinct-model review returned `PASS` with no critical
findings. The strict anti-sycophancy screen passed with score `0.0`. No
production change follows from this round; the remaining findings are recorded
as bounded residuals rather than silently expanding the accepted change.

## Warning: metadata revision over-advancement for colon-colliding identities

Accepted residual. The existing graph metadata map publishes only its legacy
colon-joined state key, so the DevTools projection cannot identify which of two
simultaneously present colon-colliding identities originated a metadata-only
publication. It advances every actual bucket match instead of fabricating a
single match. Canonical and patch revisions, preview conflicts, and restore
conflicts remain keyed by the collision-free JSON identity. Removing this
residual requires changing the upstream graph metadata event contract, which is
outside this inspection change.

## Warning: deleted colon-bearing metadata fallback

Accepted residual. When retained legacy metadata has no current canonical or
patch bucket, its colon-joined key cannot be losslessly decoded. The fallback
preserves the historical first-colon interpretation used by the graph metadata
contract. The record is still marked `missing-canonical`; changing the graph
metadata identity representation is the correct future boundary rather than
inventing a second incompatible decoder in DevTools.

## Warning: public record `key` is not globally unique

Accepted and already deliberate. `key` is the stable colon-joined display/wire
label retained for compatibility; controller identity, revision maps, preview
receipts, and membership use `(type, id)` via a JSON-encoded internal key. The
assembled collision scenario proves both records remain independently
addressable by `type` and `id`. Consumers must not treat the display label as a
database primary key.

## Warning: divergent duplicate view definitions

Accepted residual. Registration tokens are reference counts for one stable
`viewId`; the first definition owns that identity until its final token is
released. Detecting divergent definitions is UI/runtime integration policy and
will be exercised when React and Flutter view adapters begin registering real
surfaces. This change does not add a new failure channel to the synchronous
registration API.

## Suggestion: client-side JSON-safety normalization

Deferred to the real transport changes. The core client is deliberately
transport-agnostic and the controller validates the command shape after the
transport boundary. JSON/postMessage serialization behavior belongs to the
React, Flutter, and extension transport adapters that will be implemented later
in this phase; this core-only change does not guess at those adapters' error
contracts.
