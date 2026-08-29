import { useEntityGraphDevtools, useEntityGraphDevtoolsSnapshot } from "./provider";

/** Lazy boundary populated by the complete inspector workspace tasks. */
export default function EntityGraphDevtoolsInspectorEntry() {
  const runtime = useEntityGraphDevtools();
  const snapshot = useEntityGraphDevtoolsSnapshot();

  return (
    <section className="pem-devtools-loading" aria-label="Prometheus Entity Graph DevTools">
      <strong>Prometheus Graph DevTools</strong>
      <div role="status" aria-live="polite">
        {runtime.status === "ready" && snapshot
          ? `${snapshot.counts.entities} entities · ${runtime.storeId}`
          : "Connecting to entity graph…"}
      </div>
    </section>
  );
}
