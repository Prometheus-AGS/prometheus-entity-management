import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import { ENTITY_TYPES, TASK_LIST_KEY } from "@/features/tasks/types";
import type { PlatformService } from "../types";
import { createPlatformService, parseTaskDeepLink } from "./platform-service";

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
  });

  it("reports that browser preview cannot fabricate an IPC denial", async () => {
    const runtime = service();
    await runtime.initialize();
    await expect(runtime.proveDestructiveCommandDenied()).resolves.toBe(
      "Browser preview has no native IPC capability boundary to test.",
    );
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
