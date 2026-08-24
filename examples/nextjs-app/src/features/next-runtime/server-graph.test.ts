import { beforeEach, describe, expect, it } from "vitest";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import { hydrateGraphStore } from "./graph-snapshot";
import { preloadRequestGraph } from "./server-graph";
import { confirmTaskUpdate } from "./task-actions";

describe("Next.js request graph", () => {
  beforeEach(() => {
    graphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("creates isolated serializable snapshots for concurrent server renders", async () => {
    const requestIds = Array.from({ length: 24 }, (_, index) => `request-${index}`);
    const snapshots = await Promise.all(
      requestIds.map((requestId) => preloadRequestGraph({ requestId })),
    );

    expect(
      snapshots.map(
        (snapshot) => snapshot.entities.NextRequest?.current?.requestId,
      ),
    ).toEqual(requestIds);
    expect(new Set(snapshots.map((snapshot) => snapshot.requestId)).size).toBe(24);
    expect(graphStore.getState().entities).toEqual({});

    snapshots[0]!.entities.Task!.t1!.status = "done";
    expect(snapshots[1]!.entities.Task!.t1!.status).not.toBe("done");

    const serialized = JSON.stringify(snapshots[2]);
    const hydrated = hydrateGraphStore(JSON.parse(serialized));
    expect(
      hydrated.getState().readEntity("NextRequest", "current"),
    ).toMatchObject({ requestId: "request-2", preload: "server" });
  });

  it("validates Server Action input against server-owned tasks", async () => {
    await expect(
      confirmTaskUpdate({ id: "t1", status: "review" }),
    ).resolves.toMatchObject({ id: "t1", status: "review" });
    await expect(
      confirmTaskUpdate({ id: "missing", status: "review" }),
    ).rejects.toThrow("Unknown task");
    await expect(
      confirmTaskUpdate({ id: "t1", status: "owner" as never }),
    ).rejects.toThrow("Unsupported task status");
  });
});
