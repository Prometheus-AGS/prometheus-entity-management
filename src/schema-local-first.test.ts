import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEntityFieldsFromSchema,
  createGraphAction,
  createSchemaGraphTool,
  exportGraphSnapshotWithSchemas,
  getEntityJsonSchema,
  hydrateGraphFromStorage,
  MarkdownFieldRenderer,
  persistGraphToStorage,
  registerEntityJsonSchema,
  registerRuntimeSchema,
  startLocalFirstGraph,
  useGraphStore,
} from "./index";

describe("schema-driven local-first runtime", () => {
  beforeEach(() => {
    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      lists: {},
      syncMetadata: {},
    } as Partial<ReturnType<typeof useGraphStore.getState>>);
  });

  it("persists and hydrates graph data with sync metadata", async () => {
    const storage = createMemoryStorage();
    const store = useGraphStore.getState();
    store.upsertEntity("Task", "t1", { id: "t1", title: "Offline first" });
    store.setEntitySyncMetadata("Task", "t1", { synced: false, origin: "optimistic", updatedAt: 123 });
    store.setListResult('["tasks"]', ["t1"], { total: 1 });

    const persisted = await persistGraphToStorage({ storage, key: "graph:test" });
    expect(persisted.ok).toBe(true);

    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      lists: {},
      syncMetadata: {},
    } as Partial<ReturnType<typeof useGraphStore.getState>>);

    const hydrated = await hydrateGraphFromStorage({ storage, key: "graph:test" });
    expect(hydrated.ok).toBe(true);
    expect(useGraphStore.getState().readEntitySnapshot("Task", "t1")).toEqual({
      id: "t1",
      title: "Offline first",
      $synced: false,
      $origin: "optimistic",
      $updatedAt: 123,
    });
    expect(useGraphStore.getState().lists['["tasks"]']?.ids).toEqual(["t1"]);
  });

  it("replays persisted pending actions and updates sync status", async () => {
    const storage = createMemoryStorage();
    await storage.set("graph:pending", JSON.stringify({
      version: 1,
      snapshot: {
        entities: { Task: { t1: { id: "t1", status: "todo" } } },
        patches: {},
        entityStates: {},
        syncMetadata: { "Task:t1": { synced: false, origin: "optimistic", updatedAt: 100 } },
        lists: {},
      },
      pendingActions: [
        {
          id: "action-1",
          key: "task.sync-status",
          input: { id: "t1", status: "done" },
          enqueuedAt: "2026-04-05T12:00:00.000Z",
        },
      ],
    }));

    const replaySpy = vi.fn(async (tx, input: { id: string; status: string }) => {
      tx.upsertEntity("Task", input.id, { status: input.status });
      tx.markEntitySynced("Task", input.id, "server");
      return { ok: true };
    });

    createGraphAction({
      key: "task.sync-status",
      run: replaySpy,
    });

    const online = createOnlineSource(true);
    const runtime = startLocalFirstGraph({
      storage,
      key: "graph:pending",
      onlineSource: online,
      replayPendingActions: true,
    });

    await runtime.ready;

    expect(replaySpy).toHaveBeenCalledWith(expect.anything(), { id: "t1", status: "done" });
    expect(useGraphStore.getState().readEntitySnapshot("Task", "t1")).toMatchObject({
      id: "t1",
      status: "done",
      $synced: true,
      $origin: "server",
    });
    expect(runtime.getStatus()).toMatchObject({
      phase: "ready",
      isOnline: true,
      pendingActions: 0,
    });

    online.setOnline(false);
    expect(runtime.getStatus().phase).toBe("offline");

    runtime.dispose();
  });

  it("builds schema-driven field descriptors for nested JSON columns and markdown", () => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        body: { type: "string", format: "markdown", title: "Body" },
        published: { type: "boolean", title: "Published" },
        seo: {
          type: "object",
          title: "SEO",
          properties: {
            summary: { type: "string", title: "Summary" },
          },
        },
      },
      required: ["title"],
    };

    const fields = buildEntityFieldsFromSchema({
      schema,
      rootField: "metadata",
    });

    expect(fields.map((field) => ({
      field: field.field,
      type: field.type,
      required: field.required,
    }))).toEqual([
      { field: "metadata.title", type: "text", required: true },
      { field: "metadata.body", type: "markdown", required: false },
      { field: "metadata.published", type: "boolean", required: false },
      { field: "metadata.seo.summary", type: "text", required: false },
    ]);
  });

  it("registers and resolves runtime schemas, and exports schema-aware graph snapshots", async () => {
    registerEntityJsonSchema({
      entityType: "Article",
      field: "metadata",
      schemaId: "article-metadata",
      version: "1.0.0",
      schema: {
        type: "object",
        properties: {
          body: { type: "string", format: "markdown" },
        },
      },
    });

    registerRuntimeSchema({
      entityType: "Article",
      field: "metadata",
      schemaId: "article-metadata",
      version: "2.0.0",
      schema: {
        type: "object",
        properties: {
          body: { type: "string", format: "markdown" },
          summary: { type: "string" },
        },
        "x-a2ui-component": "article-editor",
      },
      source: "ai",
    });

    const resolved = getEntityJsonSchema({ entityType: "Article", field: "metadata" });
    expect(resolved?.version).toBe("2.0.0");
    expect(resolved?.source).toBe("ai");

    useGraphStore.getState().upsertEntity("Article", "a1", {
      id: "a1",
      title: "Spec",
      metadata: {
        body: "# Heading",
        summary: "Summary",
      },
    });

    const tool = createSchemaGraphTool(async (_input: { id: string }, ctx) =>
      ctx.exportGraphSnapshotWithSchemas({
        scope: "article",
        data: ctx.queryOnce({
          type: "Article",
          id: "a1",
        }),
        schemas: [ctx.getEntityJsonSchema({ entityType: "Article", field: "metadata" })],
      }),
    );

    const exported = await tool({ id: "a1" });
    expect(exported).toContain('"schemaId": "article-metadata"');
    expect(exported).toContain('"x-a2ui-component": "article-editor"');
    expect(exportGraphSnapshotWithSchemas({
      scope: "article",
      data: useGraphStore.getState().readEntitySnapshot("Article", "a1"),
      schemas: [resolved],
    })).toContain('"summary": "Summary"');
  });

  it("renders markdown fields safely with built-in markdown support", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarkdownFieldRenderer, {
        value: "# Hello\n\nThis is **bold** and <script>alert(1)</script>.",
      }),
    );

    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    async get(key: string) {
      return map.get(key) ?? null;
    },
    async set(key: string, value: string) {
      map.set(key, value);
    },
    async remove(key: string) {
      map.delete(key);
    },
  };
}

function createOnlineSource(initialOnline: boolean) {
  let online = initialOnline;
  const listeners = new Set<(online: boolean) => void>();
  return {
    getIsOnline: () => online,
    subscribe: (listener: (online: boolean) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline: (nextOnline: boolean) => {
      online = nextOnline;
      for (const listener of listeners) listener(online);
    },
  };
}
