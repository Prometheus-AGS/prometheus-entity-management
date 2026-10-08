export interface CommandFeedbackProps {
  readonly pending: string | null;
  readonly error: string | null;
  readonly notice: string | null;
  readonly onDismiss: () => void;
}

/**
 * Two stable live regions: a polite status region for progress and notices, and an alert for
 * errors. Both stay mounted so assistive technology announces content changes; a single element
 * that swaps its role between "status" and "alert" is not announced reliably.
 */
export function CommandFeedback({ pending, error, notice, onDismiss }: CommandFeedbackProps) {
  const state = error ? "error" : notice ? "success" : pending ? "pending" : "idle";
  return (
    <div className="pem-command-feedback" data-state={state}>
      <div role="status" aria-live="polite" className="pem-command-status">
        {pending && !error && <span>Working: {pending}…</span>}
        {notice && !error && <span>{notice}</span>}
      </div>
      <div role="alert" className="pem-command-alert">
        {error && <span>{error}</span>}
      </div>
      {(error || notice) && (
        <button type="button" aria-label="Dismiss command message" onClick={onDismiss}>×</button>
      )}
    </div>
  );
}
