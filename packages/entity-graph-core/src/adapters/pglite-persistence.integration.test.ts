import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { graphStore } from "../graph";
import {
  hydrateGraphFromStorage,
  persistGraphToStorage,
} from "../local-first-runtime";
import { createPGlitePersistenceAdapter } from "./pglite-persistence";

const temporaryDirectories: string[] = [];

function resetGraph(): void {
  graphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
}

afterEach(async () => {
  resetGraph();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("mandatory real PGlite persistence", () => {
  it(
    "restores canonical entities, ID-only lists, and intentional local patches after close/reopen",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "prometheus-pglite-"));
      temporaryDirectories.push(directory);
      const databasePath = join(directory, "graph.db");
      const key = "bdd:offline-graph";

      const first = await PGlite.create(databasePath);
      const firstStorage = await createPGlitePersistenceAdapter(first);
      graphStore.getState().upsertEntity("Task", "task-1", {
        id: "task-1",
        title: "Persist me",
        status: "doing",
      });
      graphStore.getState().patchEntity("Task", "task-1", { _selected: true });
      graphStore.getState().setListResult("Task:project-1", ["task-1"], { total: 1 });
      await persistGraphToStorage({ storage: firstStorage, key });
      await first.close();

      resetGraph();
      expect(graphStore.getState().readEntity("Task", "task-1")).toBeNull();

      const reopened = await PGlite.create(databasePath);
      const reopenedStorage = await createPGlitePersistenceAdapter(reopened);
      const result = await hydrateGraphFromStorage({ storage: reopenedStorage, key });

      expect(result.ok).toBe(true);
      expect(graphStore.getState().entities.Task?.["task-1"]).toEqual({
        id: "task-1",
        title: "Persist me",
        status: "doing",
      });
      expect(graphStore.getState().lists["Task:project-1"]?.ids).toEqual(["task-1"]);
      expect(graphStore.getState().lists["Task:project-1"]?.ids[0]).toBe("task-1");
      expect(graphStore.getState().readEntity("Task", "task-1")).toEqual({
        id: "task-1",
        title: "Persist me",
        status: "doing",
        _selected: true,
      });
      await reopened.close();
    },
    15_000,
  );
});
