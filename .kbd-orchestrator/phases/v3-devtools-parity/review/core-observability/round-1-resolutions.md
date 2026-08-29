# Round 1 finding resolutions

Date: 2026-08-29

1. **Root payload — fixed.** The deprecated root API now uses a history-free
   graph-transaction op-site shim in `src/legacy-devtools.ts`, which has no
   dependency on the versioned protocol, controller, client, or projection.
   The packed acceptance gate recursively inspects the root ESM dependency
   closure and the root CJS artifact for those implementation markers.
2. **Ledger readers — audited, no defect reproduced.** Core's two actual
   ledger consumers already support the keyed entry-point shape:
   `verify-skills-exports.mjs` selects each registered entry and
   `generate-api-reference.mjs` flattens entry arrays. The cited Flint verifier
   reads `library-exports.json` for the React package, not
   `core-library-exports.json`; snippet/readme scripts do not parse the core
   ledger. The ecosystem check only verifies that the ledger exists.
3. **Deprecated custom-store events — fixed.** Default and non-default
   `createGraphTransaction(store)` upsert, patch, and clear-patch operations
   retain the prior global compatibility notifications and incremental payload
   semantics. The shim stores no history or cursor.
4. **`enabled: false` — documented and verified.** It is an
   attachment-level no-op and never revokes other live references. The README,
   API documentation, security evidence, and packed acceptance scenario state
   and verify that lifetime contract.
5. **Engine imports — false positive.** `EntityType` and `EntityId` remain used
   throughout `engine.ts` by query, fetch, subscription, garbage-collection,
   and invalidation APIs. Scoped TypeScript verification passes.
6. **Replay listener isolation — fixed.** Replayed deliveries use the same
   per-listener exception boundary as live publication.
7. **Redaction state/path — fixed and documented.** Redactor failure reports
   `valueState: "redaction-error"`. In v1, an empty `fieldPath` explicitly means
   the whole changed value; nested paths are reserved for field-level
   inspection.
8. **DAG projection — fixed.** JSON-safe conversion now tracks only the active
   recursion path, so repeated sibling references are not mislabeled as cycles.

The single assembled packed-package gate passed after these changes for ESM,
CommonJS, strict NodeNext, physical root payload exclusion, compatibility,
redaction failure, repeated-reference projection, replay isolation, bounds,
multi-store/client isolation, and teardown.
