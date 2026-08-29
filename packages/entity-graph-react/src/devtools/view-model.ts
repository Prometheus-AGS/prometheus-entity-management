import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEvent,
  GraphDevtoolsPreviewAppliedReceipt,
  GraphDevtoolsRelationship,
  GraphDevtoolsSnapshotReference,
  GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";
import {
  applyEntityPreview,
  createPolicyAwareExport,
  downloadInspectorExport,
  parsePreviewPatch,
  policyEntityValue,
  restoreEntityPreview,
  returnEntityGraphToLive,
  rewindEntityGraph,
  writeInspectorClipboard,
} from "./commands";
import { diffEntityValues, formatInspectorValue, type EntityFieldDiff } from "./diff";
import { inspectorEntityIdentity } from "./entity-identity";
import type { EntityGraphInspectorModel } from "./model";
import {
  useEntityGraphDevtools,
  type EntityGraphDevtoolsStoreDescriptor,
  type EntityGraphDevtoolsValuePolicyMode,
} from "./provider";
import { useEntityGraphInspectorModel } from "./use-model";

export type InspectorWorkspace = "overview" | "entities" | "views" | "activity";
export type EntityValueTab = "original" | "patch" | "live" | "diff";
export type EntityStatusFilter = "all" | "dirty" | "errors";
export type ActivityTypeFilter = "all" | GraphDevtoolsEvent["type"];
export type InspectorCommandKind = "preview" | "restore" | "rewind" | "return-live" | "copy" | "export";

export interface InspectorCommandState {
  pending: InspectorCommandKind | null;
  notice: string | null;
  error: string | null;
}

export interface InspectorActivePreview {
  storeId: string;
  entityKey: string;
  receipt: GraphDevtoolsPreviewAppliedReceipt;
}

function eventTouchesEntity(event: GraphDevtoolsEvent, entity: GraphDevtoolsEntityRecord): boolean {
  return event.type === "mutation" && event.payload.changes.some((change) =>
    change.id === entity.id &&
    (change.key === entity.type || change.key === entity.key),
  );
}

function relationshipTouchesEntity(
  relationship: GraphDevtoolsRelationship,
  entity: GraphDevtoolsEntityRecord,
): boolean {
  return (
    relationship.source.type === entity.type && relationship.source.id === entity.id
  ) || (
    relationship.target.type === entity.type && relationship.target.id === entity.id
  );
}

