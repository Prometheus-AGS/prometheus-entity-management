/**
 * The ordering key of an activity, read from `content.surfaceVersions`.
 *
 * AG-UI 1.0 defines no version, sequence or idempotency field on activity
 * events, so the producer carries them in the activity's own `content`:
 *
 *   surfaceVersions: { "<surfaceId>": { epoch?: <integer>, version: <integer> } }
 *
 * `epoch` is an integer the producer raises on every restart, so a restarted
 * producer that numbers versions from 1 again is not mistaken for an old one.
 * A missing epoch means 0. Versions are per surface, because one activity can
 * touch several surfaces.
 */

export interface SurfaceVersion {
  readonly epoch: number;
  readonly version: number;
}

const OPERATION_KINDS = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
] as const;

export type OperationKind = (typeof OPERATION_KINDS)[number];

/** An A2UI operation that names a surface, with its payload. */
export interface OperationRef {
  readonly kind: OperationKind;
  readonly surfaceId: string;
  readonly body: Record<string, unknown>;
}

/** Which surface an operation targets, or `undefined` if it names none. */
export function describeOperation(operation: unknown): OperationRef | undefined {
  if (!operation || typeof operation !== "object") return undefined;
  const record = operation as Record<string, unknown>;
  for (const kind of OPERATION_KINDS) {
    const body = record[kind];
    if (body && typeof body === "object") {
      const surfaceId = (body as Record<string, unknown>).surfaceId;
      if (typeof surfaceId === "string") {
        return { kind, surfaceId, body: body as Record<string, unknown> };
      }
    }
  }
  return undefined;
}

/**
 * Deterministic text for a JSON-compatible value: object keys sorted, keys
 * holding `undefined` skipped. Two values that mean the same thing produce the
 * same text regardless of key order.
 */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(record).sort()) {
      if (record[key] === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${canonicalize(record[key])}`);
    }
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** cyrb53, a public-domain 53-bit string hash. */
function cyrb53(text: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Short content digest, two independent 53-bit hashes. It is not
 * cryptographic and is used only to recognize a redelivered activity or two
 * different contents under one ordering key; nothing trusts it for security.
 */
export function digestOf(text: string): string {
  return `${cyrb53(text, 0).toString(16)}-${cyrb53(text, 1).toString(16)}`;
}

/** Negative when `a` is older than `b`, zero when equal, positive when newer. */
export function compareSurfaceVersions(a: SurfaceVersion, b: SurfaceVersion): number {
  return a.epoch !== b.epoch ? a.epoch - b.epoch : a.version - b.version;
}

export type SurfaceVersionsResult =
  | { readonly versions: ReadonlyMap<string, SurfaceVersion> }
  | { readonly problem: string };

function isCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Read `content.surfaceVersions`. Absent means a versionless producer. A
 * malformed entry is reported as a problem, never guessed at.
 */
export function parseSurfaceVersions(raw: unknown): SurfaceVersionsResult {
  if (raw === undefined) return { versions: new Map() };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { problem: "content.surfaceVersions must be an object keyed by surface id." };
  }
  const versions = new Map<string, SurfaceVersion>();
  for (const [surfaceId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { problem: `content.surfaceVersions.${surfaceId} must be an object with a version.` };
    }
    const { version, epoch = 0 } = entry as { version?: unknown; epoch?: unknown };
    if (!isCounter(version) || !isCounter(epoch)) {
      return {
        problem: `content.surfaceVersions.${surfaceId} needs a non-negative integer version and, if present, a non-negative integer epoch.`,
      };
    }
    versions.set(surfaceId, { epoch, version });
  }
  return { versions };
}
