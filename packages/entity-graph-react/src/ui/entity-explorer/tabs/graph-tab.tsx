import React, { useMemo } from "react";
import { useStore } from "zustand";
import { useEntityExplorer } from "../context";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { getSchema } from "@prometheus-ags/entity-graph-core";

/**
 * Graph tab (change C6) — relationship visualization of the entity graph.
 *
 * We store a normalized graph but have never *drawn* it. This tab renders entity
 * types as nodes (sized by instance count) and registered relations as directed
 * edges, using a dependency-light SVG layout (radial — no graph library).
 *
 * Nodes come from the live graph (`entities`); edges come from the relations
 * registry (`getSchema(type).relations`) for the types currently present. Click
 * a type to select its first instance in the shared detail pane.
 *
 * Node count is capped with a visible notice (no silent truncation).
 */

const MAX_NODES = 40;

interface GraphNode {
  type: string;
  count: number;
  x: number;
  y: number;
}
interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

export function GraphTab() {
  const { dispatch } = useEntityExplorer();
  const entities = useStore(useGraphStore, (s) => s.entities);

  const { nodes, edges, truncated, totalTypes } = useMemo(() => {
    const allTypes = Object.keys(entities).filter((t) => Object.keys(entities[t] ?? {}).length > 0);
    const totalTypes = allTypes.length;
    const types = allTypes.slice(0, MAX_NODES);
    const truncated = totalTypes - types.length;

    // Radial layout: evenly space types around a circle.
    const cx = 180;
    const cy = 140;
    const r = Math.min(120, 40 + types.length * 8);
    const nodes: GraphNode[] = types.map((type, i) => {
      const angle = (i / Math.max(1, types.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        type,
        count: Object.keys(entities[type] ?? {}).length,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });

    const present = new Set(types);
    const edges: GraphEdge[] = [];
    for (const type of types) {
      const schema = getSchema(type);
      if (!schema?.relations) continue;
      for (const [name, rel] of Object.entries(schema.relations)) {
        if (present.has(rel.targetType)) {
          edges.push({ from: type, to: rel.targetType, label: name });
        }
      }
    }
    return { nodes, edges, truncated, totalTypes };
  }, [entities]);

  const nodePos = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.type, n);
    return m;
  }, [nodes]);

  function selectType(type: string) {
    const ids = Object.keys(entities[type] ?? {});
    if (ids[0]) dispatch({ type: "SELECT_ENTITY", entityType: type, id: ids[0] });
  }

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 12, color: "var(--ee-text-muted)", fontSize: 11 }}>
        No entities in the graph yet — load data to see the relationship graph.
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto", padding: 8 }}>
      {truncated > 0 && (
        <div style={{ color: "var(--ee-text-muted)", fontSize: 10, marginBottom: 4 }}>
          Showing {nodes.length} of {totalTypes} entity types ({truncated} hidden by cap)
        </div>
      )}
      <svg width="360" height="280" role="img" aria-label="Entity relationship graph">
        {edges.map((e, i) => {
          const a = nodePos.get(e.from);
          const b = nodePos.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--ee-edge, #555)" strokeWidth={1}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.type} transform={`translate(${n.x},${n.y})`} style={{ cursor: "pointer" }}
            onClick={() => selectType(n.type)} role="button" aria-label={`${n.type} (${n.count})`}>
            <circle r={Math.min(22, 8 + Math.log2(n.count + 1) * 3)} fill="var(--ee-node, #2b6cb0)" />
            <text textAnchor="middle" dy="-1.4em" fontSize={9} fill="var(--ee-text, #ddd)">{n.type}</text>
            <text textAnchor="middle" dy="0.3em" fontSize={9} fill="#fff">{n.count}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
