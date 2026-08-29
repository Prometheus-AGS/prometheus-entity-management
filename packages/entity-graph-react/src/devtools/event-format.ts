import type { GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
});

export function formatEventTime(event: GraphDevtoolsEvent): string {
  return timeFormatter.format(new Date(event.observedAt));
}

export function eventTitle(event: GraphDevtoolsEvent): string {
  switch (event.type) {
    case "mutation": {
      const count = event.payload.changes.length;
      return count === 1 ? "1 graph change" : `${count} graph changes`;
    }
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
