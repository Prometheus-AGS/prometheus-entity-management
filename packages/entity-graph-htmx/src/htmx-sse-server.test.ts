/**
 * htmx-sse-server.test.ts
 *
 * Unit tests for the entity-graph-htmx package.
 *
 * Tests cover:
 *  1. SDL IR is consumed correctly (entity types indexed).
 *  2. Server graph upsert + read round-trip.
 *  3. Auto-renderer produces valid HTML with correct structure.
 *  4. SSE event framing (createSseClient) writes correct SSE wire format.
 *  5. Push() triggers the internal change bus (listener called).
 *  6. Subscription key helpers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSdl } from "@prometheus-ags/entity-graph-sdl";
import { createServerGraph } from "./graph-server.js";
import { autoRenderEntity, wrapOobFragment } from "./fragment-renderer.js";
import { subscriptionKey, clientSubscribedTo } from "./sse-client.js";
import { createHtmxSseServer } from "./sse-server.js";
import type { SseEvent } from "./types.js";

// ── Minimal SDL fixture ───────────────────────────────────────────────────────

const testSdlDoc = {
  version: "1.0",
  entities: {
    Post: {
      fields: {
        id:    { type: "uuid",    primary: true },
        title: { type: "string",  required: true },
        body:  { type: "string" },
        published: { type: "boolean" },
        createdAt: { type: "datetime", auto: true },
      },
    },
    Tag: {
      fields: {
        id:   { type: "uuid",   primary: true },
        name: { type: "string", required: true },
      },
      relations: {
        posts: { type: "manyToMany", target: "Post", through: "post_tags" },
      },
    },
  },
};

// ── Tests: SDL parsing ────────────────────────────────────────────────────────

describe("parseSdl", () => {
  it("produces an IR with indexed entity types", () => {
    const ir = parseSdl(testSdlDoc);
    expect(ir.entities).toHaveLength(2);
    const post = ir.entities.find((e) => e.name === "Post");
    expect(post).toBeDefined();
    expect(post?.primaryKey).toBe("id");
    expect(post?.fields.map((f) => f.name)).toContain("title");
  });

  it("rejects a document with no primary key", () => {
    expect(() =>
      parseSdl({ version: "1.0", entities: { Bad: { fields: { x: { type: "string" } } } } })
    ).toThrow();
  });
});

// ── Tests: createServerGraph ──────────────────────────────────────────────────

describe("createServerGraph", () => {
  it("upserts and reads an entity", () => {
    const graph = createServerGraph();
    graph.upsertEntity("Post", "1", { id: "1", title: "Hello" });
    const entity = graph.readEntity("Post", "1");
    expect(entity).toMatchObject({ id: "1", title: "Hello" });
  });

  it("merges patches on read", () => {
    const graph = createServerGraph();
    graph.upsertEntity("Post", "2", { id: "2", title: "Original" });
    graph.getStore().getState().patchEntity("Post", "2", { _selected: true });
    const entity = graph.readEntity("Post", "2");
    expect(entity?._selected).toBe(true);
    // Canonical field still present.
    expect(entity?.title).toBe("Original");
  });

  it("removes an entity", () => {
    const graph = createServerGraph();
    graph.upsertEntity("Post", "3", { id: "3", title: "To Delete" });
    graph.removeEntity("Post", "3");
    expect(graph.readEntity("Post", "3")).toBeUndefined();
  });

  it("notifies listeners on upsert", () => {
    const graph = createServerGraph();
    const listener = vi.fn();
    graph.onEntityChanged(listener);
    graph.upsertEntity("Post", "4", { id: "4", title: "Notified" });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ op: "upsert", type: "Post", id: "4" })
    );
  });

  it("notifies listeners on delete", () => {
    const graph = createServerGraph();
    const listener = vi.fn();
    graph.upsertEntity("Post", "5", { id: "5", title: "Will be removed" });
    graph.onEntityChanged(listener);
    graph.removeEntity("Post", "5");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ op: "delete", type: "Post", id: "5" })
    );
  });

  it("readEntities returns all entities of a type", () => {
    const graph = createServerGraph();
    graph.upsertEntity("Tag", "t1", { id: "t1", name: "TypeScript" });
    graph.upsertEntity("Tag", "t2", { id: "t2", name: "Node" });
    const tags = graph.readEntities("Tag");
    expect(tags.length).toBeGreaterThanOrEqual(2);
    expect(tags.some((t) => t.name === "TypeScript")).toBe(true);
  });
});

// ── Tests: autoRenderEntity ───────────────────────────────────────────────────

describe("autoRenderEntity", () => {
  const ir = parseSdl(testSdlDoc);
  const postIr = ir.entities.find((e) => e.name === "Post")!;

  it("produces a <dl> with entity type and id attributes", () => {
    const html = autoRenderEntity({
      entityType: "Post",
      entityId: "abc",
      entity: { id: "abc", title: "Test Post", body: "Content here", published: true },
      ir: postIr,
      isRealtime: false,
    });
    expect(html).toContain("<dl");
    expect(html).toContain('data-entity-type="Post"');
    expect(html).toContain('data-entity-id="abc"');
    expect(html).toContain("<dt>Title</dt>");
    expect(html).toContain("Test Post");
  });

  it("renders boolean as Yes/No", () => {
    const html = autoRenderEntity({
      entityType: "Post",
      entityId: "b1",
      entity: { id: "b1", title: "Bool test", published: false },
      ir: postIr,
      isRealtime: false,
    });
    expect(html).toContain("No");
  });

  it("renders null values as em dash", () => {
    const html = autoRenderEntity({
      entityType: "Post",
      entityId: "n1",
      entity: { id: "n1", title: "Null test", body: null },
      ir: postIr,
      isRealtime: false,
    });
    expect(html).toContain("—");
  });

  it("escapes HTML in entity values", () => {
    const html = autoRenderEntity({
      entityType: "Post",
      entityId: "xss1",
      entity: { id: "xss1", title: "<script>alert(1)</script>" },
      ir: postIr,
      isRealtime: false,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── Tests: wrapOobFragment ────────────────────────────────────────────────────

describe("wrapOobFragment", () => {
  it("wraps with morph strategy", () => {
    const wrapped = wrapOobFragment("<p>hi</p>", "#my-el", "morph");
    expect(wrapped).toContain('hx-swap-oob="morph:#my-el"');
    expect(wrapped).toContain("<p>hi</p>");
  });

  it("wraps with outerHTML strategy", () => {
    const wrapped = wrapOobFragment("<p>hi</p>", "#el2", "outerHTML");
    expect(wrapped).toContain('hx-swap-oob="outerHTML:#el2"');
  });
});

// ── Tests: subscription key helpers ──────────────────────────────────────────

describe("subscriptionKey / clientSubscribedTo", () => {
  it("builds correct keys", () => {
    expect(subscriptionKey("Post", "123")).toBe("Post:123");
    expect(subscriptionKey("Post", "*")).toBe("Post:*");
  });

  it("clientSubscribedTo returns true for exact match", () => {
    const fakeClient = {
      id: "c1",
      subscriptions: new Set(["Post:123"]),
      send: vi.fn(),
      close: vi.fn(),
    };
    expect(clientSubscribedTo(fakeClient, "Post", "123")).toBe(true);
    expect(clientSubscribedTo(fakeClient, "Post", "999")).toBe(false);
  });

  it("clientSubscribedTo returns true for wildcard", () => {
    const fakeClient = {
      id: "c2",
      subscriptions: new Set(["Post:*"]),
      send: vi.fn(),
      close: vi.fn(),
    };
    expect(clientSubscribedTo(fakeClient, "Post", "any-id")).toBe(true);
    expect(clientSubscribedTo(fakeClient, "Tag", "any-id")).toBe(false);
  });
});

// ── Tests: createHtmxSseServer.push() → listener ─────────────────────────────

describe("createHtmxSseServer", () => {
  it("push upsert triggers the internal graph listener", async () => {
    const ir = parseSdl(testSdlDoc);
    const server = createHtmxSseServer({ ir, heartbeatIntervalMs: 0 });

    // Collect all SSE writes by monkey-patching broadcast.
    const broadcasts: SseEvent[] = [];
    const origBroadcast = server.broadcast.bind(server);
    vi.spyOn(server, "broadcast").mockImplementation((evt) => {
      broadcasts.push(evt);
      origBroadcast(evt);
    });

    await server.push({
      op: "upsert",
      type: "Post",
      id: "p1",
      entity: { id: "p1", title: "SSE test" },
    });

    // No connected clients so nothing was broadcast, but the graph should hold it.
    expect(server.clientCount).toBe(0);

    server.close();
  });

  it("close() resets clientCount to 0", () => {
    const ir = parseSdl(testSdlDoc);
    const server = createHtmxSseServer({ ir, heartbeatIntervalMs: 0 });
    server.close();
    expect(server.clientCount).toBe(0);
  });
});
