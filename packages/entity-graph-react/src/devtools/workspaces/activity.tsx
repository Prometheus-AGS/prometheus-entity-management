import type { GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";
import { InspectorVirtualList } from "../components/virtual-list";
import { eventDetail, eventTitle, formatEventTime } from "../event-format";
import type { ActivityTypeFilter } from "../view-model";

export interface ActivityWorkspaceProps {
  events: readonly GraphDevtoolsEvent[];
  selected: GraphDevtoolsEvent | null;
  selectedExpired: boolean;
  filter: ActivityTypeFilter;
  onFilter(filter: ActivityTypeFilter): void;
  paused: boolean;
  onTogglePaused(): void;
  onSelect(event: GraphDevtoolsEvent): void;
}

const filters: readonly ActivityTypeFilter[] = [
  "all",
  "mutation",
  "view",
  "time-travel",
  "diagnostic",
  "lifecycle",
];

export function ActivityWorkspace(props: ActivityWorkspaceProps) {
  return (
    <section className="pem-workspace pem-activity-workspace" aria-labelledby="pem-activity-title">
      <aside className="pem-navigator pem-activity-nav" aria-label="Graph activity stream">
        <div className="pem-navigator-heading pem-activity-heading">
          <div><p className="pem-eyebrow">Retained history</p><h2 id="pem-activity-title">Activity</h2></div>
          <button type="button" className="pem-pause" aria-pressed={props.paused} onClick={props.onTogglePaused}>
            {props.paused ? "▶ Resume" : "Ⅱ Pause"}
          </button>
        </div>
        <label className="pem-select-label">
          <span>Event type</span>
          <select value={props.filter} onChange={(event) => props.onFilter(event.currentTarget.value as ActivityTypeFilter)}>
            {filters.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
          </select>
        </label>
        {props.events.length === 0 ? (
          <p className="pem-empty">No retained events match this filter.</p>
        ) : (
          <InspectorVirtualList
            items={props.events}
            getKey={(event) => event.eventId}
            estimateSize={58}
            ariaLabel="Retained graph events"
            renderItem={(event) => (
              <button
                type="button"
                className="pem-event-row"
                data-selected={event.eventId === props.selected?.eventId}
                data-event-type={event.type}
                onClick={() => props.onSelect(event)}
              >
                <span className="pem-event-sequence">#{event.sequence}</span>
                <span className="pem-event-copy"><strong>{eventTitle(event)}</strong><small>{eventDetail(event)}</small></span>
                <time dateTime={event.observedAt}>{formatEventTime(event)}</time>
              </button>
            )}
          />
        )}
      </aside>

      <div className="pem-activity-detail">
        {props.selectedExpired ? (
          <div className="pem-expired" role="status">
            <strong>Selected event expired from retained history</strong>
            <span>Its sequence was not reused. Select a currently retained event.</span>
          </div>
        ) : props.selected ? (
          <EventDetail event={props.selected} />
        ) : (
          <p className="pem-empty pem-empty-large">Select an event to inspect its causal payload.</p>
        )}
      </div>
    </section>
  );
}

function EventDetail({ event }: { event: GraphDevtoolsEvent }) {
  return (
    <article>
      <header className="pem-detail-header">
        <div>
          <p className="pem-eyebrow">{event.type} event · #{event.sequence}</p>
          <h2>{eventTitle(event)}</h2>
          <code translate="no">{event.eventId}</code>
        </div>
        <time dateTime={event.observedAt}>{formatEventTime(event)}</time>
      </header>
      <dl className="pem-readout-list pem-event-readouts">
        <div><dt>Store</dt><dd><code translate="no">{event.storeId}</code></dd></div>
        <div><dt>Correlation</dt><dd><code translate="no">{event.correlationId}</code></dd></div>
        <div><dt>Observed</dt><dd>{event.observedAt}</dd></div>
      </dl>
      {event.type === "mutation" ? <MutationDetail event={event} /> : (
        <pre className="pem-value" tabIndex={0}>{JSON.stringify(event.payload, null, 2)}</pre>
      )}
    </article>
  );
}

function MutationDetail({ event }: { event: Extract<GraphDevtoolsEvent, { type: "mutation" }> }) {
  return (
    <section className="pem-detail-section">
      <div className="pem-card-heading"><h3>Publication changes</h3><span>{event.payload.changes.length}</span></div>
      <ul className="pem-change-list">
        {event.payload.changes.map((change, index) => (
          <li key={`${change.category}:${change.key}:${change.id ?? ""}:${index}`}>
            <span data-category={change.category}>{change.category}</span>
            <code translate="no">{change.key}{change.id ? `/${change.id}` : ""}</code>
            <small>{change.action} · {change.valueState}</small>
            {(change.beforeCount !== undefined || change.afterCount !== undefined) && (
              <strong>{change.beforeCount ?? "—"} → {change.afterCount ?? "—"}</strong>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
