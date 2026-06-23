/**
 * a2a-server.test.ts — Unit tests for the entity-graph A2A server.
 *
 * Tests verify:
 * 1. AgentCard is correctly built and served.
 * 2. tasks/send creates a new task and runs the handler.
 * 3. GraphMutationPart → graph upsert applies correctly.
 * 4. GraphQueryPart → returns entity data from the graph.
 * 5. tasks/get retrieves a stored task.
 * 6. tasks/cancel transitions task to "canceled".
 * 7. Error handling: unknown method, missing params, task not found.
 * 8. DefaultEntityGraphHandler processes text, mutation, and query parts.
 * 9. MemoryTaskStore stores, retrieves, and deletes tasks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  createA2AServer,
  buildAgentCard,
  DefaultEntityGraphHandler,
  MemoryTaskStore,
} from "./index.js";
import type {
  GraphMutationPart,
  GraphQueryPart,
  JsonRpcRequest,
  JsonRpcSuccess,
  SendTaskResult,
  Task,
} from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeServer() {
  return createA2AServer({
    card: buildAgentCard({ url: "https://test.example.com/a2a" }),
    handler: new DefaultEntityGraphHandler(),
  });
}

function makeSendRequest(taskId: string, parts: GraphMutationPart["mutations"] | { type: string }[]): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: "req-1",
    method: "tasks/send",
    params: {
      id: taskId,
      message: {
        role: "user",
        parts,
      },
    },
  };
}

function isSuccess<T>(resp: unknown): resp is JsonRpcSuccess<T> {
  return typeof resp === "object" && resp !== null && "result" in resp;
}

// ── Reset graph before each test ──────────────────────────────────────────────

beforeEach(() => {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

// ── AgentCard ─────────────────────────────────────────────────────────────────

describe("buildAgentCard", () => {
  it("produces a valid AgentCard with specVersion 1.0", () => {
    const card = buildAgentCard({ url: "https://example.com/a2a" });
    expect(card.specVersion).toBe("1.0");
    expect(card.url).toBe("https://example.com/a2a");
    expect(card.capabilities.length).toBeGreaterThan(0);
  });

  it("includes graph/upsert, graph/query, and graph/snapshot capabilities", () => {
    const card = buildAgentCard({ url: "https://example.com/a2a" });
    const names = card.capabilities.map((c) => c.name);
    expect(names).toContain("graph/upsert");
    expect(names).toContain("graph/query");
    expect(names).toContain("graph/snapshot");
  });

  it("accepts custom name and extra capabilities", () => {
    const card = buildAgentCard({
      url: "https://example.com/a2a",
      name: "My Custom Agent",
      extraCapabilities: [{ name: "custom/skill", description: "A custom skill" }],
    });
    expect(card.name).toBe("My Custom Agent");
    const names = card.capabilities.map((c) => c.name);
    expect(names).toContain("custom/skill");
  });
});

// ── A2AServer.getCard ─────────────────────────────────────────────────────────

describe("A2AServer.getCard", () => {
  it("returns the configured AgentCard", () => {
    const server = makeServer();
    const card = server.getCard();
    expect(card.specVersion).toBe("1.0");
    expect(card.url).toBe("https://test.example.com/a2a");
  });
});

// ── tasks/send ────────────────────────────────────────────────────────────────

describe("tasks/send", () => {
  it("creates a new task and returns it in completed state", async () => {
    const server = makeServer();
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-send-1",
      method: "tasks/send",
      params: {
        id: "task-001",
        message: {
          role: "user",
          parts: [{ type: "text", text: "Hello agent" }],
        },
      },
    };

    const resp = await server.handleRequest(req);
    expect(isSuccess(resp)).toBe(true);
    if (isSuccess<SendTaskResult>(resp)) {
      const task = resp.result.task;
      expect(task.id).toBe("task-001");
      expect(task.status.state).toBe("completed");
      expect(task.history.length).toBeGreaterThan(0);
    }
  });

  it("applies a GraphMutationPart and returns graph-snapshot artifact", async () => {
    const server = makeServer();
    const mutation: GraphMutationPart = {
      type: "graph/mutation",
      mutations: [
        { op: "upsert", entityType: "Project", id: "proj-1", data: { id: "proj-1", name: "Alpha" } },
      ],
    };

    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-send-2",
      method: "tasks/send",
      params: {
        id: "task-002",
        message: { role: "user", parts: [mutation] },
      },
    };

    const resp = await server.handleRequest(req);
    expect(isSuccess(resp)).toBe(true);
    if (isSuccess<SendTaskResult>(resp)) {
      const task = resp.result.task;
      expect(task.status.state).toBe("completed");
      expect(task.artifacts.length).toBeGreaterThan(0);
      expect(task.artifacts[0].type).toBe("graph-snapshot");
    }

    // Verify the entity was actually written to the graph.
    const state = useGraphStore.getState();
    expect(state.entities["Project"]?.["proj-1"]).toBeDefined();
    expect((state.entities["Project"]["proj-1"] as Record<string, unknown>)["name"]).toBe("Alpha");
  });

  it("applies multiple mutation ops in a single part", async () => {
    const server = makeServer();
    const mutation: GraphMutationPart = {
      type: "graph/mutation",
      mutations: [
        { op: "upsert", entityType: "Task", id: "t-1", data: { id: "t-1", title: "First" } },
        { op: "upsert", entityType: "Task", id: "t-2", data: { id: "t-2", title: "Second" } },
        { op: "patch", entityType: "Task", id: "t-1", patch: { _selected: true } },
      ],
    };

    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-send-3",
      method: "tasks/send",
      params: {
        id: "task-003",
        message: { role: "user", parts: [mutation] },
      },
    };

    await server.handleRequest(req);

    const state = useGraphStore.getState();
    expect(state.entities["Task"]?.["t-1"]).toBeDefined();
    expect(state.entities["Task"]?.["t-2"]).toBeDefined();
    expect(state.patches["Task"]?.["t-1"]?.["_selected"]).toBe(true);
  });

  it("resolves a GraphQueryPart and returns data artifact", async () => {
    // Seed the graph first.
    useGraphStore.getState().upsertEntity("User", "u-1", { id: "u-1", email: "alice@example.com" });

    const server = makeServer();
    const queryPart: GraphQueryPart = {
      type: "graph/query",
      entityType: "User",
      id: "u-1",
    };

    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-send-4",
      method: "tasks/send",
      params: {
        id: "task-004",
        message: { role: "user", parts: [queryPart] },
      },
    };

    const resp = await server.handleRequest(req);
    expect(isSuccess(resp)).toBe(true);
    if (isSuccess<SendTaskResult>(resp)) {
      const task = resp.result.task;
      expect(task.artifacts.length).toBeGreaterThan(0);
      const artifact = task.artifacts[0];
      expect(artifact.type).toBe("data");
      const content = artifact.content as { entities: unknown[] };
      expect(content.entities.length).toBe(1);
    }
  });

  it("returns error for invalid params (missing id)", async () => {
    const server = makeServer();
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-send-err",
      method: "tasks/send",
      params: { message: { role: "user", parts: [] } }, // missing id
    };
    const resp = await server.handleRequest(req);
    expect("error" in resp).toBe(true);
  });
});

// ── tasks/get ────────────────────────────────────────────────────────────────

describe("tasks/get", () => {
  it("returns a previously sent task", async () => {
    const server = makeServer();
    const sendReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-g-1",
      method: "tasks/send",
      params: {
        id: "task-get-1",
        message: { role: "user", parts: [{ type: "text", text: "hi" }] },
      },
    };
    await server.handleRequest(sendReq);

    const getReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-g-2",
      method: "tasks/get",
      params: { id: "task-get-1" },
    };
    const resp = await server.handleRequest(getReq);
    expect(isSuccess(resp)).toBe(true);
    if (isSuccess<{ task: Task }>(resp)) {
      expect(resp.result.task.id).toBe("task-get-1");
    }
  });

  it("returns error for a non-existent task id", async () => {
    const server = makeServer();
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-g-err",
      method: "tasks/get",
      params: { id: "does-not-exist" },
    };
    const resp = await server.handleRequest(req);
    expect("error" in resp).toBe(true);
    if ("error" in resp) {
      expect(resp.error.code).toBe(-32001);
    }
  });

  it("trims history to historyLength", async () => {
    const server = makeServer();
    // Send a task with a message.
    const sendReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-trim-1",
      method: "tasks/send",
      params: {
        id: "task-trim",
        message: { role: "user", parts: [{ type: "text", text: "msg1" }] },
      },
    };
    await server.handleRequest(sendReq);

    const getReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-trim-2",
      method: "tasks/get",
      params: { id: "task-trim", historyLength: 1 },
    };
    const resp = await server.handleRequest(getReq);
    if (isSuccess<{ task: Task }>(resp)) {
      expect(resp.result.task.history.length).toBeLessThanOrEqual(1);
    }
  });
});

// ── tasks/cancel ─────────────────────────────────────────────────────────────

describe("tasks/cancel", () => {
  it("cancels a task in submitted/working state", async () => {
    // Create a long-running task with a custom handler that returns "working".
    const store = new MemoryTaskStore();
    const now = new Date().toISOString();
    await store.set({
      id: "task-cancel-1",
      status: { state: "working", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    });

    const server = createA2AServer({
      card: buildAgentCard({ url: "https://test.example.com/a2a" }),
      handler: new DefaultEntityGraphHandler(),
      store,
    });

    const cancelReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-cancel-1",
      method: "tasks/cancel",
      params: { id: "task-cancel-1" },
    };
    const resp = await server.handleRequest(cancelReq);
    expect(isSuccess(resp)).toBe(true);
    if (isSuccess<{ task: Task }>(resp)) {
      expect(resp.result.task.status.state).toBe("canceled");
    }
  });

  it("returns error when trying to cancel a completed task", async () => {
    const store = new MemoryTaskStore();
    const now = new Date().toISOString();
    await store.set({
      id: "task-done",
      status: { state: "completed", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    });

    const server = createA2AServer({
      card: buildAgentCard({ url: "https://test.example.com/a2a" }),
      handler: new DefaultEntityGraphHandler(),
      store,
    });

    const cancelReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "req-cancel-err",
      method: "tasks/cancel",
      params: { id: "task-done" },
    };
    const resp = await server.handleRequest(cancelReq);
    expect("error" in resp).toBe(true);
  });
});

// ── Unknown method ────────────────────────────────────────────────────────────

describe("error handling", () => {
  it("returns method-not-found for unknown RPC methods", async () => {
    const server = makeServer();
    const req = {
      jsonrpc: "2.0",
      id: "req-unknown",
      method: "tasks/unknownMethod",
      params: {},
    } as unknown as JsonRpcRequest;
    const resp = await server.handleRequest(req);
    expect("error" in resp).toBe(true);
    if ("error" in resp) {
      expect(resp.error.code).toBe(-32601);
    }
  });

  it("returns parse error for non-object input", async () => {
    const server = makeServer();
    const resp = await server.handleRequest("not-an-object");
    expect("error" in resp).toBe(true);
  });

  it("returns parse error when jsonrpc field is wrong", async () => {
    const server = makeServer();
    const resp = await server.handleRequest({ jsonrpc: "1.0", id: 1, method: "tasks/get", params: {} });
    expect("error" in resp).toBe(true);
  });
});

// ── MemoryTaskStore ───────────────────────────────────────────────────────────

describe("MemoryTaskStore", () => {
  it("stores and retrieves a task by id", async () => {
    const store = new MemoryTaskStore();
    const now = new Date().toISOString();
    const task: Task = {
      id: "store-1",
      status: { state: "submitted", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    await store.set(task);
    const found = await store.get("store-1");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("store-1");
  });

  it("returns null for a missing task id", async () => {
    const store = new MemoryTaskStore();
    const result = await store.get("missing");
    expect(result).toBeNull();
  });

  it("deletes a task", async () => {
    const store = new MemoryTaskStore();
    const now = new Date().toISOString();
    const task: Task = {
      id: "del-1",
      status: { state: "completed", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    await store.set(task);
    await store.delete("del-1");
    expect(await store.get("del-1")).toBeNull();
  });
});

// ── DefaultEntityGraphHandler direct tests ───────────────────────────────────

describe("DefaultEntityGraphHandler", () => {
  it("removes an entity via remove mutation", async () => {
    // Seed first.
    useGraphStore.getState().upsertEntity("Tag", "tag-1", { id: "tag-1", name: "test" });

    const handler = new DefaultEntityGraphHandler();
    const now = new Date().toISOString();
    const task: Task = {
      id: "handler-t-1",
      status: { state: "working", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    const graphState = useGraphStore.getState();
    const mutation: GraphMutationPart = {
      type: "graph/mutation",
      mutations: [{ op: "remove", entityType: "Tag", id: "tag-1" }],
    };
    const result = await handler.handle({
      task,
      message: { role: "user", parts: [mutation] },
      graphState,
    });

    expect(result.status.state).toBe("completed");
    const state = useGraphStore.getState();
    expect(state.entities["Tag"]?.["tag-1"]).toBeUndefined();
  });

  it("returns query results for all entities of a type", async () => {
    useGraphStore.getState().upsertEntity("Category", "cat-1", { id: "cat-1", label: "A" });
    useGraphStore.getState().upsertEntity("Category", "cat-2", { id: "cat-2", label: "B" });

    const handler = new DefaultEntityGraphHandler();
    const now = new Date().toISOString();
    const task: Task = {
      id: "handler-t-2",
      status: { state: "working", updatedAt: now },
      history: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    const queryPart: GraphQueryPart = {
      type: "graph/query",
      entityType: "Category",
    };
    const result = await handler.handle({
      task,
      message: { role: "user", parts: [queryPart] },
      graphState: useGraphStore.getState(),
    });

    expect(result.status.state).toBe("completed");
    const artifact = result.artifacts?.[0];
    expect(artifact?.type).toBe("data");
    const content = artifact?.content as { entities: unknown[]; total: number };
    expect(content.entities.length).toBe(2);
    expect(content.total).toBe(2);
  });
});
