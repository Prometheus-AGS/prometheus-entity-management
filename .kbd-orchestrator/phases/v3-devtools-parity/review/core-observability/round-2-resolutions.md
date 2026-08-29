# Round 2 finding resolutions

Date: 2026-08-29

1. **Legacy/controller contract — fixed.** The change specification, engine
   comments, package README, and security evidence now state the shipped
   boundary: the versioned controller is optional and the deprecated root
   stream is a separate history-free graph-transaction op-site shim.
2. **Legacy patch and emission semantics — fixed.** Both default and custom
   stores emit the original incremental upsert/patch/clear-patch events from
   graph transactions, including repeated operation calls.
3. **Post-dispose transport close — fixed.** Publication is inert after
   disposal. Packed acceptance detaches a live-client controller, closes the
   old transport, and verifies that cleared history stays empty.
4. **Non-finite bounds — fixed.** NaN and infinite limits normalize to finite
   defaults; negative finite values still clamp to the documented minimum.
   Packed acceptance verifies the advertised effective limits.
5. **React subscription stability — fixed.** Store-bound subscribe and snapshot
   callbacks are memoized by `storeApi` before `useSyncExternalStore`.
6. **Redaction failure under truncation — fixed.** Event-level
   `valuesTruncated` reports removed values while each retained failed change
   preserves `valueState: "redaction-error"`; packed acceptance covers it.
7. **Peer verification — tightened.** The clean packed consumer install no
   longer disables strict peer dependency handling.

The root payload closure check, scoped TypeScript checks, and the single
assembled packed-package integration gate are rerun after these corrections.
