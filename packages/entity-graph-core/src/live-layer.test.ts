import { describe, expect, it, vi } from "vitest";
import { createGraphStore } from "./graph";
import { createLiveLayer } from "./live-layer";
import { persistGraphToStorage, type GraphPersistenceAdapter } from "./local-first-runtime";

function memoryStorage(): GraphPersistenceAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  };
}

describe("live layer", () => {
  it("holds streaming values without writing to the graph", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("Message", "m1", { id: "m1", text: "", status: "streaming" });
    const graphListener = vi.fn();
    store.subscribe(graphListener);
    const live = createLiveLayer({ store });

    for (const token of ["Hel", "lo", ", ", "world"]) live.append("Message", "m1", "text", token);

    expect(graphListener).not.toHaveBeenCalled();
    expect(store.getState().entities.Message.m1.text).toBe("");
    expect(live.get("Message", "m1")).toEqual({ text: "Hello, world" });
    expect(live.read("Message", "m1")).toEqual({ id: "m1", text: "Hello, world", status: "streaming" });
  });

  it("notifies only that entity's subscribers and returns a stable merged reference", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    const onM1 = vi.fn();
    const onM2 = vi.fn();
    live.subscribe("Message", "m1", onM1);
    live.subscribe("Message", "m2", onM2);

    live.append("Message", "m1", "text", "a");
    live.append("Message", "m1", "text", "b");

    expect(onM1).toHaveBeenCalledTimes(2);
    expect(onM2).not.toHaveBeenCalled();
    expect(live.read("Message", "m1")).toBe(live.read("Message", "m1"));
  });

  it("subscribers also hear durable graph changes to the same entity", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    const listener = vi.fn();
    const unsubscribe = live.subscribe("Message", "m1", listener);
    store.getState().upsertEntity("Message", "m1", { status: "done" });
    store.getState().upsertEntity("Message", "other", { status: "done" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.getState().upsertEntity("Message", "m1", { status: "again" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("commit makes live values durable in one graph write and clears them", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("Message", "m1", { id: "m1", text: "", status: "streaming" });
    const live = createLiveLayer({ store });
    live.append("Message", "m1", "text", "Hello");
    live.set("Message", "m1", { tokens: 2 });
    const graphListener = vi.fn();
    store.subscribe(graphListener);
    const liveListener = vi.fn();
    live.subscribe("Message", "m1", liveListener);

    live.commit("Message", "m1");

    expect(graphListener).toHaveBeenCalledTimes(1);
    expect(liveListener).toHaveBeenCalledTimes(1);
    expect(store.getState().entities.Message.m1).toEqual({ id: "m1", text: "Hello", status: "streaming", tokens: 2 });
    expect(live.get("Message", "m1")).toBeUndefined();
    expect(live.read("Message", "m1")).toEqual({ id: "m1", text: "Hello", status: "streaming", tokens: 2 });
  });

  it("commit with fields keeps the other live values ephemeral", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    live.set("Message", "m1", { text: "abc", cursor: 3 });
    live.commit("Message", "m1", { fields: ["text"] });
    expect(store.getState().entities.Message.m1).toEqual({ text: "abc" });
    expect(live.get("Message", "m1")).toEqual({ cursor: 3 });
  });

  it("commitAll writes every live entity in a single graph notification", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    live.append("Message", "m1", "text", "one");
    live.append("Message", "m2", "text", "two");
    live.set("ToolCall", "t1", { args: "{}" });
    const graphListener = vi.fn();
    store.subscribe(graphListener);
    live.commitAll();
    expect(graphListener).toHaveBeenCalledTimes(1);
    expect(store.getState().entities.Message).toEqual({ m1: { text: "one" }, m2: { text: "two" } });
    expect(store.getState().entities.ToolCall.t1).toEqual({ args: "{}" });
    expect(live.get("Message", "m1")).toBeUndefined();
  });

  it("discard drops live values without touching the graph", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    live.set("Message", "m1", { text: "draft", cursor: 1 });
    live.discard("Message", "m1", ["cursor"]);
    expect(live.get("Message", "m1")).toEqual({ text: "draft" });
    live.discard("Message", "m1");
    expect(live.get("Message", "m1")).toBeUndefined();
    expect(store.getState().entities.Message).toBeUndefined();
  });

  it("live values are not persisted; committed values are", async () => {
    const store = createGraphStore();
    const storage = memoryStorage();
    store.getState().upsertEntity("Message", "m1", { id: "m1", text: "" });
    const live = createLiveLayer({ store });
    live.append("Message", "m1", "text", "secret-in-flight");

    await persistGraphToStorage({ storage, key: "g", store });
    expect(storage.data.get("g")).not.toContain("secret-in-flight");

    live.commit("Message", "m1");
    await persistGraphToStorage({ storage, key: "g", store });
    expect(storage.data.get("g")).toContain("secret-in-flight");
  });

  it("calling an unsubscribe twice does not drop a later subscriber", () => {
    const store = createGraphStore();
    const live = createLiveLayer({ store });
    const first = live.subscribe("Message", "m1", () => undefined);
    first();
    const later = vi.fn();
    live.subscribe("Message", "m1", later);
    first();
    live.set("Message", "m1", { text: "x" });
    expect(later).toHaveBeenCalledTimes(1);
  });

  it("append to a field holding a non-string starts from the empty string", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("Message", "m1", { text: null });
    const live = createLiveLayer({ store });
    live.append("Message", "m1", "text", "x");
    expect(live.get("Message", "m1")).toEqual({ text: "x" });
  });

  it("append continues from the durable value when nothing is live yet", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("Message", "m1", { text: "Hello" });
    const live = createLiveLayer({ store });
    live.append("Message", "m1", "text", ", world");
    expect(live.get("Message", "m1")).toEqual({ text: "Hello, world" });
  });
});
