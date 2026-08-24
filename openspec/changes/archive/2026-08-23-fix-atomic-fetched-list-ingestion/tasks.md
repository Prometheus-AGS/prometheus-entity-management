## 1. Preserve the defect evidence

- [x] 1.1 Run the notification-count fixture against signed 3.0.2 source with 7,248 rows; record the command and observed N+2 success publications as the negative control before changing the store.
- [x] 1.2 Inventory every production occurrence of bulk entity ingestion followed by per-row fetched-state writes; classify core engine, React hooks/query/view, and adapter owners so no list path is silently omitted.

## 2. Add atomic core ingestion

- [x] 2.1 Add the typed `ingestFetchedList` graph action with one timestamp and one Zustand publication; verify replace semantics cover merge strategy, entity lifecycle, sync metadata, list state, pagination, and fetch/error flags.
- [x] 2.2 Add append-mode behavior using existing stable deduplication/order semantics; verify repeated IDs, existing IDs, empty pages, and pagination metadata remain compatible.
- [x] 2.3 Route core `fetchList` through the atomic action; verify retry, cancellation, side effects, callbacks, stale state, and failures preserve existing behavior without partial success.

## 3. Migrate every binding path

- [x] 3.1 Migrate React `useEntities`, `useEntityQuery`, legacy `useEntityView`, and GraphQL list success paths to the core action; verify actual remote, paginated, and GraphQL hooks publish one complete success state after fetch-start.
- [x] 3.2 Migrate list-oriented adapters with the same split-write pattern and confirm bindings already delegating to core need no duplicate implementation; verify the production source inventory contains no unclassified fetched-list loop.

## 4. Verify and release the fix

- [x] 4.1 After implementation is code-complete, run the positive fixture with 1, 12, and 7,248 rows and observe exactly one success publication after fetch-start in every run.
- [x] 4.2 Run package-local core/React/affected-adapter checks and packed ESM/CommonJS/declaration consumers if the public export surface changes; verify data and lifecycle assertions pass without a broad unrelated suite.
- [x] 4.3 Add the repository-standard changeset for the affected fixed 3.x group after tests pass; verify the resulting next patch inventory and increase the package version through the normal release path rather than editing one package inconsistently.
- [x] 4.4 Run `openspec validate fix-atomic-fetched-list-ingestion --strict`, write row-form `verification.md`, commit the isolated branch, push it, and open the upstream PR; if a safe fix cannot be delivered, file a GitHub issue containing the exact reproduction and evidence instead.
