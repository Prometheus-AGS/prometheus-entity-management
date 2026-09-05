# Tasks — C2-freeze-table-type-surface

See the **C2-freeze-table-type-surface** section of the phase plan for full detail.

- [x] EntityColumnDef alias added; 7 builders + EntityTableProps switched; exported publicly; type-guard added
- [x] typecheck EXIT=0; build success (3 entrypoints emitted); alias present in dist/index.d.ts; guard proved to fail on deliberate break
- [x] Additive only; ColumnDef still exported; 2 pre-existing test failures confirmed against clean baseline, left unfixed
