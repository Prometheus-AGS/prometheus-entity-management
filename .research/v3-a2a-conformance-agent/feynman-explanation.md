# Feynman teach-back: the A2A boundary Prometheus must ship

Imagine two companies agree to exchange shipping containers. Calling a wooden box a “standard container” does not make it fit cranes, ships, or customs systems. Its dimensions, markings, locks, manifests, and handling signals all have to match the standard. A2A is that agreement for agents.

The current Prometheus alpha is a useful wooden box, but it is not the v1 container it says it is. It publishes the old `/.well-known/agent.json` route, puts version and URL fields in the wrong AgentCard locations, accepts slash-style methods such as `tasks/send`, has no `ListTasks`, and returns no real event stream. Those are observable contract failures, not cosmetic naming differences.

For v1, discovery happens at `/.well-known/agent-card.json`. The card lists `supportedInterfaces`; each interface says which binding, URL, and protocol version it supports. This project should promise JSON-RPC only. Its methods are `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, and `SubscribeToTask`. Streaming means ordered Server-Sent Events that expose real task/status/artifact progress, not one final Promise response.

The official JavaScript SDK should own the wire vocabulary and transport machinery. Prometheus should supply an executor and adapter that translate approved A2A inputs into graph operations. This avoids maintaining a second, almost-compatible protocol. The cost is a breaking API migration plus the SDK's `jose` and `uuid` dependencies. Because the v1 SDK is newly stable, pin `@a2a-js/sdk@1.0.1`, pack-test both module loaders and declarations, and review upgrades deliberately.

Authentication and graph authorization are different locks. A2A tells a client how to present identity. Prometheus policy still decides whether that identity may see a task or mutate a tenant, entity type, entity, action, or field. Rejected calls must stop before any graph write. Task lookup must not disclose whether a hidden task exists. A valid credential never means “all graph actions allowed,” and agent-provided metadata cannot approve itself.

A2UI is cargo carried in the container. The release's renderer baseline is A2UI v0.9.1, but the dedicated published A2UI-for-A2A extension page is explicitly v0.8 legacy. Therefore the safe near-term contract is a versioned Prometheus adapter that carries validated v0.9.1 messages as structured artifact data and clearly states its extension URI and metadata. If implementation research finds a current upstream v0.9 extension contract, adopt that exact contract; otherwise do not invent one or call the adapter upstream-certified.

The reference agent should be deterministic: given a known input, it emits the same task sequence and expected A2UI artifact without a model API key. An optional external-agent seam can be demonstrated separately, but CI must not depend on it. This makes failures reproducible and lets tests cover allowed, denied, malformed, streamed, cancelled, and hidden-task cases.

Finally, the SDK and TCK prove different things. The SDK reduces implementation drift. A pinned TCK commit measures selected normative behavior. The report must say that it tested the JSON-RPC v1 binding, which MUST/SHOULD scenarios ran, what was skipped, and what was excluded. It must not turn a JSON-RPC pass into claims about REST, gRPC, push notifications, signed cards, multi-tenancy, or production identity providers.

## Transfer answers

1. **A valid bearer token requests a graph mutation outside its field allowlist.** Return the binding-appropriate authorization result before executor mutation, prove the graph snapshot is byte-for-byte unchanged, and avoid reflecting sensitive policy detail.
2. **The deterministic agent emits an A2UI v0.9.1 artifact, but only the v0.8 A2A extension URI is documented upstream.** Label the payload with the Prometheus versioned adapter contract and do not claim current upstream A2UI-A2A extension conformance.
3. **The JSON-RPC TCK MUST suite passes while REST and gRPC were never exposed.** Report JSON-RPC v1 MUST conformance evidence only; list REST and gRPC as not declared and not tested.
4. **A legacy consumer calls `tasks/send`.** Route it only through a documented compatibility subpath/adapter or return a migration error. Never accept it silently on the v1 endpoint.

This is a source-grounded autonomous teach-back. It records the agent's implementation understanding; it does not claim human learner mastery or completed conformance.
