# v3-nextjs-app-router-example Specification

## Purpose
Certify the Next.js App Router integration across per-request server graph
ownership, server preload and serialization, client hydration, route lifecycle,
mutation, realtime takeover, and packed-package production/browser execution.

## Requirements

### Requirement: Next.js SSR, RSC, and hydration showcase

The 3.0 release SHALL demonstrate a new graph per server request, serializable
state crossing the Server/Client Component boundary, and one provider-owned
browser graph. Client hydration infrastructure SHALL resolve the nearest
provider-owned `GraphStore` before performing imperative writes. Documentation
SHALL state that React context scopes Client Component hooks only and does not
implicitly scope Server Components or arbitrary module-level functions.

#### Scenario: Provider-owned hydration does not write the singleton

- **WHEN** a request payload is hydrated beneath `GraphStoreProvider`
- **THEN** all entity, fetch-state, and list writes land in the provider-owned browser graph
- **AND** the default singleton remains unchanged
- **AND** hydrated readers do not issue a duplicate fetch for the payload

#### Scenario: Server request ownership is explicit

- **WHEN** a Server Component or server helper prepares request data
- **THEN** it creates or receives a request-owned vanilla `GraphStore`
- **AND** it serializes data across the RSC boundary instead of reading React client context

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/archive/2026-08-29-fix-scoped-imperative-store-access/tasks.md` is complete
- **THEN** focused React and Next.js regression tests and the relevant packed-contract checks pass
- **AND** the public example and migration documentation match the verified behavior
