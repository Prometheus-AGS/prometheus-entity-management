import React, { useRef } from "react";
import { useStore } from "zustand";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGraphStore } from "../../../graph";
import { useEntityExplorer } from "../context";

interface EntityRow {
  entityType: string;
  id: string;
}

export function EntitiesTab() {
  const { state, dispatch } = useEntityExplorer();
  const entities = useStore(useGraphStore, (s) => s.entities);

  // Flatten entity map into a list of rows
  const rows: EntityRow[] = [];
  for (const [entityType, bucket] of Object.entries(entities)) {
    if (!bucket) continue;
    for (const id of Object.keys(bucket)) {
      rows.push({ entityType, id });
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <div ref={scrollRef} style={{ height: "100%", overflow: "auto" }}>
      {rows.length === 0 && (
        <div style={{ padding: 12, color: "var(--ee-text-muted)", fontSize: 11 }}>
          No entities in store.
        </div>
      )}
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((vItem) => {
          const row = rows[vItem.index]!;
          const isSelected =
            state.selectedEntityId === row.id &&
            state.selectedEntityType === row.entityType;
          return (
            <div
              key={`${row.entityType}:${row.id}`}
              className="ee-entity-row"
              aria-selected={isSelected}
              role="button"
              tabIndex={0}
              style={{
                position: "absolute",
                top: vItem.start,
                left: 0,
                right: 0,
                height: vItem.size,
              }}
              onClick={() =>
                dispatch({ type: "SELECT_ENTITY", entityType: row.entityType, id: row.id })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  dispatch({ type: "SELECT_ENTITY", entityType: row.entityType, id: row.id });
                }
              }}
            >
              <span style={{ color: "var(--ee-text-muted)" }}>{row.entityType}</span>
              <span>{row.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
