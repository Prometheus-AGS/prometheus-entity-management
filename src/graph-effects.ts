import { useGraphStore } from "./graph";

export interface GraphEffectEvent<T> {
  key: string;
  value: T;
  previousValue: T;
}

export interface GraphEffectOptions<T> {
  query: () => T[] | T | null;
  getKey?: (value: T, index: number) => string;
  skipInitial?: boolean;
  isEqual?: (previousValue: T, nextValue: T) => boolean;
  onEnter?: (event: { key: string; value: T }) => void;
  onUpdate?: (event: GraphEffectEvent<T>) => void;
  onExit?: (event: { key: string; previousValue: T }) => void;
}

export interface GraphEffectHandle {
  dispose: () => void;
}

export function createGraphEffect<T>(opts: GraphEffectOptions<T>): GraphEffectHandle {
  const getKey = opts.getKey ?? defaultGetKey;
  const isEqual = opts.isEqual ?? defaultIsEqual;

  let initialized = false;
  let previous = new Map<string, T>();

  const evaluate = () => {
    const nextValues = normalizeQueryResult(opts.query());
    const next = new Map<string, T>();

    nextValues.forEach((value, index) => {
      next.set(getKey(value, index), value);
    });

    if (!initialized) {
      initialized = true;
      previous = next;
      if (opts.skipInitial) return;
    }

    for (const [key, value] of next.entries()) {
      const previousValue = previous.get(key);
      if (previousValue === undefined) {
        opts.onEnter?.({ key, value });
        continue;
      }
      if (!isEqual(previousValue, value)) {
        opts.onUpdate?.({ key, value, previousValue });
      }
    }

    for (const [key, previousValue] of previous.entries()) {
      if (!next.has(key)) opts.onExit?.({ key, previousValue });
    }

    previous = next;
  };

  evaluate();
  const unsubscribe = useGraphStore.subscribe(() => {
    evaluate();
  });

  return {
    dispose: () => {
      unsubscribe();
    },
  };
}

function normalizeQueryResult<T>(value: T[] | T | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function defaultGetKey<T>(value: T, index: number): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string") return record.id;
    if (typeof record.$key === "string") return record.$key;
  }
  return String(index);
}

function defaultIsEqual<T>(previousValue: T, nextValue: T): boolean {
  return JSON.stringify(previousValue) === JSON.stringify(nextValue);
}
