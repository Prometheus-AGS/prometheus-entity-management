import type {
  GraphDevtoolsEvent,
  GraphDevtoolsViewMembership,
} from "@prometheus-ags/entity-graph-core/devtools";

export function causalEntityKey(entity: GraphDevtoolsViewMembership): string {
  return JSON.stringify([entity.type, entity.id]);
}

export function affectedEntitiesForEvent(
  event: GraphDevtoolsEvent,
): readonly GraphDevtoolsViewMembership[] {
  if (event.type !== "mutation") return [];
  if ((event.payload.affectedEntities?.length ?? 0) > 0) return event.payload.affectedEntities ?? [];
  const identities = new Map<string, GraphDevtoolsViewMembership>();
  for (const change of event.payload.changes) {
    if ((change.category === "entity" || change.category === "patch") && change.id !== undefined) {
      const identity = { type: change.key, id: change.id };
      identities.set(causalEntityKey(identity), identity);
    }
  }
  return [...identities.values()];
}

export function affectedViewIdsForEvent(event: GraphDevtoolsEvent): readonly string[] {
  if (event.type === "view") return [event.payload.viewId];
  return event.type === "mutation" ? event.payload.affectedViewIds ?? [] : [];
}

export function graphPulseImpact(event: GraphDevtoolsEvent): string {
  if (event.type === "mutation") {
    const entities = affectedEntitiesForEvent(event).length;
    const views = affectedViewIdsForEvent(event).length;
    return `${event.payload.changes.length} changes · ${entities} entities · ${views} views`;
  }
  if (event.type === "view") return `${event.payload.membershipCount} rendered members`;
  if (event.type === "time-travel") return event.payload.state === "live" ? "live graph restored" : "snapshot selected";
  if (event.type === "diagnostic") return event.payload.code;
  return `${event.payload.activeClients} clients`;
}
