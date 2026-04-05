function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getValueAtPath<T = unknown>(source: unknown, path: string): T | undefined {
  if (!path) return source as T;
  const segments = path.split(".").filter(Boolean);
  let current: unknown = source;
  for (const segment of segments) {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current as T | undefined;
}

export function setValueAtPath<T extends Record<string, unknown>>(source: T, path: string, value: unknown): T {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return source;

  const clone = structuredClone(source) as Record<string, unknown>;
  let current: Record<string, unknown> = clone;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const next = current[segment];
    if (!isObject(next)) current[segment] = {};
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
  return clone as T;
}

export function collectDirtyPaths(current: unknown, original: unknown, prefix = "", acc = new Set<string>()): Set<string> {
  if (isObject(current) && isObject(original)) {
    const keys = new Set([...Object.keys(current), ...Object.keys(original)]);
    for (const key of keys) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectDirtyPaths(current[key], original[key], nextPrefix, acc);
    }
    return acc;
  }

  if (JSON.stringify(current) !== JSON.stringify(original) && prefix) acc.add(prefix);
  return acc;
}
