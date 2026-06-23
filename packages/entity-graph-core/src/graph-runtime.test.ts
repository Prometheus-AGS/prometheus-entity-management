import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGraphAction,
  createGraphEffect,
  createGraphTool,
  createGraphTransaction,
  exportGraphSnapshot,
  queryOnce,
  useGraphStore,
} from "./index";

describe("graph runtime extensions", () => {
  beforeEach(() => {
    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      lists: {},
      syncMetadata: {},
    } as Partial<ReturnType<typeof useGraphStore.getState>>);
  });

  it("queryOnce returns list snapshots with nested includes", () => {
    const store = useGraphStore.getState();
    store.upsertEntity("User", "u1", { id: "u1", name: "Ada" });
    store.upsertEntity("Task", "t1", { id: "t1", title: "Ship", assigneeId: "u1" });
    store.upsertEntity("Project", "p1", {
      id: "p1",
      name: "Prometheus",
      ownerId: "u1",
      taskIds: ["t1"],
    });
    store.setListResult('["projects"]', ["p1"], { total: 1 });

    const rows = queryOnce({
      type: "Project",
      listKey: '["projects"]',
      include: {
        owner: {
          type: "User",
          via: { kind: "field", field: "ownerId" },
        },
        tasks: {
          type: "Task",
          via: { kind: "array", field: "taskIds" },
          include: {
            assignee: {
              type: "User",
              via: { kind: "field", field: "assigneeId" },
            },
          },
        },
      },
    });

    expect(rows).toEqual([
      {
        id: "p1",
        name: "Prometheus",
        ownerId: "u1",
        taskIds: ["t1"],
        owner: { id: "u1", name: "Ada", $synced: true, $origin: "server", $updatedAt: null },
        tasks: [
          {
            id: "t1",
            title: "Ship",
            assigneeId: "u1",
            $synced: true,
            $origin: "server",
            $updatedAt: null,
            assignee: { id: "u1", name: "Ada", $synced: true, $origin: "server", $updatedAt: null },
          },
        ],
        $synced: true,
        $origin: "server",
        $updatedAt: null,
      },
    ]);
  });

  it("createGraphTransaction restores the graph on rollback", () => {
    const store = useGraphStore.getState();
    store.upsertEntity("Task", "t1", { id: "t1", status: "todo" });

    const tx = createGraphTransaction();
    tx.upsertEntity("Task", "t1", { status: "doing" });
    tx.markEntityPending("Task", "t1");
    tx.rollback();

    expect(queryOnce({ type: "Task", id: "t1" })).toEqual({
      id: "t1",
      status: "todo",
      $synced: true,
      $origin: "server",
      $updatedAt: null,
    });
  });

  it("createGraphAction applies optimistic metadata and marks records synced on success", async () => {
    useGraphStore.getState().upsertEntity("Task", "t1", { id: "t1", status: "todo" });

    const action = createGraphAction<{ id: string; status: string }, { ok: true }>({
      optimistic: (tx, input) => {
        tx.upsertEntity("Task", input.id, { status: input.status });
        tx.markEntityPending("Task", input.id, "optimistic");
      },
      run: async (tx, input) => {
        tx.markEntitySynced("Task", input.id, "server");
        return { ok: true };
      },
    });

    await expect(action({ id: "t1", status: "done" })).resolves.toEqual({ ok: true });
    expect(queryOnce({ type: "Task", id: "t1" })).toMatchObject({
      id: "t1",
      status: "done",
      $synced: true,
      $origin: "server",
    });
  });

  it("createGraphEffect emits enter, update, and exit transitions", () => {
    const events: string[] = [];
    const effect = createGraphEffect({
      query: () =>
        queryOnce<{ id: string; status: string }>({
          type: "Job",
          where: (row) => row.status === "ready",
        }),
      getKey: (row) => row.id,
      skipInitial: true,
      onEnter: (event) => events.push(`enter:${event.value.id}`),
      onUpdate: (event) => events.push(`update:${event.value.id}`),
      onExit: (event) => events.push(`exit:${event.previousValue.id}`),
    });

    const store = useGraphStore.getState();
    store.upsertEntity("Job", "j1", { id: "j1", status: "ready" });
    store.upsertEntity("Job", "j1", { id: "j1", status: "ready", attempts: 1 });
    store.upsertEntity("Job", "j1", { id: "j1", status: "done" });

    effect.dispose();

    expect(events).toEqual(["enter:j1", "update:j1", "exit:j1"]);
  });

  it("createGraphTool exposes query and export helpers for AI-style workflows", async () => {
    const store = useGraphStore.getState();
    store.upsertEntity("Message", "m1", { id: "m1", body: "hello" });
    store.setListResult('["messages"]', ["m1"], { total: 1 });

    const tool = createGraphTool(async (_input: { prompt: string }, ctx) => {
      const rows = ctx.queryOnce<{ id: string; body: string }>({
        type: "Message",
        listKey: '["messages"]',
      });
      return ctx.exportGraphSnapshot({
        scope: "messages",
        data: rows,
      });
    });

    await expect(tool({ prompt: "Summarize the chat" })).resolves.toContain('"scope": "messages"');
    expect(
      exportGraphSnapshot({
        scope: "messages",
        data: queryOnce({ type: "Message", listKey: '["messages"]' }),
      }),
    ).toContain('"body": "hello"');
  });

  it("rolls back optimistic graph actions on failure", async () => {
    useGraphStore.getState().upsertEntity("Task", "t9", { id: "t9", status: "todo" });
    const error = new Error("boom");
    const onError = vi.fn();

    const action = createGraphAction<{ id: string }, never>({
      optimistic: (tx, input) => {
        tx.upsertEntity("Task", input.id, { status: "doing" });
        tx.markEntityPending("Task", input.id);
      },
      run: async () => {
        throw error;
      },
      onError,
    });

    await expect(action({ id: "t9" })).rejects.toThrow("boom");
    expect(onError).toHaveBeenCalledWith(error, { id: "t9" });
    expect(queryOnce({ type: "Task", id: "t9" })).toEqual({
      id: "t9",
      status: "todo",
      $synced: true,
      $origin: "server",
      $updatedAt: null,
    });
  });
});
