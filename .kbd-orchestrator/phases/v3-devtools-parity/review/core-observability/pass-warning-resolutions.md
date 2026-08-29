# PASS warning resolutions

Date: 2026-08-29

The final isolated review passed with no critical findings. Its non-blocking
findings were dispositioned before archive:

1. The public controller is now a facade with no runtime `dispose` property;
   only the registry entry owns teardown, preserving reference counting.
2. The payload-exclusion verifier now recursively follows both ESM imports and
   CommonJS `require` chunk edges.
3. The deprecated event shim restores its zero-listener fast path and emits a
   fixed, non-sensitive warning when a listener throws.
4. One-argument subscriber-stat listeners retain the prior global fan-out;
   store-bound listeners receive only their store's notifications. All current
   repository callers are audited, and packed acceptance covers both forms.
5. The assembled gate now executes the core skills-export verifier, proving
   both root and `./devtools` arrays in the multi-entry ledger.
6. Protocol documentation states the v1 correlation scope: one event per
   Zustand publication, so `correlationId` equals `eventId` in v1.
7. Metadata-only oversized events keep `valuesTruncated: false`; omitted
   metadata changes remain explicit in `changesOmitted`. Included/redaction
   values that are removed set `valuesTruncated: true`.
