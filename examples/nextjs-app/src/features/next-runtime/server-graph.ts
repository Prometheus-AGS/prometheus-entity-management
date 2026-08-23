import { randomUUID } from "node:crypto";
import {
  createGraphStore,
  serializeKey,
} from "@prometheus-ags/entity-graph-core";
import {
  demoProjects,
  demoTasks,
  demoUsers,
} from "@/features/demo-backend/demo-seed";
import {
  dehydrateGraphStore,
  type DehydratedGraphSnapshot,
} from "./graph-snapshot";

export interface RequestGraphOptions {
  requestId?: string;
}

/**
 * Build and prefetch a graph owned exclusively by one server render.
 * No module-level graph contains request data.
 */
export async function preloadRequestGraph(
  options: RequestGraphOptions = {},
): Promise<DehydratedGraphSnapshot> {
  const requestId = options.requestId ?? randomUUID();
  const store = createGraphStore();
  const graph = store.getState();

  graph.upsertEntities(
    "User",
    demoUsers.map((user) => ({ id: user.id, data: { ...user } })),
  );
  graph.upsertEntities(
    "Project",
    demoProjects.map((project) => ({ id: project.id, data: { ...project } })),
  );
  graph.upsertEntities(
    "Task",
    demoTasks.map((task) => ({ id: task.id, data: { ...task } })),
  );
  graph.upsertEntity("NextRequest", "current", {
    id: "current",
    requestId,
    preload: "server",
  });

  for (const user of demoUsers) graph.setEntityFetched("User", user.id);
  for (const project of demoProjects) graph.setEntityFetched("Project", project.id);
  for (const task of demoTasks) graph.setEntityFetched("Task", task.id);
  graph.setEntityFetched("NextRequest", "current");

  graph.setListResult(
    serializeKey(["users"]),
    demoUsers.map(({ id }) => id),
    { total: demoUsers.length },
  );
  graph.setListResult(
    serializeKey(["projects"]),
    demoProjects.map(({ id }) => id),
    { total: demoProjects.length },
  );
  graph.setListResult(
    serializeKey(["tasks"]),
    demoTasks.map(({ id }) => id),
    { total: demoTasks.length },
  );

  await Promise.resolve();
  return dehydrateGraphStore(store, requestId);
}
