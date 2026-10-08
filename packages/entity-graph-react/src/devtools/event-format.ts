import type { GraphDevtoolsChange, GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";
import { affectedEntitiesForEvent } from "./causality";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
});

export function formatEventTime(event: GraphDevtoolsEvent): string {
  return timeFormatter.format(new Date(event.observedAt));
}

function patchedFieldNames(change: GraphDevtoolsChange): string[] {
  const after = change.after;
  return typeof after === "object" && after !== null && !Array.isArray(after)
    ? Object.keys(after)
    : [];
}

/** Human operation for the change that targets one identity, e.g. "patch status" or "upsert". */
function changeOperation(change: GraphDevtoolsChange | undefined): string {
  if (!change) return "change";
  if (change.category === "patch") {
    if (change.action === "removed") return "clear patch";
    const fields = patchedFieldNames(change);
    return fields.length > 0 ? `patch ${fields.join(", ")}` : "patch";
  }
  if (change.category === "entity") return change.action === "removed" ? "remove" : "upsert";
  return change.category === "entity-state" ? "state" : change.category;
}

function mutationTitle(event: Extract<GraphDevtoolsEvent, { type: "mutation" }>): string {
  const affected = affectedEntitiesForEvent(event);
  const first = affected[0];
  if (!first) {
    const count = event.payload.changes.length;
    return count === 1 ? "1 graph change" : `${count} graph changes`;
  }
  const targeting = event.payload.changes.filter((change) => change.key === first.type && change.id === first.id);
  const change = targeting.find((candidate) => candidate.category === "patch")
    ?? targeting.find((candidate) => candidate.category === "entity")
    ?? targeting[0];
  const more = affected.length - 1;
  return `${first.type}/${first.id} · ${changeOperation(change)}${more > 0 ? ` · +${more} more` : ""}`;
}

/** The request-scoped suffix of a correlation id; the prefix is only the store id. */
export function eventCorrelationLabel(event: Pick<GraphDevtoolsEvent, "correlationId">): string {
  const segments = event.correlationId.split(":");
  return segments[segments.length - 1] || event.correlationId;
}

export function eventTitle(event: GraphDevtoolsEvent): string {
  switch (event.type) {
    case "mutation":
      return mutationTitle(event);
    case "view":
      return `${event.payload.state.replaceAll("-", " ")} · ${event.payload.viewId}`;
    case "time-travel":
      return event.payload.state === "live" ? "Returned to live" : `Rewound to ${event.payload.cursor}`;
    case "diagnostic":
      return event.payload.message;
    case "lifecycle":
      return event.payload.state.replaceAll("-", " ");
  }
}

export function eventDetail(event: GraphDevtoolsEvent): string {
  switch (event.type) {
    case "mutation":
      return `${event.payload.before.entities} → ${event.payload.after.entities} entities · ${event.payload.projectionDurationMs.toFixed(2)} ms`;
    case "view":
      return `${event.payload.membershipCount} registered members`;
    case "time-travel":
      return `Source ${event.payload.source ?? "live"} · ${event.payload.reason}`;
    case "diagnostic":
      return event.payload.code;
    case "lifecycle":
      return `${event.payload.activeClients} active clients`;
  }
}
