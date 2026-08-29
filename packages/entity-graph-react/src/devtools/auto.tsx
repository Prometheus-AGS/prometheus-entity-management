import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EntityGraphDevtools } from "./host";
import { isEntityGraphDevtoolsEnabled } from "./mode";

export interface AutoEntityGraphDevtoolsHandle {
  unmount(): void;
}

let mounted: { container: HTMLDivElement; root: Root } | null = null;
let pendingMount: (() => void) | null = null;

/** Mount the development-only auto host once. Returns null outside an enabled browser. */
export function mountAutoEntityGraphDevtools(): AutoEntityGraphDevtoolsHandle | null {
  if (!isEntityGraphDevtoolsEnabled("auto") || !document.body) return null;
  if (!mounted) {
    const container = document.createElement("div");
    container.dataset.pemDevtoolsAutoRoot = "";
    document.body.append(container);
    const root = createRoot(container, { identifierPrefix: "pem-devtools-" });
    root.render(createElement(EntityGraphDevtools, { mode: "auto" }));
    mounted = { container, root };
  }
  return { unmount: unmountAutoEntityGraphDevtools };
}

/** Cancel a pending auto mount and remove the mounted development host, if present. */
export function unmountAutoEntityGraphDevtools(): void {
  if (pendingMount) {
    document.removeEventListener("DOMContentLoaded", pendingMount);
    pendingMount = null;
  }
  if (!mounted) return;
  mounted.root.unmount();
  mounted.container.remove();
  mounted = null;
}

function scheduleAutoMount() {
  if (!isEntityGraphDevtoolsEnabled("auto")) return;
  if (document.readyState === "loading") {
    pendingMount = () => {
      pendingMount = null;
      mountAutoEntityGraphDevtools();
    };
    document.addEventListener("DOMContentLoaded", pendingMount, { once: true });
    return;
  }
  mountAutoEntityGraphDevtools();
}

scheduleAutoMount();
