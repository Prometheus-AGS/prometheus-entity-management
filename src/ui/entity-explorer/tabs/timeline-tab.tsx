import React, { useEffect, useRef, useState } from "react";
import { useEntityExplorer } from "../context";
import { type DevtoolsEvent } from "../../../engine";
import { useGraphStore } from "../../../graph";
import { exportGraphSnapshot } from "../../../ai-interop";

/**
 * Timeline tab (change C5) — time-travel-style inspection of the entity graph.
 *
 * Built entirely on existing in-repo materials:
 * - the devtools event stream (via the bus) is the chronological action log
 * - `exportGraphSnapshot` produces the current graph state for export
 *
 * Capabilities:
 * - chronological list of graph mutations (newest first), selectable
 * - per-event field summary (the change payload), for before/after reasoning
 * - snapshot export (download JSON) and import (load into a read-only view)
 *
 * Inspection is read-only: this never writes back into the live graph, so it is
 * safe to leave mounted in development.
 */

const MAX_TIMELINE = 500;

interface TimelineEntry {
  event: DevtoolsEvent;
  seq: number;
}

function describePayload(event: DevtoolsEvent): string {
  if ("data" in event && event.data && typeof event.data === "object") {
    return Object.keys(event.data as Record<string, unknown>).join(", ") || "(empty)";
  }
  if ("patch" in event && event.patch && typeof event.patch === "object") {
    return Object.keys(event.patch as Record<string, unknown>).join(", ") || "(empty)";
  }
  if ("idCount" in event) return `${event.idCount} ids`;
  return "—";
}

export function TimelineTab() {
  const { bus } = useEntityExplorer();
  const seqRef = useRef(0);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bus.subscribe((event) => {
      setEntries((prev) => {
        const next = [{ event, seq: seqRef.current++ }, ...prev];
        return next.length > MAX_TIMELINE ? next.slice(0, MAX_TIMELINE) : next;
      });
    });
    return unsub;
  }, [bus]);

  function handleExport() {
    const s = useGraphStore.getState();
    const json = exportGraphSnapshot({
      scope: "entity-graph",
      data: {
        entities: s.entities,
        patches: s.patches,
        lists: s.lists,
        syncMetadata: s.syncMetadata,
      },
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `graph-snapshot-${entries.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImported(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  const selectedEntry = selected !== null ? entries.find((x) => x.seq === selected) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid var(--ee-border, #333)" }}>
        <button className="ee-tab" onClick={handleExport}>Export snapshot</button>
        <label className="ee-tab" style={{ cursor: "pointer" }}>
          Import snapshot
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={handleImport} />
        </label>
        <span style={{ marginLeft: "auto", color: "var(--ee-text-muted)", fontSize: 11 }}>
          {entries.length} step{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {entries.length === 0 && (
          <div style={{ padding: 12, color: "var(--ee-text-muted)", fontSize: 11 }}>
            No graph mutations yet — interact with the app to populate the timeline.
          </div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.seq}
            className="ee-event-row"
            role="button"
            tabIndex={0}
            aria-pressed={selected === entry.seq}
            onClick={() => setSelected(entry.seq === selected ? null : entry.seq)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(entry.seq === selected ? null : entry.seq)}
            style={{ background: selected === entry.seq ? "var(--ee-row-selected, rgba(255,255,255,0.06))" : undefined, cursor: "pointer" }}
          >
            <span className="ee-event-kind" data-kind={entry.event.kind}>{entry.event.kind}</span>
            {"type" in entry.event && <span style={{ color: "var(--ee-text-muted)" }}>{entry.event.type}</span>}
            {"id" in entry.event && <span>{entry.event.id}</span>}
            <span style={{ marginLeft: "auto", color: "var(--ee-text-muted)", fontSize: 10 }}>
              {new Date(entry.event.at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {selectedEntry && (
        <div style={{ padding: 8, borderTop: "1px solid var(--ee-border, #333)", fontSize: 11 }}>
          <div style={{ color: "var(--ee-text-muted)", marginBottom: 4 }}>changed fields</div>
          <code style={{ color: "var(--ee-text-code, #9cdcfe)" }}>{describePayload(selectedEntry.event)}</code>
        </div>
      )}

      {imported && (
        <div style={{ padding: 8, borderTop: "1px solid var(--ee-border, #333)", fontSize: 10, maxHeight: 120, overflow: "auto" }}>
          <div style={{ color: "var(--ee-text-muted)", marginBottom: 4 }}>imported snapshot (read-only)</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{imported.slice(0, 2000)}</pre>
        </div>
      )}
    </div>
  );
}
