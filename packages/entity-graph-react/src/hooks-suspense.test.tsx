import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { useSuspenseEntity } from "./hooks";

type Task = { id: string; title: string };

beforeEach(() => {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

describe("useSuspenseEntity", () => {
  it("starts an initial cache-miss fetch before suspending", async () => {
    const fetchTask = vi.fn(async () => ({ id: "t1", title: "Loaded task" }));

    function TaskDetail() {
      const { data } = useSuspenseEntity<Task, Task>({
        type: "Task",
        id: "t1",
        fetch: fetchTask,
        normalize: (task) => task,
      });
      return <p>{data.title}</p>;
    }

    render(
      <Suspense fallback={<p>Loading task</p>}>
        <TaskDetail />
      </Suspense>,
    );

    expect(screen.getByText("Loading task")).toBeTruthy();
    expect(await screen.findByText("Loaded task")).toBeTruthy();
    expect(fetchTask).toHaveBeenCalledOnce();
  });
});
