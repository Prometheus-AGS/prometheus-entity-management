/** Structural comparison helpers; JSON semantics, object key order ignored. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => deepEqual(actual[index], item))
    );
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) return false;
    const actualKeys = Object.keys(actual).filter((key) => actual[key] !== undefined).sort();
    const expectedKeys = Object.keys(expected).filter((key) => expected[key] !== undefined).sort();
    return (
      deepEqual(actualKeys, expectedKeys) &&
      expectedKeys.every((key) => deepEqual(actual[key], expected[key]))
    );
  }
  return false;
}

export function show(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Collects assertion failures with their location instead of throwing at the first one. */
export class Failures {
  readonly items: string[] = [];

  equal(actual: unknown, expected: unknown, where: string): boolean {
    if (deepEqual(actual, expected)) return true;
    this.items.push(`${where}: expected ${show(expected)}, got ${show(actual)}`);
    return false;
  }

  check(condition: boolean, message: string): boolean {
    if (!condition) this.items.push(message);
    return condition;
  }
}
