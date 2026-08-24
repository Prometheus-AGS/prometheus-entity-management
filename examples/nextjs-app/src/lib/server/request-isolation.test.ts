/**
 * Concurrent SSR request-isolation proof for the Next.js App Router example.
 *
 * Runs under plain node:test (via tsx) — no browser, no React renderer. It
 * exercises the exact server modules the RSC routes use and proves:
 *
 * 1. Concurrent payload builds for different tenants stay disjoint, even when
 *    their simulated latencies interleave.
 * 2. Per-request graphs hydrate and dehydrate as serializable round trips
 *    without sharing references.
 * 3. The server path never writes to the process-global `graphStore` — the
 *    cross-request leakage boundary.
 * 4. Hydrated list slots carry `lastFetched`/`stale: false`, which is the
 *    predicate the client hooks use to skip a duplicate fetch.
 *
 * Run: pnpm --filter prometheus-entity-management-nextjs run test:ssr-isolation
 */

import assert from "node:assert/strict";
import test from "node:test";

import { graphStore, serializeKey } from "@prometheus-ags/entity-graph-core";

import {
  buildRequestPayload,
  createRequestGraph,
  dehydrateRequestGraph,
  hydrateRequestGraph,
} from "./request-graph";

const TENANTS = ["atlas", "hermes", "zephyr", "orion", "lyra", "vega"];

test("concurrent tenant payloads are disjoint and reference-independent", async () => {
  const payloads = await Promise.all(
    TENANTS.map((tenant) => buildRequestPayload({ tenant })),
  );

  for (let index = 0; index < TENANTS.length; index++) {
    const tenant = TENANTS[index] as string;
    const payload = payloads[index];
    assert.ok(payload, `payload for ${tenant}`);
    const projectIds = payload.entities
      .filter((entity) => entity.type === "Project")
      .map((entity) => entity.id);
    assert.deepEqual(projectIds, [`project-${tenant}`], `tenant ${tenant} project ids`);
    for (const entity of payload.entities) {
      assert.ok(
        entity.id.startsWith(`${tenant}-`) ||
          entity.id === `project-${tenant}` ||
          entity.type === "User",
        `foreign entity ${entity.type}:${entity.id} leaked into tenant ${tenant}`,
      );
    }
    assert.ok(payload.requestId.length > 0);
  }

  const requestIds = new Set(payloads.map((payload) => payload.requestId));
  assert.equal(requestIds.size, TENANTS.length, "request ids must be unique per request");

  // Reference independence: mutating one payload must not affect another.
  const first = payloads[0];
  const second = payloads[1];
  assert.ok(first && second);
  const before = JSON.stringify(second.entities);
  for (const entity of first.entities) {
    entity.data.title = "MUTATED-BY-ATLAS";
    entity.data.name = "MUTATED-BY-ATLAS";
  }
  assert.equal(JSON.stringify(second.entities), before, "payloads share references");
});

test("per-request graphs hydrate, stay disjoint, and dehydrate serializably", async () => {
  const [atlasPayload, hermesPayload] = await Promise.all([
    buildRequestPayload({ tenant: "atlas", latencyMs: 5 }),
    buildRequestPayload({ tenant: "hermes", latencyMs: 5 }),
  ]);

  const atlas = createRequestGraph();
  const hermes = createRequestGraph();
  hydrateRequestGraph(atlas, atlasPayload);
  hydrateRequestGraph(hermes, hermesPayload);

  const atlasProjects = Object.keys(atlas.getState().entities.Project ?? {});
  const hermesProjects = Object.keys(hermes.getState().entities.Project ?? {});
  assert.deepEqual(atlasProjects, ["project-atlas"]);
  assert.deepEqual(hermesProjects, ["project-hermes"]);
  assert.ok(
    !atlasProjects.some((id) => hermesProjects.includes(id)),
    "cross-request project leakage",
  );

  const atlasSnapshot = dehydrateRequestGraph(atlas);
  const hermesSnapshot = dehydrateRequestGraph(hermes);
  assert.doesNotThrow(() => JSON.stringify(atlasSnapshot));
  assert.doesNotThrow(() => JSON.stringify(hermesSnapshot));
  assert.ok(atlasSnapshot.entities.length > 0);
  assert.equal(
    atlasSnapshot.lists.find((list) => list.key === serializeKey(["tasks"]))?.ids.length,
    3,
    "atlas task list slot",
  );
});

test("the server path never writes the process-global graph store", async () => {
  const before = graphStore.getState();
  const beforeEntities = Object.values(before.entities).reduce(
    (count, bucket) => count + Object.keys(bucket).length,
    0,
  );

  const payloads = await Promise.all(
    TENANTS.map((tenant) => buildRequestPayload({ tenant, latencyMs: 5 })),
  );
  for (const payload of payloads) {
    const graph = createRequestGraph();
    hydrateRequestGraph(graph, payload);
    dehydrateRequestGraph(graph);
  }

  const after = graphStore.getState();
  const afterEntities = Object.values(after.entities).reduce(
    (count, bucket) => count + Object.keys(bucket).length,
    0,
  );
  assert.equal(beforeEntities, 0, "global store should start empty in this process");
  assert.equal(afterEntities, 0, "server path wrote entities to the global store");
  assert.equal(
    Object.keys(after.lists).length,
    0,
    "server path wrote list slots to the global store",
  );
});

test("hydrated list slots satisfy the hooks' fresh-inside-staleTime predicate", async () => {
  const payload = await buildRequestPayload({ latencyMs: 5 });
  const graph = createRequestGraph();
  hydrateRequestGraph(graph, payload);

  const state = graph.getState();
  const defaultStaleTimeMs = 30_000;
  for (const key of [
    serializeKey(["tasks"]),
    serializeKey(["projects"]),
    serializeKey(["users"]),
  ]) {
    const list = state.lists[key];
    assert.ok(list, `missing hydrated list slot ${key}`);
    // Mirrors the mount-effect predicate in the binding hooks:
    // refetch only when missing, stale, or older than staleTime.
    const wouldRefetch =
      !list.lastFetched || list.stale || Date.now() - list.lastFetched > defaultStaleTimeMs;
    assert.equal(wouldRefetch, false, `hydrated list ${key} would trigger a duplicate fetch`);
  }

  const task = state.entities.Task?.["t1"];
  assert.ok(task, "hydrated task t1 missing");
  const entityState = state.entityStates["Task:t1"];
  assert.ok(entityState?.lastFetched, "hydrated entity t1 missing lastFetched");
});
