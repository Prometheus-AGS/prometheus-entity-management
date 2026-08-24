/**
 * Client-side demo fetch instrumentation.
 *
 * The demo "backend" is an in-browser store, so there is no network layer to
 * observe. This module records every demo-store read so the browser evidence
 * can prove that SSR-hydrated entities and lists are not fetched again inside
 * the fresh window (`staleTime`). It is a no-op on the server.
 */

export interface DemoFetchMetrics {
  startedAt: string;
  reads: Record<string, number>;
  log: string[];
}

declare global {
  interface Window {
    __pemFetchMetrics?: DemoFetchMetrics;
  }
}

function metrics(): DemoFetchMetrics | null {
  if (typeof window === "undefined") return null;
  window.__pemFetchMetrics ??= { startedAt: new Date().toISOString(), reads: {}, log: [] };
  return window.__pemFetchMetrics;
}

export function recordDemoRead(operation: string): void {
  const m = metrics();
  if (!m) return;
  m.reads[operation] = (m.reads[operation] ?? 0) + 1;
  m.log.push(`${new Date().toISOString()} ${operation}`);
  if (m.log.length > 200) m.log.splice(0, m.log.length - 200);
}

export function readDemoFetchMetrics(): DemoFetchMetrics | null {
  return metrics();
}
