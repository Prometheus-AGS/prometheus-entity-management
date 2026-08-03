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
