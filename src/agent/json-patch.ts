/**
 * agent/json-patch.ts — Minimal RFC-6902 JSON Patch applier.
 *
 * AG-UI `STATE_DELTA` events carry RFC-6902 operations. Rather than take a hard
 * dependency on `fast-json-patch` (last released 2022) or require consumers to
 * have `@ag-ui/client`'s applier, this implements the standard's six operations
 * directly. It is small, dependency-free, and fully unit-tested.
 *
 * Immutability: every op returns a NEW document; the input is never mutated.
 *
 * Supported ops: add, replace, remove, move, copy, test.
 * Pointers follow RFC-6901 (`/a/b/0`), including the `-` array-append token and
 * `~1`/`~0` escapes for `/` and `~`.
 */

export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  /** For add/replace/test. */
  value?: unknown;
  /** For move/copy. */
  from?: string;
}

function unescape(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Parse an RFC-6901 pointer into its decoded segments (`""` → `[]`). */
function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (pointer[0] !== "/") throw new Error(`Invalid JSON Pointer: "${pointer}"`);
  return pointer.slice(1).split("/").map(unescape);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function getAt(doc: unknown, segs: string[]): unknown {
  let cur: unknown = doc;
  for (const s of segs) {
    if (Array.isArray(cur)) cur = cur[Number(s)];
    else if (isObject(cur)) cur = cur[s];
    else return undefined;
  }
  return cur;
}

function setAt(doc: unknown, segs: string[], value: unknown, mode: "add" | "replace"): unknown {
  if (segs.length === 0) return value;
  const root = clone(doc);
  let cur: unknown = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i];
    const next = Array.isArray(cur) ? (cur as unknown[])[Number(s)] : isObject(cur) ? cur[s] : undefined;
    if (next === undefined || next === null) {
      const created: Record<string, unknown> = {};
      if (Array.isArray(cur)) (cur as unknown[])[Number(s)] = created;
      else if (isObject(cur)) cur[s] = created;
      cur = created;
    } else {
      cur = next;
    }
  }
  const last = segs[segs.length - 1];
  if (Array.isArray(cur)) {
    const idx = last === "-" ? cur.length : Number(last);
    if (mode === "add") cur.splice(idx, 0, value);
    else cur[idx] = value;
  } else if (isObject(cur)) {
    cur[last] = value;
  }
  return root;
}

function removeAt(doc: unknown, segs: string[]): unknown {
  if (segs.length === 0) return undefined;
  const root = clone(doc);
  let cur: unknown = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i];
    cur = Array.isArray(cur) ? (cur as unknown[])[Number(s)] : isObject(cur) ? cur[s] : undefined;
    if (cur === undefined) return root;
  }
  const last = segs[segs.length - 1];
  if (Array.isArray(cur)) cur.splice(Number(last), 1);
  else if (isObject(cur)) delete cur[last];
  return root;
}

/**
 * Apply a sequence of RFC-6902 operations to `doc`, returning a new document.
 * A failing `test` op throws (per spec); structural ops are applied in order.
 */
export function applyJsonPatch<T = unknown>(doc: T, ops: readonly JsonPatchOp[]): T {
  let current: unknown = doc;
  for (const op of ops) {
    const segs = parsePointer(op.path);
    switch (op.op) {
      case "add":
        current = setAt(current, segs, op.value, "add");
        break;
      case "replace":
        current = setAt(current, segs, op.value, "replace");
        break;
      case "remove":
        current = removeAt(current, segs);
        break;
      case "move": {
        const fromSegs = parsePointer(op.from ?? "");
        const moved = getAt(current, fromSegs);
        current = removeAt(current, fromSegs);
        current = setAt(current, segs, moved, "add");
        break;
      }
      case "copy": {
        const fromSegs = parsePointer(op.from ?? "");
        const copied = clone(getAt(current, fromSegs));
        current = setAt(current, segs, copied, "add");
        break;
      }
      case "test": {
        const actual = getAt(current, segs);
        if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
          throw new Error(`JSON Patch test failed at "${op.path}"`);
        }
        break;
      }
      default:
        throw new Error(`Unsupported JSON Patch op: ${(op as { op: string }).op}`);
    }
  }
  return current as T;
}
