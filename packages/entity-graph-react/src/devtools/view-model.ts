import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import type {
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEvent,
  GraphDevtoolsRelationship,
  GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";
import { diffEntityValues, type EntityFieldDiff } from "./diff";
import type { EntityGraphInspectorModel } from "./model";
import { useEntityGraphInspectorModel } from "./use-model";

export type InspectorWorkspace = "overview" | "entities" | "views" | "activity";
export type EntityValueTab = "original" | "patch" | "live" | "diff";
export type EntityStatusFilter = "all" | "dirty" | "errors";
export type ActivityTypeFilter = "all" | GraphDevtoolsEvent["type"];

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

export interface EntityGraphInspectorViewModel {
  model: EntityGraphInspectorModel | null;
  workspace: InspectorWorkspace;
  setWorkspace(workspace: InspectorWorkspace): void;
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
}

export function useEntityGraphInspectorViewModel(): EntityGraphInspectorViewModel {
  const model = useEntityGraphInspectorModel();
  const [workspace, setWorkspace] = useState<InspectorWorkspace>("overview");
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

  const entities = useMemo(() => (model?.entities ?? []).filter((entity) => {
    if (entityFilter === "dirty" && !entity.dirty) return false;
    if (entityFilter === "errors" && !entity.entityState.error) return false;
    return deferredSearch.length === 0 ||
      entity.type.toLocaleLowerCase().includes(deferredSearch) ||
      entity.id.toLocaleLowerCase().includes(deferredSearch);
  }), [deferredSearch, entityFilter, model?.entities]);

  const selectedEntity = useMemo(() => {
    const all = model?.entities ?? [];
    return all.find((entity) => entity.key === selectedEntityKey) ?? entities[0] ?? null;
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

  const selectEntity = useCallback((entity: GraphDevtoolsEntityRecord) => {
    setSelectedEntityKey(entity.key);
  }, []);
  const selectEntityIdentity = useCallback((type: string, id: string) => {
    const entity = model?.entities.find((candidate) => candidate.type === type && candidate.id === id);
    if (!entity) return;
    setSelectedEntityKey(entity.key);
    setWorkspace("entities");
  }, [model?.entities]);
  const selectView = useCallback((view: GraphDevtoolsViewRecord) => {
    setSelectedViewId(view.viewId);
    setWorkspace("views");
  }, []);
  const selectEvent = useCallback((event: GraphDevtoolsEvent) => {
    setSelectedSequence(event.sequence);
    setWorkspace("activity");
  }, []);
  const togglePaused = useCallback(() => {
    if (!paused) setPausedEvents(liveEvents);
    setPaused((current) => !current);
  }, [liveEvents, paused]);

  return {
    model,
    workspace,
    setWorkspace,
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
  };
}
