import * as React from "react";
import type { InspectorWorkspace } from "./view-model";
import { useEntityGraphInspectorViewModel } from "./view-model";
import { OverviewWorkspace } from "./workspaces/overview";
import { EntitiesWorkspace } from "./workspaces/entities";
import { ViewsWorkspace } from "./workspaces/views";
import { ActivityWorkspace } from "./workspaces/activity";
import { GraphPulse } from "./components/graph-pulse";
import type { EntityGraphInspectorStateAdapter } from "./state";

type ActivityBoundaryProps = {
  mode: "visible" | "hidden";
  children: React.ReactNode;
};

const ReactActivity = (React as typeof React & {
  Activity?: React.ComponentType<ActivityBoundaryProps>;
}).Activity;

function WorkspacePresence({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!ReactActivity) return active ? <>{children}</> : null;
  return <ReactActivity mode={active ? "visible" : "hidden"}>{children}</ReactActivity>;
}

const workspaces: readonly { id: InspectorWorkspace; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "entities", label: "Entities" },
  { id: "views", label: "Views" },
  { id: "activity", label: "Activity" },
];

export function EntityGraphInspectorShell({
  stateAdapter,
}: {
  stateAdapter?: EntityGraphInspectorStateAdapter;
}) {
  const viewModel = useEntityGraphInspectorViewModel(stateAdapter);
  const model = viewModel.model;
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const onWorkspaceKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = event.key === "ArrowRight"
      ? (index + 1) % workspaces.length
      : event.key === "ArrowLeft"
        ? (index - 1 + workspaces.length) % workspaces.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? workspaces.length - 1
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    viewModel.setWorkspace(workspaces[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

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
        {workspaces.map((workspace, index) => (
          <button
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            key={workspace.id}
            aria-selected={viewModel.workspace === workspace.id}
            aria-controls="pem-workspace-panel"
            tabIndex={viewModel.workspace === workspace.id ? 0 : -1}
            onClick={() => viewModel.setWorkspace(workspace.id)}
            onKeyDown={(event) => onWorkspaceKeyDown(event, index)}
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

      <main
        id="pem-workspace-panel"
        className="pem-shell-main"
        role="tabpanel"
        aria-label={`${viewModel.workspace} workspace`}
      >
        <WorkspacePresence active={viewModel.workspace === "overview"}>
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
        </WorkspacePresence>
        <WorkspacePresence active={viewModel.workspace === "entities"}>
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
            narrowDetailOpen={viewModel.narrowDetailOpen}
            onCloseNarrowDetail={viewModel.closeNarrowDetail}
            navigatorCollapsed={viewModel.navigatorCollapsed}
            onToggleNavigatorCollapsed={viewModel.toggleNavigatorCollapsed}
            causalRailCollapsed={viewModel.causalRailCollapsed}
            onToggleCausalRailCollapsed={viewModel.toggleCausalRailCollapsed}
            causalEvent={viewModel.selectedEvent}
            causalEntityKeys={viewModel.causalEntityKeys}
            causalViewIds={viewModel.causalViewIds}
          />
        </WorkspacePresence>
        <WorkspacePresence active={viewModel.workspace === "views"}>
          <ViewsWorkspace
            views={viewModel.views}
            entities={model.entities}
            selected={viewModel.selectedView}
            onSelect={viewModel.selectView}
            onSelectIdentity={viewModel.selectEntityIdentity}
            narrowDetailOpen={viewModel.narrowDetailOpen}
            onCloseNarrowDetail={viewModel.closeNarrowDetail}
            lastChangingEvent={viewModel.selectedViewLastEvent}
            causalViewIds={viewModel.causalViewIds}
          />
        </WorkspacePresence>
        <WorkspacePresence active={viewModel.workspace === "activity"}>
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
            narrowDetailOpen={viewModel.narrowDetailOpen}
            onCloseNarrowDetail={viewModel.closeNarrowDetail}
          />
        </WorkspacePresence>
      </main>

      <GraphPulse
        events={model.events}
        selected={viewModel.selectedEvent}
        collapsed={viewModel.pulseCollapsed}
        onToggleCollapsed={viewModel.togglePulseCollapsed}
        onSelect={viewModel.highlightEvent}
      />

      <div className="pem-announcer pem-sr-only" aria-live="polite">
        {model.snapshot.storeId} · {model.snapshot.snapshots.mode === "live" ? "Live graph" : "Graph rewound"}
      </div>
    </section>
  );
}
