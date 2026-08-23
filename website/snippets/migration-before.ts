type QueryState<T> = {data?: T};
type QueryCache = {
  get<T>(key: readonly unknown[]): QueryState<T> | undefined;
  set<T>(key: readonly unknown[], value: T): void;
};

type Task = {id: string; title: string; status: 'todo' | 'done'};

export function updateEveryTaskCopy(cache: QueryCache, next: Task): void {
  cache.set(['task', next.id], next);
  const list = cache.get<Task[]>(['tasks'])?.data ?? [];
  cache.set(['tasks'], list.map((task) => task.id === next.id ? next : task));
}
