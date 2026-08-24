/**
 * Upgrade fixture: v2-to-v3 — core graph store entry points.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/v2-to-v3.mdx ("Core store access"): the framework-neutral
 * core exposes an imperative vanilla `graphStore` singleton plus the
 * `createGraphStore()` factory for isolated graphs (SSR requests, tests,
 * workers). The 2.x pattern `useGraphStore.getState()` imported from core is
 * replaced by `graphStore.getState()`.
 */
import {
  createGraphStore,
  graphStore,
  type GraphStore,
} from "@prometheus-ags/entity-graph-core";

// After: imperative access goes through the vanilla singleton.
graphStore.getState().upsertEntity("Project", "p1", { name: "Prometheus" });
const project = graphStore
  .getState()
  .readEntity<{ name: string }>("Project", "p1");

// After: server requests, tests, and workers get an isolated graph per host
// instead of sharing the process-wide singleton.
const requestGraph: GraphStore = createGraphStore();
requestGraph.getState().upsertEntity("Project", "p2", { name: "Isolated" });

export { project, requestGraph };
