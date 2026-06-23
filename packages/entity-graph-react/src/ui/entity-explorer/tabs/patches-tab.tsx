import React from "react";
import { useStore } from "zustand";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";

export function PatchesTab() {
  const patches = useStore(useGraphStore, (s) => s.patches);

  const rows: Array<{ entityType: string; id: string; patch: Record<string, unknown> }> = [];
  for (const [entityType, bucket] of Object.entries(patches)) {
    if (!bucket) continue;
    for (const [id, patch] of Object.entries(bucket)) {
      if (patch && Object.keys(patch).length > 0) {
        rows.push({ entityType, id, patch: patch as Record<string, unknown> });
      }
    }
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 12, color: "var(--ee-text-muted)", fontSize: 11 }}>
        No pending patches.
      </div>
    );
  }

  return (
    <div>
      {rows.map(({ entityType, id, patch }) => (
        <div
          key={`${entityType}:${id}`}
          style={{ marginBottom: 8, padding: "6px 8px", background: "var(--ee-bg-elevated)", borderRadius: 4 }}
        >
          <div style={{ marginBottom: 4, fontSize: 11, color: "var(--ee-text-muted)" }}>
            <span style={{ color: "var(--ee-text-code)" }}>{entityType}</span>
            {" : "}
            <span>{id}</span>
          </div>
          {Object.entries(patch).map(([key, value]) => (
            <div key={key} className="ee-diff-add" style={{ fontFamily: "var(--ee-font-mono)", fontSize: 11 }}>
              + {key}: {JSON.stringify(value)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
