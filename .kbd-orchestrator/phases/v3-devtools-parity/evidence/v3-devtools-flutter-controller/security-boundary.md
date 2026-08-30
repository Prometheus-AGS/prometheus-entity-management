# Flutter controller debugger security boundary

Date: 2026-08-30

The Dart VM service is an authenticated debugger boundary. Its URI and token
are secrets; they are not application authorization and must not be proxied to
an untrusted network, logged, or written to acceptance receipts.

The optional controller is metadata-only by default. A host may explicitly
include values only with its own synchronous redactor, which runs before values
enter retained histories or serialized VM-service envelopes. Remote commands
cannot select a broader value policy, replace the redactor, or commit previewed
state.

Every command names one active store and validates the protocol version,
envelope, payload, and required import confirmation. Requests, responses,
events, event history, snapshots, and import candidates retain simultaneous
count/byte ceilings. Preview restore refuses a changed value revision; history
import remains inert until explicit confirmation.

Disabled attachment is inert. Enabled bindings reference-count one controller
per graph; only the final detach removes the store from discovery and releases
tool listeners, histories, previews, and retained values. Isolate-global
service-extension method registration remains present with an empty registry
because Dart does not support unregistering it.

The external assembled receipt proves metadata/redaction policy refusal,
request/event bounds, store isolation, preview conflict refusal, and final
disposal without retaining the sentinel value, raw VM-service URI, debugger
token, registry-token names, entity values, or host-local path.
