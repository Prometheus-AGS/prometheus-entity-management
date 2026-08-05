import {createGraphStore} from '@prometheus-ags/entity-graph-core';

type Task = {id: string; title: string; status: 'todo' | 'done'};

const graph = createGraphStore();

export function updateCanonicalTask(next: Task): void {
  graph.getState().upsertEntity('Task', next.id, next);
}
