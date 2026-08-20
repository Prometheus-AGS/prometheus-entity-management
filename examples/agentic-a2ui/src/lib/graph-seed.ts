/**
 * Seed the canonical entity graph with the demo domain.
 *
 * Lists store ordered IDs only — never entity copies — so every view joins
 * against the graph at render time (normalized cross-view reactivity).
 */
import { graphStore } from "@prometheus-ags/entity-graph-core";
import {
  LIST_KEYS,
  demoComments,
  demoProjects,
  demoTasks,
} from "./demo-data";

export function seedDemoGraph(): void {
  const state = graphStore.getState();

  for (const project of demoProjects) {
    state.upsertEntity("Project", project.id, { ...project });
    state.setEntityFetched("Project", project.id);
  }
  for (const task of demoTasks) {
    state.upsertEntity("Task", task.id, { ...task });
    state.setEntityFetched("Task", task.id);
  }
  for (const comment of demoComments) {
    state.upsertEntity("Comment", comment.id, { ...comment });
    state.setEntityFetched("Comment", comment.id);
  }

  state.setListResult(
    LIST_KEYS.activeProjects,
    demoProjects.map((project) => project.id),
    { total: demoProjects.length },
  );
  state.setListResult(
    LIST_KEYS.projectTasks,
    demoTasks
      .filter((task) => task.projectId === "project-atlas")
      .map((task) => task.id),
    { total: 2 },
  );
  state.setListResult(
    LIST_KEYS.taskComments,
    demoComments.map((comment) => comment.id),
    { total: demoComments.length },
  );
}
