/**
 * entity-interrupt-approval.tsx — human decision on an AG-UI 1.0 interrupt.
 *
 * Presentational: it shows one interrupt and reports approve, deny or
 * edit-before-approve to `onDecide`. `useChatSession().resolveInterrupt` takes
 * that decision to the A2UI action policy, so an approval is still authorized,
 * executed and audited like any other action, and then resumes the run.
 *
 * Layering: Component → useChatSession (hook) → ChatConversationStore (store).
 */
import React, { useState } from "react";
import type { ChatInterrupt } from "./chat/interrupts.js";
import type { ChatInterruptDecision } from "./use-chat-session.js";

export interface EntityInterruptApprovalProps {
  interrupt: ChatInterrupt;
  onDecide: (decision: ChatInterruptDecision) => void | Promise<void>;
  /** Allow editing the payload before approving. Default: true */
  allowEdit?: boolean;
  /** The values offered for editing; defaults to the interrupt's declared action context. */
  initialPayload?: Record<string, unknown>;
  approveLabel?: string;
  denyLabel?: string;
  className?: string;
}

function declaredContext(interrupt: ChatInterrupt): Record<string, unknown> | undefined {
  const declared = interrupt.metadata?.["prometheus.action"];
  if (!declared || typeof declared !== "object" || Array.isArray(declared)) return undefined;
  const context = (declared as { context?: unknown }).context;
  return context && typeof context === "object" && !Array.isArray(context)
    ? (context as Record<string, unknown>)
    : undefined;
}

/**
 * Renders an AG-UI interrupt for a human decision: approve (optionally with edited values) or deny.
 * The decision is passed to `onDecide`; the action policy still decides whether it executes.
 */
export function EntityInterruptApproval({
  interrupt,
  onDecide,
  allowEdit = true,
  initialPayload,
  approveLabel = "Approve",
  denyLabel = "Deny",
  className,
}: EntityInterruptApprovalProps): React.ReactElement {
  const seed = initialPayload ?? declaredContext(interrupt);
  const [draft, setDraft] = useState(() => (seed ? JSON.stringify(seed, null, 2) : ""));
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async (decision: ChatInterruptDecision): Promise<void> => {
    setBusy(true);
    try {
      await onDecide(decision);
    } finally {
      setBusy(false);
    }
  };

  const approve = (): void => {
    if (!allowEdit || draft.trim() === "") {
      void decide({ approved: true, ...(seed ? { payload: seed } : {}) });
      return;
    }
    try {
      const payload: unknown = JSON.parse(draft);
      setParseError(null);
      void decide({ approved: true, payload });
    } catch {
      setParseError("The edited values are not valid JSON.");
    }
  };

  return (
    <section
      className={["a2ui-interrupt", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={`Approval needed: ${interrupt.reason}`}
      data-interrupt-id={interrupt.id}
    >
      <p className="a2ui-interrupt__reason">{interrupt.message ?? interrupt.reason}</p>
      {allowEdit && seed && (
        <label className="a2ui-interrupt__edit">
          <span>Values to approve</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            spellCheck={false}
            aria-invalid={parseError ? true : undefined}
          />
        </label>
      )}
      {parseError && (
        <p className="a2ui-interrupt__error" role="alert">
          {parseError}
        </p>
      )}
      <div className="a2ui-interrupt__actions">
        <button type="button" onClick={approve} disabled={busy}>
          {approveLabel}
        </button>
        <button type="button" onClick={() => void decide({ approved: false })} disabled={busy}>
          {denyLabel}
        </button>
      </div>
    </section>
  );
}
