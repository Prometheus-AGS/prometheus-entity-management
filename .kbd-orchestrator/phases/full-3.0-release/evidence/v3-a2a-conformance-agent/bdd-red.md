# BDD red evidence — v3-a2a-conformance-agent task 3

Date: 2026-08-01

## Focused official-protocol tests

The first replacement of the alpha-shaped slash-method tests produced an intentional red run: 10 tests passed and 4 failed. The failures identified four product defects rather than test-only differences:

1. malformed JSON was not returned as the official JSON-RPC parse error;
2. unsupported media types did not carry an official structured JSON-RPC error;
3. an SSE subscription error was deferred until after the HTTP response had already claimed a successful stream; and
4. extension negotiation happened too late for the SSE response header.

The server now parses before dispatch, uses the official SDK error envelope, primes the async generator before committing the response, and activates requested extensions before the initial task event.

## Pinned upstream TCK

The first run of `a2aproject/a2a-tck` at commit `5996b79f9cefa6fc390980e383e358a66fb9e49e` was also kept red rather than weakened:

- pytest: 69 passed, 185 skipped, 11 failed;
- applicable JSON-RPC MUST ledger: 49 passed, 10 failed (80.6%);
- failing MUST requirements: `STREAM-ORDER-002`, `STREAM-ORDER-003`, `STREAM-ORDER-004`, `STREAM-SUB-004`, `CORE-HIST-002`, `CORE-CANCEL-001`, `CORE-MULTI-005`, `STREAM-SUB-002`, `STREAM-SUB-003`, and `STREAM-SUB-001`;
- additional failed upstream scenarios exposed missing test-fixture artifact/direct-message routing, AgentCard caching headers, content-type envelope shape, and immediate subscription errors.

The TCK fixture is now a test-only executor that implements the upstream repository's documented message-ID scenario contract. No `tck-*` routing string exists in production package source.

## Packed consumer checks

The first strict declaration consumers found two additional red states:

- NodeNext exposed the SDK's Node `Buffer` declaration requirement, fixed by explicitly loading Node types in the consumer contract;
- Node16 then exposed `TS1479` in the package's generated `.d.cts` files because the official SDK publishes ESM-tagged declarations even for its CommonJS runtime condition.

The package build now normalizes only its generated CommonJS declarations with TypeScript `resolution-mode: import`. `skipLibCheck` remains `false`, so the verifier proves the shipped declaration graph instead of hiding the error.

These red runs are the baseline for the green receipts in `task-3-test-receipt.md`.
