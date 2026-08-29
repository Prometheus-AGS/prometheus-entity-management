import {
  Suspense,
  createElement,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import type { AttachGraphDevtoolsOptions } from "@prometheus-ags/entity-graph-core/devtools";
import { EntityGraphDevtoolsProvider } from "./provider";
import { isEntityGraphDevtoolsEnabled, type EntityGraphDevtoolsMode } from "./mode";
import { ENTITY_GRAPH_DEVTOOLS_STYLES } from "./styles";

let inspectorEntry: ReturnType<typeof importInspector> | null = null;

function importInspector() {
  return import("./inspector-entry");
}

function loadInspector() {
  inspectorEntry ??= importInspector();
  return inspectorEntry;
}

const LazyInspector = lazy(loadInspector);

/** Preload the optional inspector chunk after the host has established enablement. */
export function preloadEntityGraphDevtools(): Promise<unknown> {
  return loadInspector();
}

export interface EntityGraphDevtoolsProps {
  mode?: EntityGraphDevtoolsMode;
  store?: GraphStore;
  options?: Omit<AttachGraphDevtoolsOptions, "enabled">;
  fallback?: ReactNode;
}

/** SSR-safe explicit host that isolates the lazily loaded inspector in one Shadow Root. */
export function EntityGraphDevtools({
  mode = "auto",
  store,
  options,
  fallback = <div className="pem-devtools-loading" role="status">Loading Graph DevTools…</div>,
}: EntityGraphDevtoolsProps) {
  const enabled = isEntityGraphDevtoolsEnabled(mode);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    const root = hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: "open" });
    if (!root.querySelector("style[data-pem-devtools-styles]")) {
      const style = document.createElement("style");
      style.dataset.pemDevtoolsStyles = "";
      style.textContent = ENTITY_GRAPH_DEVTOOLS_STYLES;
      root.prepend(style);
    }
    setShadowRoot(root);
  }, [enabled]);

  if (!enabled) return null;

  return createElement(
    "div",
    { ref: hostRef, "data-pem-devtools-host": "" },
    shadowRoot && createPortal(
      <EntityGraphDevtoolsProvider store={store} options={options}>
        <Suspense fallback={fallback}>
          <LazyInspector />
        </Suspense>
      </EntityGraphDevtoolsProvider>,
      shadowRoot,
    ),
  );
}
