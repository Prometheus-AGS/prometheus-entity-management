# Flutter controller task 8 — assembled acceptance

Date: 2026-08-30

## Outcome

The single assembled Flutter/Riverpod/VM-service acceptance gate passed on a
real booted iOS simulator against source commit
`ad72bcf8d99d7175cf2bf36d4f8ce4594d200da4`.

```text
Node verifier
  -> Flutter machine protocol
  -> configured iOS application on a simulator
  -> Dart VM-service WebSocket JSON-RPC
  -> production versioned DevTools methods and Extension stream
  -> two production EntityGraph controllers
  -> real Riverpod entity/list providers and graph publications
```

The structured receipt is `task-8-assembled-acceptance.json`. It records the
platform-neutral `flutter-riverpod-vm-service-acceptance` boundary, 28 versioned
Extension events across lifecycle, mutation, time-travel, and view event types,
both isolated store IDs, fixture hashes, and the full assertion inventory.

## Observed defects corrected by the assembled gate

- The verifier initially selected the globally available macOS device even
  though this example configures only iOS and Android. It now auto-selects only
  a connected device backed by an actual project platform directory and still
  permits an explicit device override.
- Flutter emitted `app.start`, then `app.stop`, but the verifier ignored a stop
  without an `error` parameter and waited for a timeout. Every startup stop and
  early exit now rejects immediately. Safe telemetry retains only event names,
  fixed diagnostic markers, and a capped, path/token-redacted error detail.
- The first real graph publication failed because nested `Map.unmodifiable`
  constructors produced runtime-dynamic views that were cast to strongly typed
  snapshot maps. Both public and internal snapshot constructors now provide
  explicit generic types at every immutable map layer.
- The verifier expected an invented `status: applied` preview field. The shared
  React/Flutter protocol defines applied previews by their receipt fields and
  reserves `status` for restore/conflict receipts. The verifier now asserts the
  real entity and applied-patch contract.
- The receipt boundary was corrected from a platform-specific macOS label to a
  platform-neutral Flutter boundary before final evidence capture.

## Verification

- Gate II: `dart analyze packages/entity_graph_flutter` exited 0 with no errors
  or warnings. Four pre-existing style infos reported
  `prefer_initializing_formals` at `controller.dart` lines 39 and 682 and
  `graph.dart` lines 325 and 326; they were outside the observed behavior and
  were not changed.
- Gate III: `pnpm run verify:devtools-flutter-controller` passed on the assembled
  iOS path and reported 28 production Extension events.
- The final receipt reports `status: pass`, the exact source commit above, the
  configured device ID, both byte-identical fixture hashes, and all eleven
  acceptance assertions.
- Receipt validation confirmed the sentinel secret, local home path, and Cargo,
  npm, and Node registry-token variable names are absent.
- `dart format` and `node --check` passed as parser/static confirmations; they
  are not test evidence.
- No unit, widget, component, golden, snapshot, mock-backed, isolated, or
  partial integration test was created or run. The task text's legacy
  “targeted tests” wording was superseded by the immutable implementation-first,
  full-integration-only doctrine.

## Security boundary

The VM-service debugger connection is the real tool boundary. The assembled
flow proved host-owned recursive redaction before history or transport,
metadata-only isolation for the second store, refusal of remote value-policy
escalation, bounded command/event payloads, and registry-token removal from the
Flutter child environment. Diagnostic reporting exposes no raw build stream.
Sovereign sync was not touched.
