/**
 * features/PlatformPanel.tsx
 *
 * Platform lane panel: native ping, durable persist/restore buttons (offline
 * restart path, design D-3), lifecycle status, deep-link target, and the
 * bridge receipt log. All actions flow through the bridge; denials render as
 * visible alerts instead of being swallowed.
 */
import { useEffect, useState } from "react";
import { BridgeDeniedError, type BridgeReceipt, type PlatformPingResult } from "../platform/bridge";
import { getBridge } from "../platform";

export function PlatformPanel({
  onNavigateTask,
  lastDenial,
}: {
  onNavigateTask: (taskId: string) => void;
  lastDenial: string | null;
}) {
  const [lane, setLane] = useState<PlatformPingResult | null>(null);
  const [laneError, setLaneError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<BridgeReceipt[]>([]);
  const [lifecycleTick, setLifecycleTick] = useState(0);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  useEffect(() => {
    const bridge = getBridge();
    bridge
      .lane()
      .then(setLane)
      .catch((error: unknown) =>
        setLaneError(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setReceipts(bridge.receipts()));

    const offLifecycle = bridge.onLifecycleResumed(() => setLifecycleTick((n) => n + 1));
    const offDeepLink = bridge.onDeepLink((taskId) => {
      setDeepLink(taskId);
      onNavigateTask(taskId);
    });
    return () => {
      offLifecycle();
      offDeepLink();
    };
  }, [onNavigateTask]);

  const run = async (action: "persist" | "restore") => {
    const bridge = getBridge();
    try {
      if (action === "persist") await bridge.persistNow();
      else await bridge.restoreNow();
    } catch (error) {
      if (error instanceof BridgeDeniedError) setLaneError(error.message);
    } finally {
      setReceipts(bridge.receipts());
    }
  };

  return (
    <section aria-label="Platform" className="platform">
      <h2>Platform lane</h2>
      <p data-testid="lane-label">
        Lane: <strong>{lane ? `${lane.platform} (${lane.plugin})` : (laneError ?? "…")}</strong>
      </p>
      <p>Lifecycle resumes observed: {lifecycleTick}</p>
      {deepLink ? <p data-testid="deep-link-target">Deep link opened task: {deepLink}</p> : null}
      {lastDenial ? (
        <p role="alert" data-testid="denial-banner">
          {lastDenial}
        </p>
      ) : null}

      <div className="detail-actions">
        <button type="button" onClick={() => void run("persist")}>
          Persist snapshot (offline restart)
        </button>
        <button type="button" onClick={() => void run("restore")}>
          Restore snapshot
        </button>
      </div>

      <h3>Bridge receipts</h3>
      <ul className="receipt-list" aria-label="Bridge receipts">
        {receipts.map((receipt) => (
          <li key={`${receipt.at}-${receipt.action}`} className={receipt.ok ? "ok" : "denied"}>
            {receipt.action} — {receipt.ok ? "ok" : "denied"} ({receipt.detail})
          </li>
        ))}
      </ul>
    </section>
  );
}
