/**
 * entity-approval.tsx — EntityApproval: human-in-the-loop review of agent changes.
 *
 * Built on top of:
 * - useEntityDiff (which reuses recordGraphSnapshot / restoreGraphSnapshot)
 * - EntityDiff for the visual before/after diff table (controlled via externalDiff)
 *
 * Flow:
 * 1. Before the agent stream starts, `autoCapture` (default true) captures a
 *    baseline on mount.
 * 2. After the stream completes, click "Refresh diff" to recompute.
 * 3. User approves → `onApprove(diff)` is called; graph keeps new state.
 * 4. User rejects → `onReject(diff)` is called; graph is restored to baseline.
 *
 * Layering: Component → useEntityDiff hook → recordGraphSnapshot /
 * restoreGraphSnapshot (store writes). No direct store access here.
 */

import React, { useEffect } from "react";
import { EntityDiff } from "./entity-diff.js";
import { useEntityDiff } from "./use-entity-diff.js";
import type { EntityDiffResult } from "./types.js";

export interface EntityApprovalProps {
  entityType: string;
  entityId: string;
  /** Automatically capture a baseline snapshot on mount. Default: true */
  autoCapture?: boolean;
  /** Include unchanged fields in the diff view. Default: false */
  includeUnchanged?: boolean;
  /** Called when the user approves; the entity graph keeps the new state. */
  onApprove?: (diff: EntityDiffResult) => void;
  /** Called when the user rejects; the graph is rewound to the baseline. */
  onReject?: (diff: EntityDiffResult) => void;
  /** Label for the approve button. Default: "Approve" */
  approveLabel?: string;
  /** Label for the reject/restore button. Default: "Reject & Restore" */
  rejectLabel?: string;
  /** Title heading. */
  title?: string;
  /** Additional CSS class on the root element. */
  className?: string;
  /** Render override for the diff section. */
  renderDiff?: (diff: EntityDiffResult | null) => React.ReactNode;
  /** Render override for the action buttons. */
  renderActions?: (opts: {
    onApprove: () => void;
    onReject: () => void;
    hasChanges: boolean;
  }) => React.ReactNode;
}

/**
 * EntityApproval — human-in-the-loop gate for agent-proposed entity changes.
 *
 * @example
 * ```tsx
 * <EntityApproval
 *   entityType="Invoice"
 *   entityId="inv_456"
 *   autoCapture
 *   onApprove={(diff) => console.log("Approved", diff)}
 *   onReject={(diff) => console.log("Rejected, graph restored", diff)}
 * />
 * ```
 */
export function EntityApproval({
  entityType,
  entityId,
  autoCapture = true,
  includeUnchanged = false,
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Reject & Restore",
  title,
  className,
  renderDiff,
  renderActions,
}: EntityApprovalProps): React.ReactElement {
  const { diff, captureBaseline, recompute, restoreBaseline } = useEntityDiff({
    entityType,
    entityId,
    includeUnchanged,
  });

  useEffect(() => {
    if (autoCapture) {
      captureBaseline();
    }
    // Only run on mount / entity identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const hasChanges = Boolean(diff && diff.fields.length > 0);

  const handleApprove = () => {
    if (diff) onApprove?.(diff);
  };

  const handleReject = () => {
    const wasRestored = restoreBaseline();
    if (wasRestored && diff) onReject?.(diff);
  };

  const displayTitle = title ?? `Review changes — ${entityType} ${entityId}`;

  return (
    <section
      className={["a2ui-approval", className].filter(Boolean).join(" ")}
      aria-label={displayTitle}
    >
      <header className="a2ui-approval__header">
        <h2 className="a2ui-approval__title">{displayTitle}</h2>
        <button
          type="button"
          className="a2ui-approval__btn a2ui-approval__btn--recompute"
          onClick={() => recompute()}
          aria-label="Refresh diff"
        >
          Refresh diff
        </button>
      </header>

      <div className="a2ui-approval__body">
        {renderDiff ? (
          renderDiff(diff)
        ) : (
          // Pass diff as externalDiff so EntityDiff uses our hook's state
          <EntityDiff
            entityType={entityType}
            entityId={entityId}
            includeUnchanged={includeUnchanged}
            showControls={false}
            externalDiff={diff}
          />
        )}
      </div>

      <footer className="a2ui-approval__footer">
        {renderActions ? (
          renderActions({
            onApprove: handleApprove,
            onReject: handleReject,
            hasChanges,
          })
        ) : (
          <>
            <button
              type="button"
              className="a2ui-approval__btn a2ui-approval__btn--approve"
              onClick={handleApprove}
              disabled={!hasChanges}
              aria-label={approveLabel}
            >
              {approveLabel}
            </button>
            <button
              type="button"
              className="a2ui-approval__btn a2ui-approval__btn--reject"
              onClick={handleReject}
              disabled={!hasChanges}
              aria-label={rejectLabel}
            >
              {rejectLabel}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
