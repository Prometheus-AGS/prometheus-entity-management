export interface EntityFieldDiff {
  path: string;
  kind: "added" | "changed" | "removed";
  original: unknown;
  live: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkDiff(
  original: unknown,
  live: unknown,
  path: readonly string[],
  result: EntityFieldDiff[],
) {
  if (Object.is(original, live)) return;
  if (isRecord(original) && isRecord(live)) {
    const keys = [...new Set([...Object.keys(original), ...Object.keys(live)])].sort();
    for (const key of keys) {
      const nextPath = [...path, key];
      if (!Object.hasOwn(original, key)) {
        result.push({ path: nextPath.join("."), kind: "added", original: undefined, live: live[key] });
      } else if (!Object.hasOwn(live, key)) {
        result.push({ path: nextPath.join("."), kind: "removed", original: original[key], live: undefined });
      } else {
        walkDiff(original[key], live[key], nextPath, result);
      }
    }
    return;
  }
  result.push({
    path: path.join(".") || "(value)",
    kind: "changed",
    original,
    live,
  });
}

export function diffEntityValues(original: unknown, live: unknown): EntityFieldDiff[] {
  const result: EntityFieldDiff[] = [];
  walkDiff(original, live, [], result);
  return result;
}

export function formatInspectorValue(value: unknown): string {
  if (value === undefined) return "undefined";
  return JSON.stringify(value, null, 2) ?? "undefined";
}
