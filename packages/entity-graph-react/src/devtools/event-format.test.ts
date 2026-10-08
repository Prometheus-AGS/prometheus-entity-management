import { describe, expect, it } from "vitest";
import type { GraphDevtoolsChange, GraphDevtoolsEvent } from "@prometheus-ags/entity-graph-core/devtools";

import { eventCorrelationLabel, eventTitle } from "./event-format";

type MutationEvent = Extract<GraphDevtoolsEvent, { type: "mutation" }>;

const counts = {
  entityTypes: 1, entities: 1, patchedEntities: 0, entityStates: 0, syncMetadata: 0,
  lists: 0, listMemberships: 0, fetching: 0, stale: 0, errors: 0,
};

function mutation(changes: GraphDevtoolsChange[], affected?: MutationEvent["payload"]["affectedEntities"]): MutationEvent {
  return {
    protocol: "prometheus.entity-graph.devtools",
    version: 1,
    storeId: "graph-1",
    eventId: "graph-1:7",
    sequence: 7,
    correlationId: "graph-1:7",
    observedAt: "2026-10-08T12:00:00.000Z",
    type: "mutation",
    payload: {
      snapshot: { status: "retained", cursor: 3, eventSequence: 7, bytes: 10, capturedAt: "2026-10-08T12:00:00.000Z" },
      changes,
      ...(affected ? { affectedEntities: affected } : {}),
      before: counts,
      after: counts,
      projectionDurationMs: 0.5,
      valuesTruncated: false,
      changesOmitted: 0,
    },
  } as MutationEvent;
}

describe("eventTitle for mutations", () => {
  it("names the first affected identity and its patch operation, listing fields when values are included", () => {
    const event = mutation([
      { category: "patch", action: "added", key: "Order", id: "o-1042", valueState: "included", after: { status: "paid" } },
    ]);
    expect(eventTitle(event)).toBe("Order/o-1042 · patch status");
  });

  it("falls back to a bare patch operation under the metadata-only policy", () => {
    const event = mutation([
      { category: "patch", action: "updated", key: "Order", id: "o-1042", valueState: "hidden-by-policy" },
    ]);
    expect(eventTitle(event)).toBe("Order/o-1042 · patch");
  });

  it("describes entity upserts and removals", () => {
    expect(eventTitle(mutation([
      { category: "entity", action: "updated", key: "Order", id: "o-1042", valueState: "hidden-by-policy" },
    ]))).toBe("Order/o-1042 · upsert");
    expect(eventTitle(mutation([
      { category: "entity", action: "removed", key: "Order", id: "o-1042", valueState: "hidden-by-policy" },
    ]))).toBe("Order/o-1042 · remove");
  });

  it("counts the other affected identities", () => {
    const event = mutation([
      { category: "entity", action: "added", key: "Order", id: "o-1", valueState: "hidden-by-policy" },
      { category: "entity", action: "added", key: "Order", id: "o-2", valueState: "hidden-by-policy" },
      { category: "entity", action: "added", key: "Order", id: "o-3", valueState: "hidden-by-policy" },
    ]);
    expect(eventTitle(event)).toBe("Order/o-1 · upsert · +2 more");
  });

  it("keeps the change-count form only when no identity is known", () => {
    expect(eventTitle(mutation([
      { category: "list", action: "updated", key: "orders:all", valueState: "hidden-by-policy", beforeCount: 1, afterCount: 2 },
    ]))).toBe("1 graph change");
    expect(eventTitle(mutation([
      { category: "list", action: "updated", key: "a", valueState: "hidden-by-policy" },
      { category: "sync", action: "updated", key: "b", valueState: "hidden-by-policy" },
    ]))).toBe("2 graph changes");
  });
});

describe("eventCorrelationLabel", () => {
  it("shows the last colon-separated segment rather than the store prefix", () => {
    expect(eventCorrelationLabel(mutation([]))).toBe("7");
    expect(eventCorrelationLabel({ ...mutation([]), correlationId: "store:req:abc123" })).toBe("abc123");
  });
});
