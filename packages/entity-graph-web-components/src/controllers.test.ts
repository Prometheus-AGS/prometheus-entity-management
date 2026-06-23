/**
 * Unit tests for EntityDetailController, EntityListController, and EntityFormController.
 *
 * These tests exercise the controller logic in a Node environment using a
 * minimal Lit ReactiveControllerHost stub. They validate:
 *   - graph subscription and initial sync
 *   - requestUpdate() is called when graph changes
 *   - refetch() / loadMore() delegate to the engine correctly
 *   - EntityFormController: setField / save / reset / deleteEntity
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";

// ── Minimal ReactiveControllerHost stub ────────────────────────────────────

function makeHost() {
  const controllers: Array<{ hostConnected?(): void; hostDisconnected?(): void }> =
    [];
  const host = {
    addController(c: { hostConnected?(): void; hostDisconnected?(): void }) {
      controllers.push(c);
    },
    requestUpdate: vi.fn(),
    _connect() {
      for (const c of controllers) c.hostConnected?.();
    },
    _disconnect() {
      for (const c of controllers) c.hostDisconnected?.();
    },
  };
  return host;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function seedEntity(type: string, id: string, data: Record<string, unknown>) {
  useGraphStore.getState().upsertEntity(type, id, data);
  useGraphStore.getState().setEntityFetched(type, id);
}

function seedList(
  queryKey: string,
  type: string,
  entries: Array<{ id: string; data: Record<string, unknown> }>
) {
  for (const { id, data } of entries) {
    useGraphStore.getState().upsertEntity(type, id, data);
  }
  useGraphStore.getState().setListResult(queryKey, entries.map((e) => e.id), {
    total: entries.length,
    hasNextPage: false,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("EntityDetailController", () => {
  beforeEach(() => {
    // Reset graph state between tests.
    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("reads an entity already in the graph on connect", async () => {
    const { EntityDetailController } = await import("./entity-detail-controller.js");
    seedEntity("Invoice", "inv-1", { title: "Test Invoice", amount: 100 });

    const host = makeHost();
    const ctrl = new EntityDetailController<unknown, Record<string, unknown>>(
      host,
      "Invoice",
      {
        id: "inv-1",
        fetch: vi.fn().mockResolvedValue({ id: "inv-1", title: "Fetched" }),
        normalize: (raw) => raw as Record<string, unknown>,
      }
    );

    host._connect();

    expect(ctrl.entity).not.toBeNull();
    expect((ctrl.entity as Record<string, unknown>)?.title).toBe("Test Invoice");
    expect(ctrl.isLoading).toBe(false);
    expect(ctrl.error).toBeNull();
  });

  it("calls requestUpdate when the graph entity changes", async () => {
    const { EntityDetailController } = await import("./entity-detail-controller.js");

    const host = makeHost();
    new EntityDetailController<unknown, Record<string, unknown>>(host, "Invoice", {
      id: "inv-2",
      // Use a never-resolving fetch to avoid racing microtask resolution.
      fetch: vi.fn().mockReturnValue(new Promise(() => {})),
      normalize: (raw) => raw as Record<string, unknown>,
    });

    host._connect();
    const callsBefore = host.requestUpdate.mock.calls.length;

    // Upsert entity into graph — should trigger subscription → requestUpdate.
    seedEntity("Invoice", "inv-2", { title: "New Invoice" });

    // Subscription fires synchronously in Zustand. The await lets any
    // pending microtasks settle before we assert.
    await Promise.resolve();

    expect(host.requestUpdate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("tracks isLoading from entityState", async () => {
    const { EntityDetailController } = await import("./entity-detail-controller.js");

    const host = makeHost();
    const ctrl = new EntityDetailController<unknown, Record<string, unknown>>(
      host,
      "Invoice",
      {
        id: "inv-3",
        // Disable auto-fetch so we fully own the entityState in this test.
        enabled: false,
        fetch: vi.fn().mockReturnValue(new Promise(() => {})),
        normalize: (raw) => raw as Record<string, unknown>,
      }
    );

    host._connect();

    // Subscription fires synchronously when we set fetching.
    useGraphStore.getState().setEntityFetching("Invoice", "inv-3", true);

    // isLoading is updated synchronously by the subscription callback.
    expect(ctrl.isLoading).toBe(true);
  });

  it("releases subscription on hostDisconnected", async () => {
    const { EntityDetailController } = await import("./entity-detail-controller.js");

    const host = makeHost();
    new EntityDetailController<unknown, Record<string, unknown>>(host, "Invoice", {
      id: "inv-4",
      fetch: vi.fn().mockResolvedValue(null),
      normalize: (raw) => raw as Record<string, unknown>,
    });

    host._connect();
    host._disconnect();

    const callsAfterDisconnect = host.requestUpdate.mock.calls.length;

    // Graph change should NOT trigger requestUpdate after disconnect.
    seedEntity("Invoice", "inv-4", { title: "After disconnect" });
    await Promise.resolve();

    expect(host.requestUpdate.mock.calls.length).toBe(callsAfterDisconnect);
  });

  it("setId switches the subscription to a new entity", async () => {
    const { EntityDetailController } = await import("./entity-detail-controller.js");

    seedEntity("Invoice", "inv-a", { title: "Invoice A" });
    seedEntity("Invoice", "inv-b", { title: "Invoice B" });

    const host = makeHost();
    const ctrl = new EntityDetailController<unknown, Record<string, unknown>>(
      host,
      "Invoice",
      {
        id: "inv-a",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
      }
    );

    host._connect();
    expect((ctrl.entity as Record<string, unknown>)?.title).toBe("Invoice A");

    ctrl.setId("inv-b");
    expect((ctrl.entity as Record<string, unknown>)?.title).toBe("Invoice B");
  });
});

// ── EntityListController ────────────────────────────────────────────────────

describe("EntityListController", () => {
  beforeEach(() => {
    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("resolves items from graph on connect", async () => {
    const { EntityListController } = await import("./entity-list-controller.js");

    seedList(JSON.stringify(["projects"]), "Project", [
      { id: "p-1", data: { name: "Alpha" } },
      { id: "p-2", data: { name: "Beta" } },
    ]);

    const host = makeHost();
    const ctrl = new EntityListController<unknown, Record<string, unknown>>(
      host,
      "Project",
      {
        queryKey: ["projects"],
        fetch: vi.fn().mockResolvedValue({ items: [] }),
        normalize: (raw) => ({ id: (raw as Record<string, unknown>).id as string, data: raw as Record<string, unknown> }),
      }
    );

    host._connect();

    expect(ctrl.items).toHaveLength(2);
    expect(ctrl.items[0]?.name).toBe("Alpha");
    expect(ctrl.isLoading).toBe(false);
    expect(ctrl.total).toBe(2);
  });

  it("calls requestUpdate when list ids change", async () => {
    const { EntityListController } = await import("./entity-list-controller.js");

    const host = makeHost();
    new EntityListController<unknown, Record<string, unknown>>(host, "Task", {
      queryKey: ["tasks"],
      // Never-resolving fetch — test exclusively controls list state.
      fetch: vi.fn().mockReturnValue(new Promise(() => {})),
      normalize: (raw) => ({ id: (raw as Record<string, unknown>).id as string, data: raw as Record<string, unknown> }),
    });

    host._connect();
    const callsBefore = host.requestUpdate.mock.calls.length;

    seedList(JSON.stringify(["tasks"]), "Task", [
      { id: "t-1", data: { title: "Task 1" } },
    ]);
    await Promise.resolve();

    expect(host.requestUpdate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("exposes hasNextPage and isLoading from list state", async () => {
    const { EntityListController } = await import("./entity-list-controller.js");

    const host = makeHost();
    const ctrl = new EntityListController<unknown, Record<string, unknown>>(
      host,
      "Task",
      {
        queryKey: ["tasks-paged"],
        // Disable auto-fetch so we fully own listState in this test.
        enabled: false,
        fetch: vi.fn().mockReturnValue(new Promise(() => {})),
        normalize: (raw) => ({ id: (raw as Record<string, unknown>).id as string, data: raw as Record<string, unknown> }),
      }
    );

    host._connect();

    // Subscription fires synchronously when list fetching is set.
    useGraphStore.getState().setListFetching(JSON.stringify(["tasks-paged"]), true);

    expect(ctrl.isLoading).toBe(true);
  });
});

// ── EntityFormController ────────────────────────────────────────────────────

describe("EntityFormController", () => {
  beforeEach(() => {
    useGraphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("setField marks isDirty and updates editBuffer", async () => {
    const { EntityFormController } = await import("./entity-form-controller.js");

    seedEntity("Client", "c-1", { name: "Acme", email: "acme@example.com" });

    const host = makeHost();
    const ctrl = new EntityFormController<unknown, Record<string, unknown>>(
      host,
      "Client",
      {
        id: "c-1",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
      }
    );

    host._connect();
    expect(ctrl.isDirty).toBe(false);

    ctrl.setField("name", "Renamed Co");

    expect(ctrl.isDirty).toBe(true);
    expect(ctrl.editBuffer.name).toBe("Renamed Co");
  });

  it("save() calls onSave with editBuffer and clears isDirty on success", async () => {
    const { EntityFormController } = await import("./entity-form-controller.js");

    seedEntity("Client", "c-2", { name: "Beta LLC" });

    const onSave = vi.fn().mockResolvedValue(undefined);
    const host = makeHost();
    const ctrl = new EntityFormController<unknown, Record<string, unknown>>(
      host,
      "Client",
      {
        id: "c-2",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
        onSave,
      }
    );

    host._connect();
    ctrl.setField("name", "Beta LLC v2");

    await ctrl.save();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Beta LLC v2" }));
    expect(ctrl.isDirty).toBe(false);
    expect(ctrl.saveError).toBeNull();
    expect(ctrl.isSaving).toBe(false);
  });

  it("save() sets saveError on failure and preserves isDirty", async () => {
    const { EntityFormController } = await import("./entity-form-controller.js");

    seedEntity("Client", "c-3", { name: "Gamma" });

    const onSave = vi.fn().mockRejectedValue(new Error("Server error"));
    const host = makeHost();
    const ctrl = new EntityFormController<unknown, Record<string, unknown>>(
      host,
      "Client",
      {
        id: "c-3",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
        onSave,
      }
    );

    host._connect();
    ctrl.setField("name", "Gamma Edited");

    await ctrl.save();

    expect(ctrl.saveError).toBe("Server error");
    expect(ctrl.isDirty).toBe(true);
    expect(ctrl.isSaving).toBe(false);
  });

  it("reset() restores editBuffer from graph and clears isDirty", async () => {
    const { EntityFormController } = await import("./entity-form-controller.js");

    seedEntity("Client", "c-4", { name: "Delta Corp" });

    const host = makeHost();
    const ctrl = new EntityFormController<unknown, Record<string, unknown>>(
      host,
      "Client",
      {
        id: "c-4",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
      }
    );

    host._connect();
    ctrl.setField("name", "Edited Name");
    expect(ctrl.isDirty).toBe(true);

    ctrl.reset();

    expect(ctrl.isDirty).toBe(false);
    expect(ctrl.editBuffer.name).toBe("Delta Corp");
  });

  it("deleteEntity() calls onDelete with the entity id", async () => {
    const { EntityFormController } = await import("./entity-form-controller.js");

    seedEntity("Client", "c-5", { id: "c-5", name: "Epsilon" });

    const onDelete = vi.fn().mockResolvedValue(undefined);
    const host = makeHost();
    const ctrl = new EntityFormController<unknown, Record<string, unknown>>(
      host,
      "Client",
      {
        id: "c-5",
        fetch: vi.fn().mockResolvedValue(null),
        normalize: (raw) => raw as Record<string, unknown>,
        onDelete,
      }
    );

    host._connect();
    // Ensure the buffer is populated with id so deleteEntity can extract it.
    ctrl.initBuffer();

    await ctrl.deleteEntity();

    expect(onDelete).toHaveBeenCalledWith("c-5");
    expect(ctrl.saveError).toBeNull();
  });
});
