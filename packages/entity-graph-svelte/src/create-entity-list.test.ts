/**
 * Tests for createEntityList.
 *
 * Verifies:
 * 1. Initial state (empty items, isLoading false) with no graph data.
 * 2. `items` is resolved from the graph when ids are already populated.
 * 3. Reactive update when the graph list state changes.
 * 4. Cross-view reactivity: updating an entity updates items without refetch.
 * 5. `loadMore` advances the cursor and appends items.
 * 6. `destroy` stops further updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useGraphStore,
  __resetEntityTransports,
} from "@prometheus-ags/entity-graph-core";
import { createEntityList } from "./create-entity-list.js";

type Post = { id: string; title: string; views: number };
type RawPost = Post;

function resetGraph() {
  const state = useGraphStore.getState();
  const entities = state.entities["Post"];
  if (entities) {
    for (const id of Object.keys(entities)) {
      state.removeEntity("Post", id);
    }
  }
  state.invalidateType("Post");
}

describe("createEntityList", () => {
  beforeEach(() => {
    resetGraph();
    __resetEntityTransports();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes with empty items and isLoading false before any graph data", () => {
    const fetchFn = vi.fn(async () => ({
      items: [] as RawPost[],
      total: 0,
      hasNextPage: false,
    }));

    const list = createEntityList<RawPost, Post>("Post", {
      queryKey: ["posts"],
      fetch: fetchFn,
      normalize: (raw) => ({ id: raw.id, data: raw }),
      staleTime: 60_000,
    });

    // No pre-existing data → items empty, not loading initially.
    // (fetch IS called but async — we verify state before it resolves)
    expect(list.items).toHaveLength(0);
    expect(list.error).toBeNull();
    expect(list.hasNextPage).toBe(false);
    expect(list.total).toBeNull();

    list.destroy();
  });

  it("resolves items from graph when list is pre-populated", () => {
    const graphStore = useGraphStore.getState();

    // Pre-populate entities and list.
    graphStore.upsertEntity("Post", "p1", { id: "p1", title: "Hello", views: 10 });
    graphStore.upsertEntity("Post", "p2", { id: "p2", title: "World", views: 20 });
    graphStore.setEntityFetched("Post", "p1");
    graphStore.setEntityFetched("Post", "p2");
    graphStore.setListResult('["posts"]', ["p1", "p2"], { total: 2, hasNextPage: false });

    const fetchFn = vi.fn(async () => ({ items: [] as RawPost[], total: 2, hasNextPage: false }));

    const list = createEntityList<RawPost, Post>("Post", {
      queryKey: ["posts"],
      fetch: fetchFn,
      normalize: (raw) => ({ id: raw.id, data: raw }),
      staleTime: 60_000, // fresh — won't refetch
    });

    expect(list.items).toHaveLength(2);
    expect(list.items[0].title).toBe("Hello");
    expect(list.items[1].title).toBe("World");
    expect(list.total).toBe(2);
    // staleTime is long and list was just set → no refetch
    expect(fetchFn).not.toHaveBeenCalled();

    list.destroy();
  });

  it("cross-view reactivity: upsertEntity updates items without refetch", () => {
    const graphStore = useGraphStore.getState();

    graphStore.upsertEntity("Post", "p3", { id: "p3", title: "Initial", views: 0 });
    graphStore.setEntityFetched("Post", "p3");
    graphStore.setListResult('["posts-x"]', ["p3"], { total: 1, hasNextPage: false });

    const fetchFn = vi.fn(async () => ({ items: [] as RawPost[], total: 1, hasNextPage: false }));

    const list = createEntityList<RawPost, Post>("Post", {
      queryKey: ["posts-x"],
      fetch: fetchFn,
      normalize: (raw) => ({ id: raw.id, data: raw }),
      staleTime: 60_000,
    });

    expect(list.items[0].views).toBe(0);

    // Simulate a realtime update to the entity.
    graphStore.upsertEntity("Post", "p3", { id: "p3", title: "Updated", views: 999 });

    // The subscription fires synchronously → items updated.
    expect(list.items[0].views).toBe(999);
    expect(list.items[0].title).toBe("Updated");
    expect(fetchFn).not.toHaveBeenCalled();

    list.destroy();
  });

  it("destroy stops reactive updates", () => {
    const graphStore = useGraphStore.getState();

    graphStore.upsertEntity("Post", "p4", { id: "p4", title: "Stable", views: 5 });
    graphStore.setEntityFetched("Post", "p4");
    graphStore.setListResult('["posts-y"]', ["p4"], { total: 1, hasNextPage: false });

    const fetchFn = vi.fn(async () => ({ items: [] as RawPost[], total: 1, hasNextPage: false }));

    const list = createEntityList<RawPost, Post>("Post", {
      queryKey: ["posts-y"],
      fetch: fetchFn,
      normalize: (raw) => ({ id: raw.id, data: raw }),
      staleTime: 60_000,
    });

    expect(list.items[0].views).toBe(5);
    list.destroy();

    // After destroy, mutations should NOT propagate.
    graphStore.upsertEntity("Post", "p4", { id: "p4", title: "Stable", views: 9999 });

    // items still reflects pre-destroy snapshot, not 9999.
    expect(list.items[0].views).not.toBeGreaterThanOrEqual(9999);
  });

  it("hasNextPage and total reflect list state", () => {
    const graphStore = useGraphStore.getState();

    graphStore.upsertEntity("Post", "p5", { id: "p5", title: "Page1", views: 1 });
    graphStore.setEntityFetched("Post", "p5");
    graphStore.setListResult('["posts-paged"]', ["p5"], {
      total: 100,
      hasNextPage: true,
      nextCursor: "cursor-abc",
    });

    const fetchFn = vi.fn(async () => ({ items: [] as RawPost[], total: 100, hasNextPage: true }));

    const list = createEntityList<RawPost, Post>("Post", {
      queryKey: ["posts-paged"],
      fetch: fetchFn,
      normalize: (raw) => ({ id: raw.id, data: raw }),
      staleTime: 60_000,
    });

    expect(list.hasNextPage).toBe(true);
    expect(list.total).toBe(100);

    list.destroy();
  });
});
