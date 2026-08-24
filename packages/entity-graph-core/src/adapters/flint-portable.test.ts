import { describe, expect, it, vi } from "vitest";

import { graphStore } from "../graph";
import {
  CheckedFlintRealtimeAdapter,
  createFlintLoopbackSpine,
  FLINT_ENTITY_CHANGE_KIND,
  FLINT_PORTABLE_CONTRACT,
} from "./__fixtures__/flint-contract";
import { createFlintAdapter, publishFlintMutation } from "./flint";
import { RealtimeManager } from "./realtime-manager";

describe("portable Flint entity-management contract", () => {
  it("pins the checked fixture to the inspected SDK contract", () => {
    expect(FLINT_PORTABLE_CONTRACT).toEqual({
      sourceRepository: "Prometheus-AGS/flint-realtime-fabric",
      sourceRevision: "cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89",
      entityManagementPackage: "@prometheusags/frf-entity-management",
      sdkPackage: "@prometheusags/frf-sdk",
      methods: ["watchEntities", "mutateEntity"],
    });
    expect(FLINT_ENTITY_CHANGE_KIND).toBe(1);
  });

  it("round-trips mutateEntity through watchEntities into the normalized graph", async () => {
    graphStore.getState().removeEntity("Order", "portable-o1");
    const spine = createFlintLoopbackSpine();
    const flint = new CheckedFlintRealtimeAdapter(spine);
    const adapter = createFlintAdapter({
      client: flint,
      channelId: "tenant-1",
      consumerId: "portable-web-1",
    });
    const manager = new RealtimeManager({ flushInterval: 0, store: graphStore });
    manager.register(adapter, [{ type: "Order" }]);

    try {
      await publishFlintMutation(flint, {
        entityType: "Order",
        entityId: "portable-o1",
        tenantId: "tenant-1",
        channelId: "tenant-1",
        data: { id: "portable-o1", status: "open" },
        correlationId: "portable-correlation-1",
      });

      await vi.waitFor(() => {
        expect(
          graphStore
            .getState()
            .readEntity<Record<string, unknown>>("Order", "portable-o1"),
        ).toMatchObject({ id: "portable-o1", status: "open" });
      });

      expect(spine.subscriptions).toEqual([
        { channelId: "tenant-1", consumerId: "portable-web-1" },
      ]);
      expect(spine.published).toHaveLength(1);
      expect(spine.published[0]).toMatchObject({
        channel: {
          id: "tenant-1",
          tenantId: "tenant-1",
          path: "entity/Order",
        },
        kind: FLINT_ENTITY_CHANGE_KIND,
        correlationId: "portable-correlation-1",
      });
    } finally {
      manager.unregisterAll();
      spine.close();
      graphStore.getState().removeEntity("Order", "portable-o1");
    }
  });
});