function previewKey(storeId: string, entity: Pick<GraphDevtoolsEntityRecord, "type" | "id">): string {
  return JSON.stringify([storeId, entity.type, entity.id]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The DevTools command failed";
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export interface EntityGraphInspectorViewModel {
  model: EntityGraphInspectorModel | null;
  stores: readonly EntityGraphDevtoolsStoreDescriptor[];
  selectedStoreId: string | null;
  selectStore(storeId: string): void;
  valuePolicyMode: EntityGraphDevtoolsValuePolicyMode;
  workspace: InspectorWorkspace;
  setWorkspace(workspace: InspectorWorkspace): void;
  narrowDetailOpen: boolean;
  closeNarrowDetail(): void;
  search: string;
  setSearch(value: string): void;
  entityFilter: EntityStatusFilter;
  setEntityFilter(filter: EntityStatusFilter): void;
  entities: readonly GraphDevtoolsEntityRecord[];
  selectedEntity: GraphDevtoolsEntityRecord | null;
  selectEntity(entity: GraphDevtoolsEntityRecord): void;
  selectEntityIdentity(type: string, id: string): void;
  valueTab: EntityValueTab;
  setValueTab(tab: EntityValueTab): void;
  entityDiff: readonly EntityFieldDiff[];
  entityRelationships: readonly GraphDevtoolsRelationship[];
  entityViews: readonly GraphDevtoolsViewRecord[];
  entityHistory: readonly GraphDevtoolsEvent[];
  previewDraft: string;
  setPreviewDraft(value: string): void;
  previewValidationError: string | null;
  previewDiff: readonly EntityFieldDiff[];
  activePreview: InspectorActivePreview | null;
  applyPreview(): Promise<void>;
  restorePreview(): Promise<void>;
  copyEntityIdentity(): Promise<void>;
  copyEntityValue(): Promise<void>;
  canCopyEntityValue: boolean;
  views: readonly GraphDevtoolsViewRecord[];
  selectedView: GraphDevtoolsViewRecord | null;
  selectView(view: GraphDevtoolsViewRecord): void;
  activityFilter: ActivityTypeFilter;
  setActivityFilter(filter: ActivityTypeFilter): void;
  paused: boolean;
  togglePaused(): void;
  events: readonly GraphDevtoolsEvent[];
  selectedEvent: GraphDevtoolsEvent | null;
  selectedEventExpired: boolean;
  selectEvent(event: GraphDevtoolsEvent): void;
  snapshotReferences: readonly Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>[];
  rewindCursor: number | null;
  setRewindCursor(cursor: number): void;
  rewind(): Promise<void>;
  returnToLive(): Promise<void>;
  timeTravelAvailable: boolean;
  exportGraph(): Promise<void>;
  command: InspectorCommandState;
  clearCommandFeedback(): void;
}

export function useEntityGraphInspectorViewModel(): EntityGraphInspectorViewModel {
  const runtime = useEntityGraphDevtools();
  const model = useEntityGraphInspectorModel();
  const [workspace, setWorkspace] = useState<InspectorWorkspace>("overview");
  const [narrowDetailOpen, setNarrowDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const [entityFilter, setEntityFilter] = useState<EntityStatusFilter>("all");
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [valueTab, setValueTab] = useState<EntityValueTab>("original");
  const [activityFilter, setActivityFilter] = useState<ActivityTypeFilter>("all");
  const [paused, setPaused] = useState(false);
  const [pausedEvents, setPausedEvents] = useState<readonly GraphDevtoolsEvent[]>([]);
  const [previewDraft, setPreviewDraft] = useState("");
  const [previewReceipts, setPreviewReceipts] = useState<Record<string, InspectorActivePreview>>({});
  const [selectedRewindCursor, setSelectedRewindCursor] = useState<number | null>(null);
  const [command, setCommand] = useState<InspectorCommandState>({ pending: null, notice: null, error: null });

  useEffect(() => {
    setSelectedRewindCursor(null);
    setNarrowDetailOpen(false);
    setCommand({ pending: null, notice: null, error: null });
  }, [runtime.storeId]);

  const entities = useMemo(() => (model?.entities ?? []).filter((entity) => {
    if (entityFilter === "dirty" && !entity.dirty) return false;
    if (entityFilter === "errors" && !entity.entityState.error) return false;
    return deferredSearch.length === 0 ||
      entity.type.toLocaleLowerCase().includes(deferredSearch) ||
      entity.id.toLocaleLowerCase().includes(deferredSearch);
  }), [deferredSearch, entityFilter, model?.entities]);

  const selectedEntity = useMemo(() => {
    const all = model?.entities ?? [];
    return all.find((entity) => inspectorEntityIdentity(entity) === selectedEntityKey) ?? entities[0] ?? null;
  }, [entities, model?.entities, selectedEntityKey]);

  const views = model?.views ?? [];
  const selectedView = useMemo(
    () => views.find((view) => view.viewId === selectedViewId) ?? views[0] ?? null,
    [selectedViewId, views],
  );

  const entityDiff = useMemo(
    () => selectedEntity ? diffEntityValues(selectedEntity.canonical, selectedEntity.merged) : [],
    [selectedEntity],
  );
  const entityRelationships = useMemo(
    () => selectedEntity
      ? (model?.relationships ?? []).filter((relationship) =>
          relationshipTouchesEntity(relationship, selectedEntity),
        )
      : [],
    [model?.relationships, selectedEntity],
  );
  const entityViews = useMemo(
    () => selectedEntity
      ? views.filter((view) => selectedEntity.viewIds.includes(view.viewId))
      : [],
    [selectedEntity, views],
  );
  const entityHistory = useMemo(
    () => selectedEntity
      ? [...(model?.events ?? [])].filter((event) => eventTouchesEntity(event, selectedEntity)).reverse()
      : [],
    [model?.events, selectedEntity],
  );

  const parsedPreview = useMemo(() => {
    if (previewDraft.trim().length === 0) return { patch: null, error: null };
    try {
      return { patch: parsePreviewPatch(previewDraft), error: null };
    } catch (error) {
      return { patch: null, error: errorMessage(error) };
    }
  }, [previewDraft]);
  const previewDiff = useMemo(() => {
    if (!selectedEntity || !parsedPreview.patch) return [];
    return diffEntityValues(
      selectedEntity.merged,
      { ...recordValue(selectedEntity.merged), ...parsedPreview.patch },
    );
  }, [parsedPreview.patch, selectedEntity]);
  const activePreview = runtime.storeId && selectedEntity
    ? previewReceipts[previewKey(runtime.storeId, selectedEntity)] ?? null
    : null;

  const liveEvents = model?.events ?? [];
  const visibleEvents = paused ? pausedEvents : liveEvents;
  const events = useMemo(
    () => [...visibleEvents]
      .filter((event) => activityFilter === "all" || event.type === activityFilter)
      .reverse(),
    [activityFilter, visibleEvents],
  );
  const selectedEvent = useMemo(
    () => visibleEvents.find((event) => event.sequence === selectedSequence) ?? events[0] ?? null,
    [events, selectedSequence, visibleEvents],
  );
  const selectedEventExpired = selectedSequence !== null &&
    !visibleEvents.some((event) => event.sequence === selectedSequence);
  const snapshotReferences = model?.snapshotReferences ?? [];
  const rewindCursor = selectedRewindCursor !== null &&
    snapshotReferences.some((reference) => reference.cursor === selectedRewindCursor)
    ? selectedRewindCursor
    : snapshotReferences[snapshotReferences.length - 1]?.cursor ?? null;
  const timeTravelAvailable = model?.capabilities.features.includes("time-travel") ?? false;

  const perform = useCallback(async <T,>(
    kind: InspectorCommandKind,
    action: () => Promise<T> | T,
  ): Promise<T | null> => {
    setCommand({ pending: kind, notice: null, error: null });
    try {
      return await action();
    } catch (error) {
      setCommand({ pending: null, notice: null, error: errorMessage(error) });
      return null;
    } finally {
      setCommand((current) => ({ ...current, pending: null }));
    }
  }, []);

  const selectEntity = useCallback((entity: GraphDevtoolsEntityRecord) => {
    setSelectedEntityKey(inspectorEntityIdentity(entity));
    setPreviewDraft("");
    setNarrowDetailOpen(true);
  }, []);
  const selectEntityIdentity = useCallback((type: string, id: string) => {
    const entity = model?.entities.find((candidate) => candidate.type === type && candidate.id === id);
    if (!entity) return;
    setSelectedEntityKey(inspectorEntityIdentity(entity));
    setPreviewDraft("");
    setWorkspace("entities");
    setNarrowDetailOpen(true);
  }, [model?.entities]);
  const selectView = useCallback((view: GraphDevtoolsViewRecord) => {
    setSelectedViewId(view.viewId);
    setWorkspace("views");
    setNarrowDetailOpen(true);
  }, []);
  const selectEvent = useCallback((event: GraphDevtoolsEvent) => {
    setSelectedSequence(event.sequence);
    setWorkspace("activity");
    setNarrowDetailOpen(true);
  }, []);
  const selectWorkspace = useCallback((nextWorkspace: InspectorWorkspace) => {
    setWorkspace(nextWorkspace);
    setNarrowDetailOpen(false);
  }, []);
  const closeNarrowDetail = useCallback(() => setNarrowDetailOpen(false), []);
  const togglePaused = useCallback(() => {
    if (!paused) setPausedEvents(liveEvents);
    setPaused((current) => !current);
  }, [liveEvents, paused]);

  const applyPreview = useCallback(async () => {
    if (!runtime.client || !runtime.storeId || !selectedEntity || !parsedPreview.patch) {
      setCommand({ pending: null, notice: null, error: parsedPreview.error ?? "Enter a valid JSON patch first" });
      return;
    }
    const receipt = await perform("preview", () => applyEntityPreview(
      runtime.client!,
      selectedEntity,
      parsedPreview.patch!,
    ));
    if (!receipt) return;
    const key = previewKey(runtime.storeId, selectedEntity);
    setPreviewReceipts((current) => ({
      ...current,
      [key]: { storeId: runtime.storeId!, entityKey: inspectorEntityIdentity(selectedEntity), receipt },
    }));
    setPreviewDraft("");
    setCommand({ pending: null, notice: `Preview applied to ${selectedEntity.type}/${selectedEntity.id}`, error: null });
  }, [parsedPreview.error, parsedPreview.patch, perform, runtime.client, runtime.storeId, selectedEntity]);

  const restorePreview = useCallback(async () => {
    if (!runtime.client || !activePreview) return;
    const receipt = await perform("restore", () => restoreEntityPreview(
      runtime.client!,
      activePreview.receipt.previewId,
    ));
    if (!receipt) return;
    const key = previewKey(activePreview.storeId, activePreview.receipt.entity);
    setPreviewReceipts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (receipt.status === "conflict") {
      setCommand({
        pending: null,
        notice: null,
        error: `Restore refused: entity changed at revision ${receipt.observedRevision}`,
      });
    } else {
      setCommand({ pending: null, notice: "Preview restored to the exact prior patch", error: null });
    }
  }, [activePreview, perform, runtime.client]);

  const copyEntityIdentity = useCallback(async () => {
    if (!selectedEntity) return;
    const copied = await perform("copy", () => writeInspectorClipboard(`${selectedEntity.type}/${selectedEntity.id}`));
    if (copied === null) return;
    setCommand({ pending: null, notice: "Entity identifier copied", error: null });
  }, [perform, selectedEntity]);

  const canCopyEntityValue = runtime.valuePolicyMode === "include" && selectedEntity !== null;
  const copyEntityValue = useCallback(async () => {
    if (!model || !selectedEntity) return;
    if (runtime.valuePolicyMode !== "include") {
      setCommand({
        pending: null,
        notice: null,
        error: "Value copy is blocked by the metadata-only transport policy",
      });
      return;
    }
    const projection = valueTab === "original" ? "canonical" : valueTab === "patch" ? "patch" : "merged";
    const value = policyEntityValue(model, selectedEntity, projection);
    const copied = await perform("copy", () => writeInspectorClipboard(formatInspectorValue(value)));
    if (copied === null) return;
    setCommand({ pending: null, notice: `Policy-safe ${projection} value copied`, error: null });
  }, [model, perform, runtime.valuePolicyMode, selectedEntity, valueTab]);

  const rewind = useCallback(async () => {
    if (!runtime.client || rewindCursor === null) return;
    const receipt = await perform("rewind", () => rewindEntityGraph(runtime.client!, rewindCursor));
    if (!receipt) return;
    if (receipt.status === "expired-history") {
      setCommand({ pending: null, notice: null, error: `Snapshot ${receipt.cursor} expired from history` });
    } else {
      setCommand({ pending: null, notice: `Graph rewound to snapshot ${receipt.cursor}`, error: null });
    }
  }, [perform, rewindCursor, runtime.client]);

  const returnToLive = useCallback(async () => {
    if (!runtime.client) return;
    const receipt = await perform("return-live", () => returnEntityGraphToLive(runtime.client!));
    if (!receipt) return;
    setCommand({ pending: null, notice: `Returned to live from snapshot ${receipt.previousCursor}`, error: null });
  }, [perform, runtime.client]);

  const exportGraph = useCallback(async () => {
    if (!model) return;
    const exported = await perform("export", () => downloadInspectorExport(
      `${model.snapshot.storeId}-entity-graph-devtools.json`,
      createPolicyAwareExport(model, runtime.valuePolicyMode),
    ));
    if (exported === null) return;
    setCommand({
      pending: null,
      notice: `${runtime.valuePolicyMode} graph export downloaded`,
      error: null,
    });
  }, [model, perform, runtime.valuePolicyMode]);

  const clearCommandFeedback = useCallback(() => {
    setCommand((current) => ({ ...current, notice: null, error: null }));
  }, []);

  return {
    model,
    stores: runtime.stores,
    selectedStoreId: runtime.storeId,
    selectStore: runtime.selectStore,
    valuePolicyMode: runtime.valuePolicyMode,
    workspace,
    setWorkspace: selectWorkspace,
    narrowDetailOpen,
    closeNarrowDetail,
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    entities,
    selectedEntity,
    selectEntity,
    selectEntityIdentity,
    valueTab,
    setValueTab,
    entityDiff,
    entityRelationships,
    entityViews,
    entityHistory,
    previewDraft,
    setPreviewDraft,
    previewValidationError: parsedPreview.error,
    previewDiff,
    activePreview,
    applyPreview,
    restorePreview,
    copyEntityIdentity,
    copyEntityValue,
    canCopyEntityValue,
    views,
    selectedView,
    selectView,
    activityFilter,
    setActivityFilter,
    paused,
    togglePaused,
    events,
    selectedEvent,
    selectedEventExpired,
    selectEvent,
    snapshotReferences,
    rewindCursor,
    setRewindCursor: setSelectedRewindCursor,
    rewind,
    returnToLive,
    timeTravelAvailable,
    exportGraph,
    command,
    clearCommandFeedback,
  };
}
