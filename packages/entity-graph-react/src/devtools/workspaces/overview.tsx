import type { GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";
import { eventDetail, eventTitle, formatEventTime } from "../event-format";
import type { EntityGraphInspectorModel } from "../model";

export interface OverviewWorkspaceProps {
  model: EntityGraphInspectorModel;
  onSelectEvent(event: GraphDevtoolsEvent): void;
}

export function OverviewWorkspace({ model, onSelectEvent }: OverviewWorkspaceProps) {
  const dirty = model.entities.filter((entity) => entity.dirty).length;
  const errors = model.entities.filter((entity) => entity.entityState.error).length;
  const fetching = model.entities.filter((entity) => entity.entityState.isFetching).length;
  const recent = [...model.events].slice(-8).reverse();
  const history = model.snapshot.history;
  const snapshots = model.snapshot.snapshots;

  return (
    <section className="pem-workspace pem-overview" aria-labelledby="pem-overview-title">
      <div className="pem-workspace-heading">
        <div>
          <p className="pem-eyebrow">Live graph health</p>
          <h2 id="pem-overview-title">Overview</h2>
        </div>
        <span className="pem-live-status" data-state={snapshots.mode}>
          {snapshots.mode === "live" ? "● Live" : `◉ Rewound · ${snapshots.cursor}`}
        </span>
      </div>

      <div className="pem-metric-grid" aria-label="Graph health summary">
        <Metric label="Entities" value={model.snapshot.counts.entities} />
        <Metric label="Dirty" value={dirty} tone={dirty ? "attention" : undefined} />
        <Metric label="Errors" value={errors} tone={errors ? "attention" : undefined} />
        <Metric label="Fetching" value={fetching} />
        <Metric label="Registered views" value={model.views.length} />
        <Metric label="Retained events" value={history.retainedEvents} />
      </div>

      <div className="pem-overview-grid">
        <section className="pem-card" aria-labelledby="pem-retention-title">
          <div className="pem-card-heading">
            <h3 id="pem-retention-title">Retention</h3>
            <span>bounded</span>
          </div>
          <dl className="pem-readout-list">
            <div><dt>Events</dt><dd>{history.retainedEvents} / {history.eventLimit}</dd></div>
            <div><dt>Event bytes</dt><dd>{formatBytes(history.retainedBytes)} / {formatBytes(history.byteLimit)}</dd></div>
            <div><dt>Snapshots</dt><dd>{snapshots.retainedSnapshots} / {snapshots.snapshotLimit}</dd></div>
            <div><dt>Snapshot bytes</dt><dd>{formatBytes(snapshots.retainedBytes)} / {formatBytes(snapshots.byteLimit)}</dd></div>
          </dl>
        </section>

        <section className="pem-card pem-recent" aria-labelledby="pem-recent-title">
          <div className="pem-card-heading">
            <h3 id="pem-recent-title">Recent causal traces</h3>
            <span>{recent.length}</span>
          </div>
          {recent.length === 0 ? (
            <p className="pem-empty">Graph publications will appear here.</p>
          ) : (
            <ol className="pem-trace-list">
              {recent.map((event) => (
                <li key={event.eventId}>
                  <button type="button" onClick={() => onSelectEvent(event)}>
                    <span className="pem-trace-type" data-event-type={event.type}>{event.type}</span>
                    <span className="pem-trace-copy">
                      <strong>{eventTitle(event)}</strong>
                      <small>{eventDetail(event)}</small>
                    </span>
                    <time dateTime={event.observedAt}>{formatEventTime(event)}</time>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "attention";
}) {
  return (
    <div className="pem-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{new Intl.NumberFormat().format(value)}</strong>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
