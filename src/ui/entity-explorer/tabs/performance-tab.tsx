import React, { useEffect, useRef, useState } from "react";
import { useEntityExplorer } from "../context";
import { type DevtoolsEvent } from "../../../engine";

export function PerformanceTab() {
  const { bus } = useEntityExplorer();
  const [opsPerSec, setOpsPerSec] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const recentTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    const unsub = bus.subscribe((event: DevtoolsEvent) => {
      const now = Date.now();
      const eventTime = new Date(event.at).getTime();
      setLastLatencyMs(now - eventTime);

      // Track events in a 1-second rolling window
      recentTimestampsRef.current = [
        ...recentTimestampsRef.current.filter((t) => now - t < 1000),
        now,
      ];
      setOpsPerSec(recentTimestampsRef.current.length);
    });

    // Decay ops/sec counter every 500ms when no events
    const interval = setInterval(() => {
      const now = Date.now();
      recentTimestampsRef.current = recentTimestampsRef.current.filter((t) => now - t < 1000);
      setOpsPerSec(recentTimestampsRef.current.length);
    }, 500);

    return () => { unsub(); clearInterval(interval); };
  }, [bus]);

  return (
    <div style={{ padding: 8 }}>
      <div className="ee-perf-metric">
        <span className="ee-perf-label">ops / sec</span>
        <span className="ee-perf-value">{opsPerSec}</span>
      </div>
      <div className="ee-perf-metric">
        <span className="ee-perf-label">last op latency</span>
        <span className="ee-perf-value">
          {lastLatencyMs !== null ? `${lastLatencyMs}ms` : "—"}
        </span>
      </div>
    </div>
  );
}
