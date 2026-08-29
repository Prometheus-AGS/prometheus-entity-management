import type { InspectorWorkspace } from "./view-model";
import { useEntityGraphInspectorViewModel } from "./view-model";
import { OverviewWorkspace } from "./workspaces/overview";
import { EntitiesWorkspace } from "./workspaces/entities";
import { ViewsWorkspace } from "./workspaces/views";
import { ActivityWorkspace } from "./workspaces/activity";

const workspaces: readonly { id: InspectorWorkspace; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "entities", label: "Entities" },
  { id: "views", label: "Views" },
  { id: "activity", label: "Activity" },
];

export function EntityGraphInspectorShell() {
  const viewModel = useEntityGraphInspectorViewModel();
  const model = viewModel.model;

  if (!model) {
    return (
      <section className="pem-devtools-loading" aria-label="Prometheus Entity Graph DevTools">
        <strong>Prometheus Graph DevTools</strong>
        <div role="status" aria-live="polite">Connecting to entity graph…</div>
      </section>
    );
  }

  const dirty = model.entities.filter((entity) => entity.dirty).length;
  const errors = model.entities.filter((entity) => entity.entityState.error).length;

  return (
    <section className="pem-inspector" aria-label="Prometheus Entity Graph DevTools">
      <header className="pem-shell-header">
        <div className="pem-brand">
          <span className="pem-mark" aria-hidden="true">P</span>
          <span><strong>Prometheus Graph</strong><code translate="no">{model.snapshot.storeId}</code></span>
        </div>
        <div className="pem-shell-status" aria-label="Current graph status">
          <span data-state={model.snapshot.snapshots.mode}>
            {model.snapshot.snapshots.mode === "live" ? "● Live" : `◉ Rewound ${model.snapshot.snapshots.cursor}`}
          </span>
          <span data-tone={dirty ? "attention" : undefined}>◆ {dirty} dirty</span>
          <span data-tone={errors ? "attention" : undefined}>! {errors} errors</span>
        </div>
      </header>

      <nav className="pem-workspace-tabs" role="tablist" aria-label="Inspector workspaces">
        {workspaces.map((workspace) => (
          <button
            type="button"
            role="tab"
            key={workspace.id}
            aria-selected={viewModel.workspace === workspace.id}
            onClick={() => viewModel.setWorkspace(workspace.id)}
          >
            {workspace.label}
            {workspace.id === "entities" && model.entities.length > 0 && <small>{model.entities.length}</small>}
            {workspace.id === "views" && model.views.length > 0 && <small>{model.views.length}</small>}
            {workspace.id === "activity" && model.events.length > 0 && <small>{model.events.length}</small>}
          </button>
        ))}
      </nav>

      <div
        className="pem-command-feedback"
        data-state={viewModel.command.error ? "error" : viewModel.command.notice ? "success" : "idle"}
        role={viewModel.command.error ? "alert" : "status"}
        aria-live="polite"
      >
        {viewModel.command.pending && <span>Working: {viewModel.command.pending}…</span>}
        {viewModel.command.error && <span>{viewModel.command.error}</span>}
        {viewModel.command.notice && <span>{viewModel.command.notice}</span>}
        {(viewModel.command.error || viewModel.command.notice) && (
          <button type="button" aria-label="Dismiss command message" onClick={viewModel.clearCommandFeedback}>×</button>
        )}
      </div>

      <main className="pem-shell-main">
        {viewModel.workspace === "overview" && (
          <OverviewWorkspace
            model={model}
            stores={viewModel.stores}
            selectedStoreId={viewModel.selectedStoreId}
            onSelectStore={viewModel.selectStore}
            valuePolicyMode={viewModel.valuePolicyMode}
            onExport={viewModel.exportGraph}
            exportPending={viewModel.command.pending === "export"}
            onSelectEvent={viewModel.selectEvent}
          />
        )}
        {viewModel.workspace === "entities" && (
          <EntitiesWorkspace
            search={viewModel.search}
            onSearch={viewModel.setSearch}
            filter={viewModel.entityFilter}
            onFilter={viewModel.setEntityFilter}
            entities={viewModel.entities}
            selected={viewModel.selectedEntity}
            onSelect={viewModel.selectEntity}
            valueTab={viewModel.valueTab}
            onValueTab={viewModel.setValueTab}
            diff={viewModel.entityDiff}
            relationships={viewModel.entityRelationships}
            views={viewModel.entityViews}
            history={viewModel.entityHistory}
            previewDraft={viewModel.previewDraft}
            onPreviewDraft={viewModel.setPreviewDraft}
            previewValidationError={viewModel.previewValidationError}
            previewDiff={viewModel.previewDiff}
            activePreview={viewModel.activePreview}
            onApplyPreview={viewModel.applyPreview}
            onRestorePreview={viewModel.restorePreview}
            commandPending={viewModel.command.pending !== null}
            valuePolicyMode={viewModel.valuePolicyMode}
            canCopyValue={viewModel.canCopyEntityValue}
            onCopyIdentity={viewModel.copyEntityIdentity}
            onCopyValue={viewModel.copyEntityValue}
            onSelectIdentity={viewModel.selectEntityIdentity}
            onSelectView={viewModel.selectView}
            onSelectEvent={viewModel.selectEvent}
          />
        )}
        {viewModel.workspace === "views" && (
          <ViewsWorkspace
            views={viewModel.views}
            entities={model.entities}
            selected={viewModel.selectedView}
            onSelect={viewModel.selectView}
            onSelectIdentity={viewModel.selectEntityIdentity}
          />
        )}
        {viewModel.workspace === "activity" && (
          <ActivityWorkspace
            events={viewModel.events}
            selected={viewModel.selectedEvent}
            selectedExpired={viewModel.selectedEventExpired}
            filter={viewModel.activityFilter}
            onFilter={viewModel.setActivityFilter}
            paused={viewModel.paused}
            onTogglePaused={viewModel.togglePaused}
            onSelect={viewModel.selectEvent}
            snapshots={model.snapshot.snapshots}
            snapshotReferences={viewModel.snapshotReferences}
            rewindCursor={viewModel.rewindCursor}
            onRewindCursor={viewModel.setRewindCursor}
            onRewind={viewModel.rewind}
            onReturnToLive={viewModel.returnToLive}
            timeTravelAvailable={viewModel.timeTravelAvailable}
            commandPending={viewModel.command.pending !== null}
          />
        )}
      </main>

      <div className="pem-announcer pem-sr-only" aria-live="polite">
        {model.snapshot.storeId} · {model.snapshot.counts.entities} entities · {dirty} dirty · {errors} errors
      </div>
    </section>
  );
}
