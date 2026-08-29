import { useEffect } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import { attachGraphDevtools } from "@prometheus-ags/entity-graph-core/devtools";

/** Keep the deprecated timeline facade backed by the owning store controller. */
export function useLegacyTimeTravelController(store: GraphStore): void {
  useEffect(() => {
    const attachment = attachGraphDevtools(store);
    return () => attachment.detach();
  }, [store]);
}
