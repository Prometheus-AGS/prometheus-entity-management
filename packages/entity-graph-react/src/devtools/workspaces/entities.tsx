import type { ReactNode } from "react";
import type {
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEvent,
  GraphDevtoolsRelationship,
  GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";
import type { EntityFieldDiff } from "../diff";
import { eventTitle, formatEventTime } from "../event-format";
import type { EntityStatusFilter, EntityValueTab } from "../view-model";
import type { InspectorActivePreview } from "../view-model";
import type { EntityGraphDevtoolsValuePolicyMode } from "../provider";
import { InspectorVirtualList } from "../components/virtual-list";
import { InspectorDiff, InspectorValue } from "../components/value-inspector";
import { inspectorEntityIdentity } from "../entity-identity";

export interface EntitiesWorkspaceProps {
  search: string;
  onSearch(value: string): void;
  filter: EntityStatusFilter;
  onFilter(filter: EntityStatusFilter): void;
  entities: readonly GraphDevtoolsEntityRecord[];
  selected: GraphDevtoolsEntityRecord | null;
  onSelect(entity: GraphDevtoolsEntityRecord): void;
  valueTab: EntityValueTab;
  onValueTab(tab: EntityValueTab): void;
  diff: readonly EntityFieldDiff[];
  relationships: readonly GraphDevtoolsRelationship[];
  views: readonly GraphDevtoolsViewRecord[];
  history: readonly GraphDevtoolsEvent[];
  previewDraft: string;
  onPreviewDraft(value: string): void;
  previewValidationError: string | null;
  previewDiff: readonly EntityFieldDiff[];
  activePreview: InspectorActivePreview | null;
  onApplyPreview(): void;
  onRestorePreview(): void;
  commandPending: boolean;
  valuePolicyMode: EntityGraphDevtoolsValuePolicyMode;
  canCopyValue: boolean;
  onCopyIdentity(): void;
  onCopyValue(): void;
  onSelectIdentity(type: string, id: string): void;
  onSelectView(view: GraphDevtoolsViewRecord): void;
  onSelectEvent(event: GraphDevtoolsEvent): void;
}

const valueTabs: readonly EntityValueTab[] = ["original", "patch", "live", "diff"];

export function EntitiesWorkspace(props: EntitiesWorkspaceProps) {
  return (
    <section className="pem-workspace pem-entity-workspace" aria-labelledby="pem-entities-title">
      <aside className="pem-navigator" aria-label="Entity navigator">
        <div className="pem-navigator-heading">
          <p className="pem-eyebrow">Find</p>
          <h2 id="pem-entities-title">Entities</h2>
        </div>
        <label className="pem-search">
          <span className="pem-sr-only">Search entities</span>
          <input
            type="search"
            value={props.search}
            onChange={(event) => props.onSearch(event.currentTarget.value)}
            placeholder="Search type or ID…"
          />
        </label>
        <div className="pem-filter-row" aria-label="Entity status filters">
          {(["all", "dirty", "errors"] as const).map((filter) => (
            <button
              type="button"
              key={filter}
              aria-pressed={props.filter === filter}
              onClick={() => props.onFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        {props.entities.length === 0 ? (
          <p className="pem-empty">No entities match these filters.</p>
        ) : (
          <InspectorVirtualList
            items={props.entities}
            getKey={inspectorEntityIdentity}
            estimateSize={38}
            ariaLabel="Matching entities"
            renderItem={(entity) => (
              <button
                type="button"
                className="pem-entity-row"
                data-selected={entity.type === props.selected?.type && entity.id === props.selected?.id}
                onClick={() => props.onSelect(entity)}
                title={`${entity.type} / ${entity.id}`}
              >
                <span className="pem-entity-copy">
                  <strong>{entity.type}</strong>
                  <code translate="no">{entity.id}</code>
                </span>
                <span className="pem-row-signals">
                  {entity.dirty && <span aria-label="Dirty">◆</span>}
                  {entity.entityState.error && <span aria-label="Error">!</span>}
                  {entity.viewIds.length > 0 && <small>{entity.viewIds.length}</small>}
                </span>
              </button>
            )}
          />
        )}
      </aside>

      <div className="pem-entity-detail">
        {props.selected ? <EntityDetail {...props} selected={props.selected} /> : (
          <p className="pem-empty pem-empty-large">Select an entity to inspect its graph state.</p>
        )}
      </div>
    </section>
  );
}

function EntityDetail(props: EntitiesWorkspaceProps & { selected: GraphDevtoolsEntityRecord }) {
  const entity = props.selected;
  const currentValue = props.valueTab === "original"
    ? entity.canonical
    : props.valueTab === "patch"
      ? entity.patch
      : entity.merged;

  return (
    <article>
      <header className="pem-detail-header">
        <div>
          <p className="pem-eyebrow">Entity</p>
          <h2><span>{entity.type}</span> <code translate="no">{entity.id}</code></h2>
        </div>
        <div className="pem-detail-tools">
          <div className="pem-status-cluster" aria-label="Entity status">
            {entity.dirty && <span data-tone="attention">◆ Dirty</span>}
            {entity.entityState.error && <span data-tone="attention">! Error</span>}
            {entity.entityState.isFetching && <span>↻ Fetching</span>}
            {entity.entityState.stale && <span>◷ Stale</span>}
            {!entity.sync.synced && <span>⇅ Unsynced</span>}
          </div>
          <div className="pem-detail-actions">
            <button type="button" onClick={props.onCopyIdentity}>Copy ID</button>
            <button
              type="button"
              disabled={!props.canCopyValue}
              title={props.canCopyValue ? "Copy the policy-projected value" : "Blocked by metadata-only policy"}
              onClick={props.onCopyValue}
            >
              Copy value
            </button>
          </div>
        </div>
      </header>

      {entity.entityState.error && (
        <div className="pem-error" role="alert">
          <strong>Entity fetch failed</strong>
          <span>{entity.entityState.error.message}</span>
        </div>
      )}

      <div className="pem-value-tabs" role="tablist" aria-label="Entity value projection">
        {valueTabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab}
            aria-selected={props.valueTab === tab}
            onClick={() => props.onValueTab(tab)}
          >
            {tab}
            {tab === "diff" && props.diff.length > 0 ? ` ${props.diff.length}` : ""}
          </button>
        ))}
      </div>
      <div className="pem-value-panel" role="tabpanel">
        {props.valueTab === "diff"
          ? <InspectorDiff rows={props.diff} />
          : <InspectorValue value={currentValue} label={`${props.valueTab} entity value`} />}
      </div>

      <section className="pem-preview-panel" aria-labelledby="pem-preview-title">
        <div className="pem-card-heading">
          <div>
            <p className="pem-eyebrow">Local patch workflow</p>
            <h3 id="pem-preview-title">Preview proposed fields</h3>
          </div>
          <span>{props.valuePolicyMode} receipt</span>
        </div>
        <label className="pem-preview-editor">
          <span>JSON patch</span>
          <textarea
            value={props.previewDraft}
            onChange={(event) => props.onPreviewDraft(event.currentTarget.value)}
            placeholder={'{\n  "status": "approved"\n}'}
            spellCheck={false}
          />
        </label>
        {props.previewValidationError && <p className="pem-inline-error" role="alert">{props.previewValidationError}</p>}
        {props.previewDiff.length > 0 && (
          <div className="pem-preview-diff">
            <p>Proposed difference from the current live value</p>
            <InspectorDiff rows={props.previewDiff} />
          </div>
        )}
        <div className="pem-preview-actions">
          <button
            type="button"
            className="pem-primary-action"
            disabled={props.commandPending || props.previewDiff.length === 0}
            onClick={props.onApplyPreview}
          >
            Apply local preview
          </button>
          {props.activePreview && (
            <button
              type="button"
              className="pem-secondary-action"
              disabled={props.commandPending}
              onClick={props.onRestorePreview}
            >
              Restore exact prior patch
            </button>
          )}
        </div>
        {props.activePreview && (
          <p className="pem-preview-receipt">
            Active receipt <code translate="no">{props.activePreview.receipt.previewId}</code>
            {" · "}revision {props.activePreview.receipt.previewRevision}
          </p>
        )}
      </section>

      <div className="pem-detail-grid">
        <DetailSection title="Relationships" count={props.relationships.length}>
          {props.relationships.length === 0 ? <p className="pem-empty">No schema relationships.</p> : (
            <ul className="pem-compact-list">
              {props.relationships.map((relationship) => {
                const other = relationship.source.type === entity.type && relationship.source.id === entity.id
                  ? relationship.target
                  : relationship.source;
                return (
                  <li key={`${relationship.relation}:${relationship.direction}:${relationship.source.type}:${relationship.source.id}:${relationship.target.type}:${relationship.target.id}`}>
                    <button type="button" onClick={() => props.onSelectIdentity(other.type, other.id)}>
                      <span>{relationship.direction === "outgoing" ? "→" : "←"} {relationship.relation}</span>
                      <code translate="no">{other.type}/{other.id}</code>
                      <small data-tone={relationship.status === "missing-target" ? "attention" : undefined}>
                        {relationship.status}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DetailSection>

        <DetailSection title="Visible in registered views" count={props.views.length}>
          {props.views.length === 0 ? <p className="pem-empty">No registered view currently contains this entity.</p> : (
            <ul className="pem-compact-list">
              {props.views.map((view) => (
                <li key={view.viewId}>
                  <button type="button" onClick={() => props.onSelectView(view)}>
                    <span>{view.label}</span>
                    <code translate="no">{view.viewId}</code>
                    <small>{view.kind}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title="Entity history" count={props.history.length}>
          {props.history.length === 0 ? <p className="pem-empty">No retained event touches this entity.</p> : (
            <ol className="pem-compact-list">
              {props.history.slice(0, 12).map((event) => (
                <li key={event.eventId}>
                  <button type="button" onClick={() => props.onSelectEvent(event)}>
                    <span>{eventTitle(event)}</span>
                    <time dateTime={event.observedAt}>{formatEventTime(event)}</time>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </DetailSection>
      </div>
    </article>
  );
}

function DetailSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="pem-detail-section">
      <div className="pem-card-heading"><h3>{title}</h3><span>{count}</span></div>
      {children}
    </section>
  );
}
