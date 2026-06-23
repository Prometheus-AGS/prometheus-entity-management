import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useEntityExplorer, type EntityExplorerState } from "./context";
import { EntitiesTab } from "./tabs/entities-tab";
import { PatchesTab } from "./tabs/patches-tab";
import { EventsTab } from "./tabs/events-tab";
import { PerformanceTab } from "./tabs/performance-tab";
import { TimelineTab } from "./tabs/timeline-tab";
import { GraphTab } from "./tabs/graph-tab";

type Tab = EntityExplorerState["activeTab"];

const TABS: { id: Tab; label: string }[] = [
  { id: "entities", label: "Entities" },
  { id: "patches", label: "Patches" },
  { id: "events", label: "Events" },
  { id: "timeline", label: "Timeline" },
  { id: "graph", label: "Graph" },
  { id: "performance", label: "Performance" },
];

function DetailPane() {
  const { state, dispatch } = useEntityExplorer();
  if (!state.selectedEntityId) return null;
  return (
    <div className="ee-detail-pane">
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--ee-text-muted)", fontSize: 11 }}>
          {state.selectedEntityType} : {state.selectedEntityId}
        </span>
        <button
          style={{ background: "none", border: "none", color: "var(--ee-text-muted)", cursor: "pointer", fontSize: 12 }}
          aria-label="Close detail pane"
          onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--ee-text-code)" }}>
        {state.selectedEntityId}
      </div>
    </div>
  );
}

function TabBar() {
  const { state, dispatch } = useEntityExplorer();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else return;
    e.preventDefault();
    const nextTab = TABS[next]!;
    dispatch({ type: "SET_TAB", tab: nextTab.id });
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="ee-tablist" role="tablist" aria-label="Entity Explorer tabs">
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[i] = el; }}
          className="ee-tab"
          role="tab"
          id={`ee-tab-${tab.id}`}
          aria-selected={state.activeTab === tab.id}
          aria-controls={`ee-panel-${tab.id}`}
          tabIndex={state.activeTab === tab.id ? 0 : -1}
          onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface EntityExplorerPanelProps {
  /**
   * When true, render the panel inline (no portal) and always visible.
   * Used by the Chrome MV3 extension where the panel IS the DevTools page.
   */
  forceOpen?: boolean;
}

export function EntityExplorerPanel({ forceOpen = false }: EntityExplorerPanelProps) {
  const { state } = useEntityExplorer();
  // Track first open so we mount tabs once and keep them mounted (display:none when inactive)
  const [everOpened, setEverOpened] = useState(state.open || forceOpen);
  useEffect(() => { if (state.open || forceOpen) setEverOpened(true); }, [state.open, forceOpen]);

  const visible = forceOpen || state.open;
  const panel = (
    <div
      className="ee-root ee-panel"
      role="region"
      aria-label="Entity Explorer"
      style={{ display: (visible || everOpened) ? (visible ? undefined : "none") : "none" }}
    >
      <TabBar />
      <div className="ee-tabcontent">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className="ee-tabpanel"
            role="tabpanel"
            id={`ee-panel-${tab.id}`}
            aria-labelledby={`ee-tab-${tab.id}`}
            data-hidden={state.activeTab !== tab.id ? "true" : undefined}
          >
            {tab.id === "entities" && <EntitiesTab />}
            {tab.id === "patches" && <PatchesTab />}
            {tab.id === "events" && <EventsTab />}
            {tab.id === "timeline" && <TimelineTab />}
            {tab.id === "graph" && <GraphTab />}
            {tab.id === "performance" && <PerformanceTab />}
          </div>
        ))}
        {state.selectedEntityId && <DetailPane />}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  // In forceOpen mode (e.g. Chrome extension panel), render inline — no portal needed.
  if (forceOpen) return panel;
  return ReactDOM.createPortal(panel, document.body);
}
