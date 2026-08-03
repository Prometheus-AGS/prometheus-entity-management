# Decisions

## 2026-08-03 — React graph bindings support explicit store scope

The React package retains its established default graph singleton, but all
React hooks now resolve an optional nearest `GraphStoreProvider`. Next.js uses
an application-owned store created from a request-owned dehydrated snapshot.

Rationale: mutating a module singleton during Server Component rendering leaks
entity state across concurrent requests. A provider preserves compatibility for
existing browser consumers while making the server/client ownership boundary
explicit and testable. Store-specific engine registries prevent equal query
keys in different requests from sharing in-flight work or subscriber state.

## 2026-08-03 — Archive Next.js with queued-flush warning retained

The bounded Next.js change may archive after a cross-model PASS even though a
replaced scoped realtime manager can flush an already-queued batch into its
abandoned old graph before the timer expires.

Rationale: adapter cleanup stops new events, the queued batch cannot cross into
the replacement graph, and KBD classifies warnings as non-blocking. An explicit
`RealtimeManager.dispose()` contract would change the public lifecycle surface
and belongs in the later coordinated prerelease, not as unreviewed expansion of
the completed Next change. The warning remains in the review and verification
artifacts until that follow-up is implemented and tested.
