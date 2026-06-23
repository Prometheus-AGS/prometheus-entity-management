/**
 * entity-diff.tsx — EntityDiff: renders a field-level diff of an entity.
 *
 * Supports two modes:
 * - Uncontrolled: manages its own useEntityDiff state (showControls=true default)
 * - Controlled: accepts an external diff result via the `diff` prop (used by
 *   EntityApproval to share a single hook instance)
 *
 * Reuses core time-travel (recordGraphSnapshot / restoreGraphSnapshot) through
 * the useEntityDiff hook layer.
 */

import React from "react";
import { useEntityDiff, type UseEntityDiffOptions } from "./use-entity-diff.js";
import type { FieldDiff, EntityDiffResult } from "./types.js";

export interface EntityDiffClassNames {
  root?: string;
  table?: string;
  headerRow?: string;
  headerCell?: string;
  row?: string;
  rowAdd?: string;
  rowRemove?: string;
  rowReplace?: string;
  rowUnchanged?: string;
  cellField?: string;
  cellBefore?: string;
  cellAfter?: string;
  cellOp?: string;
  emptyState?: string;
  controls?: string;
  captureButton?: string;
  recomputeButton?: string;
  restoreButton?: string;
}

export interface EntityDiffProps extends UseEntityDiffOptions {
  /**
   * Controlled mode: pass an external diff result (e.g. from a parent
   * EntityApproval that owns the hook). When provided, the component's internal
   * useEntityDiff hook is still created (hooks rules require unconditional calls)
   * but rendering uses the controlled diff.
   */
  externalDiff?: EntityDiffResult | null;
  /** Whether to show control buttons (capture/recompute/restore). Default: true */
  showControls?: boolean;
  /** Custom renderer for a single field diff row. */
  renderRow?: (diff: FieldDiff, index: number) => React.ReactNode;
  /** Custom value formatter; defaults to JSON.stringify. */
  formatValue?: (value: unknown) => string;
  classNames?: EntityDiffClassNames;
  className?: string;
}

function defaultFormatValue(v: unknown): string {
  if (v === undefined) return "(none)";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function opLabel(op: FieldDiff["op"]): string {
  switch (op) {
    case "add": return "+";
    case "remove": return "−";
    case "replace": return "~";
    case "unchanged": return "=";
  }
}

function rowClassForOp(op: FieldDiff["op"], classNames: EntityDiffClassNames): string {
  const base = classNames.row ?? "a2ui-diff__row";
  const modifier = {
    add: classNames.rowAdd ?? "a2ui-diff__row--add",
    remove: classNames.rowRemove ?? "a2ui-diff__row--remove",
    replace: classNames.rowReplace ?? "a2ui-diff__row--replace",
    unchanged: classNames.rowUnchanged ?? "a2ui-diff__row--unchanged",
  }[op];
  return [base, modifier].join(" ");
}

/**
 * EntityDiff — renders a before/after field-level diff for a single entity.
 */
export function EntityDiff({
  entityType,
  entityId,
  includeUnchanged,
  externalDiff,
  showControls = true,
  renderRow,
  formatValue = defaultFormatValue,
  classNames = {},
  className,
}: EntityDiffProps): React.ReactElement {
  // Always call the hook (rules of hooks), but use externalDiff if provided.
  const internal = useEntityDiff({ entityType, entityId, includeUnchanged });
  const { diff, captureBaseline, restoreBaseline, recompute } = internal;

  // Use controlled diff if provided, else the internal one.
  const activeDiff = externalDiff !== undefined ? externalDiff : diff;

  return (
    <div
      className={[classNames.root ?? "a2ui-diff", className].filter(Boolean).join(" ")}
      aria-label={`Field diff for ${entityType} ${entityId}`}
    >
      {showControls && (
        <div className={classNames.controls ?? "a2ui-diff__controls"}>
          <button
            type="button"
            className={classNames.captureButton ?? "a2ui-diff__btn a2ui-diff__btn--capture"}
            onClick={() => captureBaseline()}
          >
            Capture baseline
          </button>
          <button
            type="button"
            className={classNames.recomputeButton ?? "a2ui-diff__btn a2ui-diff__btn--recompute"}
            onClick={() => recompute()}
          >
            Recompute diff
          </button>
          <button
            type="button"
            className={classNames.restoreButton ?? "a2ui-diff__btn a2ui-diff__btn--restore"}
            onClick={() => restoreBaseline()}
          >
            Restore baseline
          </button>
        </div>
      )}

      {!activeDiff || activeDiff.fields.length === 0 ? (
        <div className={classNames.emptyState ?? "a2ui-diff__empty"}>
          {activeDiff ? "No differences detected." : "Capture a baseline to see diffs."}
        </div>
      ) : (
        <table className={classNames.table ?? "a2ui-diff__table"} role="table">
          <thead>
            <tr className={classNames.headerRow ?? "a2ui-diff__header"}>
              <th className={classNames.headerCell ?? "a2ui-diff__th"} scope="col">Op</th>
              <th className={classNames.headerCell ?? "a2ui-diff__th"} scope="col">Field</th>
              <th className={classNames.headerCell ?? "a2ui-diff__th"} scope="col">Before</th>
              <th className={classNames.headerCell ?? "a2ui-diff__th"} scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {activeDiff.fields.map((field, idx) =>
              renderRow ? (
                <React.Fragment key={field.field}>{renderRow(field, idx)}</React.Fragment>
              ) : (
                <tr
                  key={field.field}
                  className={rowClassForOp(field.op, classNames)}
                  data-op={field.op}
                >
                  <td className={classNames.cellOp ?? "a2ui-diff__td a2ui-diff__td--op"}>
                    <span aria-label={field.op}>{opLabel(field.op)}</span>
                  </td>
                  <td className={classNames.cellField ?? "a2ui-diff__td a2ui-diff__td--field"}>
                    <code>{field.field}</code>
                  </td>
                  <td className={classNames.cellBefore ?? "a2ui-diff__td a2ui-diff__td--before"}>
                    <code>{field.op !== "add" ? formatValue(field.before) : ""}</code>
                  </td>
                  <td className={classNames.cellAfter ?? "a2ui-diff__td a2ui-diff__td--after"}>
                    <code>{field.op !== "remove" ? formatValue(field.after) : ""}</code>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
