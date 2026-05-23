/**
 * graphql/client.ts
 *
 * GraphQL client that integrates with the entity graph.
 * Normalizes query/mutation responses using declarative EntityDescriptors.
 * After normalization, entities live in the same graph as REST data —
 * a GQL mutation to Post:123 updates REST-subscribed components instantly.
 */
import { useGraphStore } from "../graph";
import { dedupe } from "../engine";
import type { EntityType, EntityId } from "../graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface GQLClientConfig {
  url: string;
  headers?: () => Record<string, string>;
  onError?: (errors: GQLError[]) => void;
}

export interface GQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface GQLResponse<T> { data: T | null; errors?: GQLError[]; }

export interface EntityDescriptor<TNode, TEntity extends object> {
  type: EntityType;
  path: string;
  extractId?: (node: TNode) => EntityId;
  normalize: (node: TNode) => TEntity;
  relations?: EntityDescriptor<unknown, Record<string, unknown>>[];
}

// ---------------------------------------------------------------------------
// Raw executor
// ---------------------------------------------------------------------------
export async function executeGQL<T>(cfg: GQLClientConfig, document: string, variables?: Record<string, unknown>): Promise<GQLResponse<T>> {
  const headers = { "Content-Type": "application/json", ...(cfg.headers?.() ?? {}) };
  const res = await fetch(cfg.url, { method: "POST", headers, body: JSON.stringify({ query: document, variables }) });
  if (!res.ok) throw new Error(`GQL request failed: ${res.status}`);
  const json = (await res.json()) as GQLResponse<T>;
  if (json.errors?.length) cfg.onError?.(json.errors);
  return json;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------
export function normalizeGQLResponse<T>(data: T, descriptors: EntityDescriptor<unknown, Record<string, unknown>>[]): Array<{ type: EntityType; id: EntityId }> {
  const store = useGraphStore.getState();
  const written: Array<{ type: EntityType; id: EntityId }> = [];

  function resolvePath(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => acc && typeof acc === "object" && !Array.isArray(acc) ? (acc as Record<string, unknown>)[key] : undefined, obj);
  }

  function walk(subtree: unknown, desc: EntityDescriptor<unknown, Record<string, unknown>>) {
    if (!subtree) return;
    const { type, extractId = (n: Record<string, unknown>) => String(n.id), normalize, relations } = desc;
    const process = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const id = extractId(node as Record<string, unknown>); const normalized = normalize(node);
      store.upsertEntity(type, id, normalized); store.setEntityFetched(type, id);
      written.push({ type, id });
      if (relations) for (const rel of relations) walk(resolvePath(node as Record<string, unknown>, rel.path), rel);
    };
    if (Array.isArray(subtree)) for (const item of subtree) process(item);
    else process(subtree);
  }

  for (const desc of descriptors) {
    const subtree = desc.path === "." ? data : (data && typeof data === "object" ? resolvePath(data as Record<string, unknown>, desc.path) : undefined);
    walk(subtree, desc);
  }
  return written;
}

// ---------------------------------------------------------------------------
// GQLClient class
// ---------------------------------------------------------------------------
export class GQLClient {
  constructor(private cfg: GQLClientConfig) {}

  async query<TData, TEntity extends object>(opts: {
    document: string; variables?: Record<string, unknown>;
    descriptors: EntityDescriptor<unknown, TEntity>[];
    cacheKey?: string;
  }): Promise<GQLResponse<TData>> {
    const key = opts.cacheKey ?? `gql:${opts.document.slice(0, 60)}:${JSON.stringify(opts.variables ?? {})}`;
    return dedupe(key, async () => {
      const r = await executeGQL<TData>(this.cfg, opts.document, opts.variables);
      if (r.data) normalizeGQLResponse(r.data, opts.descriptors as EntityDescriptor<unknown, Record<string, unknown>>[]);
      return r;
    });
  }

  async mutate<TData, TEntity extends object>(opts: {
    document: string; variables?: Record<string, unknown>;
    descriptors?: EntityDescriptor<unknown, TEntity>[];
    optimistic?: () => void;
  }): Promise<GQLResponse<TData>> {
    const snapshot = opts.optimistic ? takeSnapshot() : null;
    if (opts.optimistic) opts.optimistic();
    try {
      const r = await executeGQL<TData>(this.cfg, opts.document, opts.variables);
      if (r.data && opts.descriptors) normalizeGQLResponse(r.data, opts.descriptors as EntityDescriptor<unknown, Record<string, unknown>>[]);
      return r;
    } catch (err) {
      if (snapshot) restoreSnapshot(snapshot);
      throw err;
    }
  }

  subscribe<TData>(opts: {
    document: string; variables?: Record<string, unknown>;
    descriptors: EntityDescriptor<unknown, Record<string, unknown>>[];
    wsClient: { subscribe: (p: unknown, s: unknown) => () => void };
    onData?: (data: TData) => void; onError?: (e: unknown) => void;
  }): () => void {
    return opts.wsClient.subscribe(
      { query: opts.document, variables: opts.variables },
      { next: ({ data }: { data: TData }) => { if (data) { normalizeGQLResponse(data, opts.descriptors); opts.onData?.(data); } }, error: opts.onError ?? console.error, complete: () => {} },
    );
  }
}

interface Snapshot { entities: Record<string, Record<string, Record<string, unknown>>>; patches: Record<string, Record<string, Record<string, unknown>>>; }
function takeSnapshot(): Snapshot { const s = useGraphStore.getState(); return { entities: JSON.parse(JSON.stringify(s.entities)), patches: JSON.parse(JSON.stringify(s.patches)) }; }
function restoreSnapshot(snap: Snapshot) {
  useGraphStore.setState((s) => {
    for (const key of Object.keys(s.entities)) delete s.entities[key];
    for (const [key, val] of Object.entries(snap.entities)) s.entities[key] = val;
    for (const key of Object.keys(s.patches)) delete s.patches[key];
    for (const [key, val] of Object.entries(snap.patches)) s.patches[key] = val;
  });
}

export function createGQLClient(cfg: GQLClientConfig): GQLClient { return new GQLClient(cfg); }
