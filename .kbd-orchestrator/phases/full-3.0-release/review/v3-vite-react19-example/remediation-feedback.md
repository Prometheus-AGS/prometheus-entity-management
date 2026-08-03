# Review iteration 1 — packet corrections and disconfirming evidence

The first review returned two CRITICAL findings and one WARNING. The findings
were anti-theater screened successfully. Current repository inspection shows
that all three arise from incomplete packet scope or a misread final branch;
no source-code correction is justified by the evidence.

## CRITICAL 1 — retained screenshots and traces

The files exist in the working source but were omitted from the first
`files.txt` packet scope, so the temporary-index diff did not show their binary
additions. The corrected packet includes all six PNG files plus both Playwright
artifact directories. Direct SHA-256 recomputation passes 12/12 entries across
the implementation and deletion-aware clean-room receipts.

## CRITICAL 2 — sync export ledger

The first packet included `packages/entity-graph-sync/src/index.ts` but omitted
the untracked generated ledger. The corrected packet includes
`prometheus-entity-skills/_shared/references/sync-library-exports.json`, the
sync skill guidance, and the ledger verifier. The current command
`pnpm --filter @prometheus-ags/entity-graph-sync run verify:skills` passes with
all 16 runtime exports, including every name cited by the finding.

## WARNING — missing-ID Suspense invariant

The final source does not fall through. After the cache-miss and error branches,
`packages/entity-graph-react/src/hooks.ts:391-393` explicitly throws:

```ts
if (result.data == null) {
  throw new Error(!id ? "useSuspenseEntity requires a non-null entity id" : "Entity not found");
}
```

The prior invariant therefore remains present. The corrected packet retains the
complete final hunk for re-evaluation.

Reassess these findings against the corrected packet. Do not preserve a finding
merely because it appeared in iteration 1; retain it only if the expanded
evidence still supports it.

## Review iteration 2

Iteration 2 identified one confirmed defect and one additional packet omission.

The release contract declared `.js` for ESM while every public package uses
`dist/index.mjs`. A RED-first validator/test change produced 12 package-specific
contract errors and failed the new exact extension assertion. The contract is
now corrected to `.mjs`; the validator cross-checks the declared extension
against every public package's `module` loader so the mismatch cannot recur.

The WebSocket Loro implementation was present at
`packages/entity-graph-sync/src/providers/loro-websocket-channel.ts` with its
unit and integration tests, but those files were omitted from `files.txt`.
They are included in the next packet. Reassess the export finding against the
actual module and its tests.

## Review iteration 3

The claimed first-sync defect is contradicted by the final implementation and
an existing targeted regression test.

After `doc.import(bytes)`, `extractEntities` reads the entire imported root map:

```ts
const rootJson = root.toJSON() as Record<string, Record<string, unknown>>;
const allIds = new Set<string>([...ids, ...Object.keys(rootJson)]);
```

It then adds every imported ID to `seenIds` before emitting peer changes. The
targeted test creates provider B with an empty local ID set, writes `d-1` only
on provider A, injects A's snapshot into B, and confirms B receives a peer
change. That exact test passes.

No code change was made because the named failure scenario is already handled
and verified. Reassess the finding against lines 238–257 and the one-way
first-sync test; do not infer behavior from the helper's old comment alone.
