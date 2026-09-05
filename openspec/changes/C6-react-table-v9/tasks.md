# Tasks — C6-react-table-v9

See the **C6-react-table-v9** section of the phase plan for full detail.

- [~] BLOCKED — migration attempted with explicit tableFeatures, 23 type errors, rolled back to ^8.21.3
- [x] Post-rollback verified green: typecheck EXIT=0, build success, all lockfile specifiers ^8.21.3
- [x] CORRECTION: plan said ColumnDef survives v9 — it exists but arity changed to <TFeatures,TData,TValue>; the public type CANNOT be held stable under a minor bump
