import type { GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";
import { eventTitle, formatEventTime } from "../event-format";
import { graphPulseImpact } from "../causality";

export interface GraphPulseProps {
  events: readonly GraphDevtoolsEvent[];
  selected: GraphDevtoolsEvent | null;
  collapsed: boolean;
  onToggleCollapsed(): void;
  onSelect(event: GraphDevtoolsEvent): void;
}

export function GraphPulse({
  events,
  selected,
  collapsed,
  onToggleCollapsed,
  onSelect,
}: GraphPulseProps) {
  const segments = events.slice(-24);
  return (
    <footer className="pem-graph-pulse" data-collapsed={collapsed} aria-label="Graph Pulse causal ribbon">
      <button
        type="button"
        className="pem-pulse-toggle"
        aria-expanded={!collapsed}
        aria-controls="pem-pulse-segments"
        onClick={onToggleCollapsed}
      >
        <span aria-hidden="true">⌁</span> Graph Pulse
      </button>
      {!collapsed && (
        <>
          <ol id="pem-pulse-segments" className="pem-pulse-segments" aria-label="Recent correlated graph events">
            {segments.length === 0 ? (
              <li className="pem-pulse-empty">Waiting for a graph publication</li>
            ) : segments.map((event) => (
              <li key={event.eventId}>
                <button
                  type="button"
                  data-event-type={event.type}
                  data-selected={event.eventId === selected?.eventId}
                  aria-label={`${eventTitle(event)}, ${graphPulseImpact(event)}, ${formatEventTime(event)}`}
                  title={`${eventTitle(event)} · ${graphPulseImpact(event)}`}
                  onClick={() => onSelect(event)}
                >
                  <span aria-hidden="true" />
                  <small>#{event.sequence}</small>
                </button>
              </li>
            ))}
          </ol>
          <div className="pem-pulse-readout" role="status">
            {selected ? (
              <>
                <strong>{eventTitle(selected)}</strong>
                <span>{graphPulseImpact(selected)}</span>
                <code translate="no">{selected.correlationId}</code>
              </>
            ) : <span>Select a segment to trace its graph impact.</span>}
          </div>
        </>
      )}
    </footer>
  );
}
