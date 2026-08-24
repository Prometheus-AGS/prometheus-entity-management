/**
 * Explicit real-SDK contract lane. This file is excluded from the default
 * Vitest include and is executed only by vitest.flint-live.config.ts.
 */
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { graphStore } from "../graph";
import {
  createFlintLoopbackSpine,
  FLINT_ENTITY_CHANGE_KIND,
  type FlintSpineClientLike,
} from "./__fixtures__/flint-contract";
import {
  createFlintAdapter,
  publishFlintMutation,
  type FlintClientLike,
} from "./flint";
import { RealtimeManager } from "./realtime-manager";

type FlintAdapterConstructor = new (client: unknown) => FlintClientLike;

let RealFlintAdapter: FlintAdapterConstructor;

beforeAll(async () => {
  const root = process.env["FLINT_REALTIME_FABRIC_ROOT"]?.trim();
  if (!root) {
    throw new Error(
      "FLINT_REALTIME_FABRIC_ROOT is required for the explicit Flint live integration lane",
    );
  }

  const entityManagementPath = resolve(
    root,
    "sdks/entity-management/dist/index.js",
  );
  const sdkPath = resolve(root, "sdks/ts/dist/index.js");
  await access(entityManagementPath);
  await access(sdkPath);

  const entityManagement = (await import(
    /* @vite-ignore */ pathToFileURL(entityManagementPath).href
  )) as { RealtimeAdapter?: FlintAdapterConstructor };
  const sdk = (await import(/* @vite-ignore */ pathToFileURL(sdkPath).href)) as {
    EventKind?: { ENTITY_CHANGE?: number };
  };

  if (typeof entityManagement.RealtimeAdapter !== "function") {
    throw new Error(
      `Flint entity-management build does not export RealtimeAdapter: ${entityManagementPath}`,
    );
  }
  if (sdk.EventKind?.ENTITY_CHANGE !== FLINT_ENTITY_CHANGE_KIND) {
    throw new Error(
      `Flint ENTITY_CHANGE kind drifted: expected ${FLINT_ENTITY_CHANGE_KIND}, received ${String(sdk.EventKind?.ENTITY_CHANGE)}`,
    );
  }
  RealFlintAdapter = entityManagement.RealtimeAdapter;
});

describe("explicit Flint RealtimeAdapter live contract", () => {
  it("round-trips the real SDK through the Prometheus normalized graph", async () => {
    graphStore.getState().removeEntity("Order", "live-o1");
    const spine = createFlintLoopbackSpine();
    const flint = new RealFlintAdapter(
      spine as unknown as FlintSpineClientLike,
    );
    const adapter = createFlintAdapter({
      client: flint,
      channelId: "tenant-1",
      consumerId: "live-web-1",
    });
    const manager = new RealtimeManager({ flushInterval: 0, store: graphStore });
    manager.register(adapter, [{ type: "Order" }]);

    try {
      await publishFlintMutation(flint, {
        entityType: "Order",
        entityId: "live-o1",
        tenantId: "tenant-1",
        channelId: "tenant-1",
        data: { id: "live-o1", status: "open" },
        correlationId: "live-correlation-1",
      });

      await vi.waitFor(() => {
        expect(
          graphStore
            .getState()
            .readEntity<Record<string, unknown>>("Order", "live-o1"),
        ).toMatchObject({ id: "live-o1", status: "open" });
      });
    } finally {
      manager.unregisterAll();
      spine.close();
      graphStore.getState().removeEntity("Order", "live-o1");
    }
  });
});
