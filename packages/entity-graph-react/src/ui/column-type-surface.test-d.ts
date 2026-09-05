/**
 * Type-level regression guard for the public column surface.
 *
 * `EntityColumnDef<T>` is what consumers construct and what every public column
 * builder returns. This file fails to compile if a TanStack upgrade changes
 * that shape in a way a consumer would notice.
 *
 * It exists because the alternative is discovering the break in someone else's
 * build. `EntityTable` is exported from the package root with
 * `columns: EntityColumnDef<T>[]`, so this type crosses the package boundary.
 *
 * Type-only: no runtime assertions, no test runner needed. `tsc --noEmit`
 * over the package compiles this file, and that is the whole check.
 */
import type {
  EntityColumnDef,
  EntityColumnMeta,
} from "./columns";
import {
  selectionColumn,
  textColumn,
  numberColumn,
  dateColumn,
  booleanColumn,
  enumColumn,
  actionsColumn,
} from "./columns";

interface Row {
  id: string;
  title: string;
  count: number;
  due: string;
  done: boolean;
  status: string;
}

// ---------------------------------------------------------------------------
// 1. A hand-written, v8-shaped column literal still assigns to the public type.
//    This is the shape a consumer writes by hand, and the one most likely to
//    break on a TanStack major.
// ---------------------------------------------------------------------------
const handWritten: EntityColumnDef<Row> = {
  id: "title",
  accessorKey: "title",
  size: 200,
  header: "Title",
  cell: ({ getValue }) => String(getValue()),
  enableSorting: true,
  enableHiding: true,
};
void handWritten;

// ---------------------------------------------------------------------------
// 2. Every public builder returns the public type — not a TanStack type that
//    merely happens to be assignable today.
// ---------------------------------------------------------------------------
const builders: EntityColumnDef<Row>[] = [
  selectionColumn<Row>(),
  textColumn<Row>({ field: "title", header: "Title" }),
  numberColumn<Row>({ field: "count", header: "Count" }),
  dateColumn<Row>({ field: "due", header: "Due" }),
  booleanColumn<Row>({ field: "done", header: "Done" }),
  enumColumn<Row>({
    field: "status",
    header: "Status",
    options: [{ value: "open", label: "Open" }],
  }),
  actionsColumn<Row>([{ label: "Edit", onClick: () => {} }]),
];
void builders;

// ---------------------------------------------------------------------------
// 3. The `meta.entityMeta` augmentation still resolves.
//    GAP-D: v9 adds a `TFeatures` parameter to `ColumnMeta`, so the
//    `declare module` block in columns.tsx must be updated for v9. If that
//    augmentation stops applying, `entityMeta` silently degrades to `never`
//    or errors here — which is the point of asserting it.
// ---------------------------------------------------------------------------
const withMeta: EntityColumnDef<Row> = {
  id: "count",
  accessorKey: "count",
  meta: {
    entityMeta: {
      field: "count",
      filterType: "number",
      editable: true,
      hideable: true,
    } satisfies EntityColumnMeta<Row>,
  },
};
void withMeta;

// ---------------------------------------------------------------------------
// 4. An array of the public type is what EntityTableProps.columns accepts.
// ---------------------------------------------------------------------------
type ColumnsProp = EntityColumnDef<Row>[];
const columns: ColumnsProp = [textColumn<Row>({ field: "title", header: "T" })];
void columns;
