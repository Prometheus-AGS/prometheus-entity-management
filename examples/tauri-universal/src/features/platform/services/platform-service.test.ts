import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import { ENTITY_TYPES, TASK_LIST_KEY } from "@/features/tasks/types";
import type { PlatformService } from "../types";
import {
  createPlatformService,
  isGraphClearCapabilityDenial,
  isGraphRemoveCapabilityDenial,
  parseTaskDeepLink,
} from "./platform-service";

const QUEUE_STORAGE_KEY = "prometheus:tauri-universal:queue:v1";
const TASK_ID = "task-native-persistence";
const services = new Set<PlatformService>();

class TestStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function setBrowserOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

function resetGraph() {
  graphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
}

function service() {
  const instance = createPlatformService({
    onSnapshot: () => undefined,
    onDeepLinkTask: () => undefined,
  });
  services.add(instance);
  return instance;
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new TestStorage(),
  });
  window.localStorage.clear();
  setBrowserOnline(true);
  resetGraph();
});

afterEach(async () => {
  for (const instance of services) await instance.dispose();
  services.clear();
  resetGraph();
});

describe("universal platform service", () => {
  it("hydrates one normalized graph with ID-only task lists", async () => {
    const runtime = service();
    const snapshot = await runtime.initialize();
    const state = graphStore.getState();

    expect(snapshot).toMatchObject({
      platform: "browser-preview",
      connection: "online",
      storage: "browser-local-storage",
      pendingMutations: 0,
    });
    expect(state.lists[TASK_LIST_KEY].ids).toEqual([
      "task-native-persistence",
      "task-mobile-smoke",
      "task-denied-capability",
      "task-deep-link",
    ]);
    expect(state.entities[ENTITY_TYPES.task][TASK_ID]).toMatchObject({
      id: TASK_ID,
      status: "active",
    });
    expect(state.lists[TASK_LIST_KEY]).not.toHaveProperty("entities");
  });

  it("restores a durable offline mutation and converges it after reconnect", async () => {
    const firstRuntime = service();
    await firstRuntime.initialize();
    await firstRuntime.setConnection("offline");

    const queued = await firstRuntime.updateTaskStatus(TASK_ID, "review");
    expect(queued).toMatchObject({ connection: "offline", pendingMutations: 1 });
    expect(graphStore.getState().readEntity(ENTITY_TYPES.task, TASK_ID)).toMatchObject({
      status: "review",
      pendingSync: true,
    });
    expect(JSON.parse(window.localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]")).toHaveLength(1);
    await firstRuntime.dispose();
    services.delete(firstRuntime);

    resetGraph();
    setBrowserOnline(false);
    const restartedRuntime = service();
    const restored = await restartedRuntime.initialize();
    expect(restored).toMatchObject({ connection: "offline", pendingMutations: 1 });
    expect(graphStore.getState().readEntity(ENTITY_TYPES.task, TASK_ID)).toMatchObject({
      status: "review",
      pendingSync: true,
    });

    setBrowserOnline(true);
    const converged = await restartedRuntime.setConnection("online");
    expect(converged).toMatchObject({ connection: "online", pendingMutations: 0 });
    expect(graphStore.getState().entities[ENTITY_TYPES.task][TASK_ID]).toMatchObject({
      status: "review",
    });
    expect(graphStore.getState().patches[ENTITY_TYPES.task]?.[TASK_ID]).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]")).toEqual([]);
  });

  it("fails closed on a malformed persisted mutation queue", async () => {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ taskId: TASK_ID }));
    await expect(service().initialize()).rejects.toThrow(
      "The persisted task queue does not match the universal example contract.",
    );
    expect(graphStore.getState().entities).toEqual({});
    expect(graphStore.getState().lists).toEqual({});
  });

  it("rejects an unknown queued task before hydrating the graph", async () => {
    window.localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify([
        {
          id: "task-status:task-injected",
          taskId: "task-injected",
          status: "review",
          enqueuedAt: "2026-08-04T00:00:00.000Z",
        },
      ]),
    );

    await expect(service().initialize()).rejects.toThrow(
      "The persisted task queue does not match the universal example contract.",
    );
    expect(graphStore.getState().entities).toEqual({});
    expect(graphStore.getState().lists).toEqual({});
  });

  it("rejects noncanonical, non-ISO, or duplicate queued mutations before hydration", async () => {
    const invalidQueues = [
      [
        {
          id: "forged-mutation-id",
          taskId: TASK_ID,
          status: "review",
          enqueuedAt: "2026-08-04T00:00:00.000Z",
        },
      ],
      [
        {
          id: `task-status:${TASK_ID}`,
          taskId: TASK_ID,
          status: "review",
          enqueuedAt: "not-an-iso-timestamp",
        },
      ],
      [
        {
          id: `task-status:${TASK_ID}`,
          taskId: TASK_ID,
          status: "review",
          enqueuedAt: "2026-08-04T00:00:00.000Z",
        },
        {
          id: `task-status:${TASK_ID}`,
          taskId: TASK_ID,
          status: "done",
          enqueuedAt: "2026-08-04T00:01:00.000Z",
        },
      ],
    ];

    for (const queue of invalidQueues) {
      window.localStorage.clear();
      resetGraph();
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      const runtime = service();
      await expect(runtime.initialize()).rejects.toThrow(
        "The persisted task queue does not match the universal example contract.",
      );
      expect(graphStore.getState().entities).toEqual({});
      expect(graphStore.getState().lists).toEqual({});
      await runtime.dispose();
      services.delete(runtime);
    }
  });

  it("validates a restored mutation queue before hydrating the graph", async () => {
    const runtime = service();
    await runtime.initialize();
    resetGraph();
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ taskId: TASK_ID }));

    await expect(runtime.restore()).rejects.toThrow(
      "The persisted task queue does not match the universal example contract.",
    );
    expect(graphStore.getState().entities).toEqual({});
    expect(graphStore.getState().lists).toEqual({});
  });

  it("reassigns a task and invalidates both relationship targets plus its list", async () => {
    const runtime = service();
    await runtime.initialize();

    await expect(runtime.reassignTaskProject(TASK_ID, "project-mobile")).resolves.toEqual({
      taskId: TASK_ID,
      previousProjectId: "project-release",
      nextProjectId: "project-mobile",
      previousProjectStale: true,
      nextProjectStale: true,
      taskListStale: true,
    });
    expect(graphStore.getState().entities[ENTITY_TYPES.task][TASK_ID]).toMatchObject({
      projectId: "project-mobile",
    });
  });

  it("coalesces three realtime changes into one graph write and final projection", async () => {
    const runtime = service();
    await runtime.initialize();

    await expect(runtime.runRealtimeBurst(TASK_ID)).resolves.toEqual({
      taskId: TASK_ID,
      receivedChanges: 3,
      graphWrites: 1,
      finalStatus: "review",
    });
    expect(graphStore.getState().readEntity(ENTITY_TYPES.task, TASK_ID)).toMatchObject({
      status: "review",
    });
  });

  it("reports that browser preview cannot fabricate an IPC denial", async () => {
    const runtime = service();
    await runtime.initialize();
    await expect(runtime.proveDestructiveCommandDenied()).resolves.toBe(
      "Browser preview has no native IPC capability boundary to test.",
    );
  });

  it("accepts only the observed destructive capability errors as denial proof", () => {
    expect(
      isGraphClearCapabilityDenial(
        new Error(
          "entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear",
        ),
      ),
    ).toBe(true);
    expect(isGraphClearCapabilityDenial(new Error("native IPC transport disconnected"))).toBe(false);
    expect(
      isGraphClearCapabilityDenial(
        new Error(
          "prefix entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear",
        ),
      ),
    ).toBe(false);
    expect(
      isGraphClearCapabilityDenial(
        new Error(
          "entity-graph-tauri.graph_remove_entity not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-remove-entity",
        ),
      ),
    ).toBe(false);
    expect(
      isGraphRemoveCapabilityDenial(
        new Error(
          "entity-graph-tauri.graph_remove_entity not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-remove-entity",
        ),
      ),
    ).toBe(true);
    expect(
      isGraphRemoveCapabilityDenial(
        new Error(
          "entity-graph-tauri.graph_clear not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-clear",
        ),
      ),
    ).toBe(false);
    expect(isGraphRemoveCapabilityDenial(new Error("native IPC transport disconnected"))).toBe(
      false,
    );
    expect(
      isGraphRemoveCapabilityDenial(
        new Error(
          "entity-graph-tauri.graph_remove_entity not allowed. Permissions associated with this command: entity-graph-tauri:allow-graph-remove-entity suffix",
        ),
      ),
    ).toBe(false);
  });
});

describe("task deep-link boundary", () => {
  const known = new Set([TASK_ID]);

  it("accepts only the registered scheme, tenant, route, and known graph ID", () => {
    expect(
      parseTaskDeepLink(
        `prometheus-entity://task/${TASK_ID}?tenant=prometheus-labs`,
        known,
      ),
    ).toBe(TASK_ID);
    expect(parseTaskDeepLink(`https://task/${TASK_ID}?tenant=prometheus-labs`, known)).toBeNull();
    expect(parseTaskDeepLink(`prometheus-entity://task/${TASK_ID}?tenant=other`, known)).toBeNull();
    expect(
      parseTaskDeepLink("prometheus-entity://task/task-unknown?tenant=prometheus-labs", known),
    ).toBeNull();
    expect(parseTaskDeepLink("not a URL", known)).toBeNull();
    expect(parseTaskDeepLink("prometheus-entity://task/%E0%A4%A?tenant=prometheus-labs", known)).toBeNull();
  });
});
