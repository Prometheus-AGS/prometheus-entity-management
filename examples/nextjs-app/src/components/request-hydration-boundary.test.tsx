import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createGraphStore,
  graphStore,
  GraphStoreProvider,
} from "@prometheus-ags/prometheus-entity-management";
import { RequestHydrationBoundary } from "./request-hydration-boundary";

describe("RequestHydrationBoundary", () => {
  beforeEach(() => {
    graphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("hydrates the provider-owned graph without writing the singleton", async () => {
    const request = createGraphStore();
    const payload = {
      entities: [{ type: "Project", id: "p1", data: { name: "Scoped" } }],
      lists: [{ key: '["projects"]', ids: ["p1"], total: 1 }],
    };

    const rendered = render(
      <GraphStoreProvider store={request}>
        <RequestHydrationBoundary payload={payload} fallback={<span>loading</span>}>
          <span>ready</span>
        </RequestHydrationBoundary>
      </GraphStoreProvider>,
    );

    await waitFor(() => expect(rendered.getByText("ready")).toBeTruthy());
    expect(request.getState().readEntity("Project", "p1")).toEqual({ name: "Scoped" });
    expect(request.getState().lists['["projects"]']?.ids).toEqual(["p1"]);
    expect(graphStore.getState().readEntity("Project", "p1")).toBeNull();
    expect(graphStore.getState().lists['["projects"]']).toBeUndefined();
  });
});
