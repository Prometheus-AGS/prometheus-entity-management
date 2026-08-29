import type {
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEvent,
  GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";
import { InspectorVirtualList } from "../components/virtual-list";
import { eventTitle, formatEventTime } from "../event-format";

export interface ViewsWorkspaceProps {
  views: readonly GraphDevtoolsViewRecord[];
  entities: readonly GraphDevtoolsEntityRecord[];
  selected: GraphDevtoolsViewRecord | null;
  onSelect(view: GraphDevtoolsViewRecord): void;
  onSelectIdentity(type: string, id: string): void;
  narrowDetailOpen: boolean;
  onCloseNarrowDetail(): void;
  lastChangingEvent: GraphDevtoolsEvent | null;
  causalViewIds: ReadonlySet<string>;
}

export function ViewsWorkspace({
  views,
  entities,
  selected,
  onSelect,
  onSelectIdentity,
  narrowDetailOpen,
  onCloseNarrowDetail,
  lastChangingEvent,
  causalViewIds,
}: ViewsWorkspaceProps) {
  const entityByIdentity = new Map(entities.map((entity) => [`${entity.type}\u0000${entity.id}`, entity]));

  return (
    <section
      className="pem-workspace pem-view-workspace"
      data-narrow-detail={narrowDetailOpen}
      aria-labelledby="pem-views-title"
    >
      <aside className="pem-navigator" aria-label="Registered view navigator">
        <div className="pem-navigator-heading">
          <p className="pem-eyebrow">Registered now</p>
          <h2 id="pem-views-title">Views</h2>
        </div>
        <p className="pem-coverage-note">Only registered views are observable; unregistered renderers remain unknown.</p>
        {views.length === 0 ? (
          <p className="pem-empty">Mounted view hooks will register here.</p>
        ) : (
          <InspectorVirtualList
            items={views}
            getKey={(view) => view.viewId}
            estimateSize={48}
            ariaLabel="Registered views"
            renderItem={(view) => (
              <button
                type="button"
                className="pem-view-row"
                data-selected={view.viewId === selected?.viewId}
                data-causal={causalViewIds.has(view.viewId)}
                onClick={() => onSelect(view)}
              >
                <span><strong>{view.label}</strong><code translate="no">{view.viewId}</code></span>
                <small>{view.membership.length}</small>
              </button>
            )}
          />
        )}
      </aside>

      <div className="pem-view-detail">
        <button type="button" className="pem-mobile-back" onClick={onCloseNarrowDetail}>← Views</button>
        {!selected ? (
          <p className="pem-empty pem-empty-large">No registered views are currently observable.</p>
        ) : (
          <article>
            <header className="pem-detail-header">
              <div>
                <p className="pem-eyebrow">{selected.kind} view</p>
                <h2>{selected.label}</h2>
                <code translate="no">{selected.viewId}</code>
              </div>
              <span className="pem-registered-status">● Registered now</span>
            </header>

            <div className="pem-metric-grid pem-view-metrics">
              <Readout label="Membership" value={selected.membership.length} />
              <Readout label="Rendered subscribers" value={selected.subscriberCount} />
              <Readout label="Render updates" value={selected.renderCount} />
              <Readout label="Entity type" value={selected.entityType} />
              <Readout label="Query key" value={selected.queryKey ?? "not applicable"} mono />
              <Readout
                label="Last rendered"
                value={selected.lastRenderedAt ? formatTimestamp(selected.lastRenderedAt) : "not recorded"}
              />
            </div>

            <section className="pem-card pem-last-change" aria-labelledby="pem-last-change-title">
              <div className="pem-card-heading">
                <h3 id="pem-last-change-title">Last changing event</h3>
                <span>{lastChangingEvent ? `#${lastChangingEvent.sequence}` : "none retained"}</span>
              </div>
              {lastChangingEvent ? (
                <div className="pem-last-change-readout">
                  <strong>{eventTitle(lastChangingEvent)}</strong>
                  <time dateTime={lastChangingEvent.observedAt}>{formatEventTime(lastChangingEvent)}</time>
                  <code translate="no">{lastChangingEvent.correlationId}</code>
                </div>
              ) : <p className="pem-empty">No retained event is attributed to this registered view.</p>}
            </section>

            {selected.list && (
              <section className="pem-card pem-list-health" aria-labelledby="pem-list-health-title">
                <div className="pem-card-heading">
                  <h3 id="pem-list-health-title">Normalized list state</h3>
                  <span>{selected.list.stale ? "stale" : "current"}</span>
                </div>
                <dl className="pem-readout-list">
                  <div><dt>Currently rendered membership</dt><dd>{selected.list.visibleCount}</dd></div>
                  <div><dt>Normalized graph list IDs</dt><dd>{selected.list.graphCount}</dd></div>
                  <div><dt>Server total</dt><dd>{selected.list.total ?? "unknown"}</dd></div>
                  <div><dt>Fetching</dt><dd>{selected.list.isFetching || selected.list.isFetchingMore ? "yes" : "no"}</dd></div>
                  <div><dt>Pagination</dt><dd>{selected.list.hasPreviousPage ? "← " : ""}{selected.list.hasNextPage ? "→" : "complete"}</dd></div>
                </dl>
              </section>
            )}

            <section className="pem-detail-section pem-membership" aria-labelledby="pem-membership-title">
              <div className="pem-card-heading">
                <h3 id="pem-membership-title">Ordered registered membership</h3>
                <span>{selected.membership.length}</span>
              </div>
              {selected.membership.length === 0 ? (
                <p className="pem-empty">This registered view currently renders no entities.</p>
              ) : (
                <InspectorVirtualList
                  items={selected.membership}
                  getKey={(member) => `${member.type}\u0000${member.id}`}
                  estimateSize={38}
                  ariaLabel="View entity membership"
                  className="pem-membership-list"
                  renderItem={(member) => {
                    const entity = entityByIdentity.get(`${member.type}\u0000${member.id}`);
                    return (
                      <button
                        type="button"
                        className="pem-membership-row"
                        data-causal={causalViewIds.has(selected.viewId)}
                        onClick={() => onSelectIdentity(member.type, member.id)}
                      >
                        <span className="pem-membership-position">{selected.membership.indexOf(member) + 1}</span>
                        <code translate="no">{member.type}/{member.id}</code>
                        <span className="pem-row-signals">
                          {entity?.dirty && <span aria-label="Dirty">◆</span>}
                          {entity?.entityState.error && <span aria-label="Error">!</span>}
                        </span>
                      </button>
                    );
                  }}
                />
              )}
            </section>
          </article>
        )}
      </div>
    </section>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function Readout({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="pem-metric pem-readout">
      <span>{label}</span>
      <strong className={mono ? "pem-mono" : undefined}>{value}</strong>
    </div>
  );
}
