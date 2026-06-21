/**
 * adapters/flint.ts — Flint Realtime Fabric adapter.
 *
 *   Flint frf-entity-management `watchEntities()` AsyncIterable
 *     → our ChangeSet stream → RealtimeManager → entity graph
 *
 * GAP-1 is a BRIDGE, not a from-scratch build: the Flint repo already ships
 * `@prometheusags/frf-entity-management` whose `RealtimeAdapter.watchEntities()`
 * yields a plain `EntityEvent` (it JSON-decodes the spine envelope — no proto
 * types leak). We consume that entity-shaped facade behind a minimal-surface
 * type, so:
 *   - The unfrozen `proto-v1` risk is contained BELOW this seam.
 *   - `@prometheusags/frf-sdk` stays an OPTIONAL peer; this module imports
 *     nothing from it. The consumer constructs the Flint client and passes it in.
 *
 * `EntityEvent.offset` (bigint) is forwarded to an optional checkpoint store so
 * reconnects resume from the last seen offset (mirrors the surreal-live adapter).
 */

import type {
  RealtimeAdapter,
  SubscriptionConfig,
  ChangeSet,
  EntityChange,
  ChangeOperation,
  AdapterStatus,
  UnsubscribeFn,
} from "./types";

// ---------------------------------------------------------------------------
// Minimal surface of the Flint frf-entity-management facade (no frf-sdk dep).
// Mirrors sdks/entity-management/src/{adapter,types}.ts exactly.
// ---------------------------------------------------------------------------

/** A decoded entity change event received from the Flint spine. */
export interface FlintEntityEvent {
  entityType: string;
  entityId: string;
  tenantId: string;
  channelId: string;
  data: Record<string, unknown>;
  offset: bigint;
  correlationId?: string;
}

/** Filter criteria for a Flint entity subscription. */
export interface FlintEntityQuery {
  channelId: string;
  consumerId: string;
  entityType?: string;
  fromOffset?: bigint;
}

/** An entity mutation to publish on the Flint spine. */
export interface FlintEntityRecord {
  entityType: string;
  entityId: string;
  tenantId: string;
  channelId: string;
  data: Record<string, unknown>;
  correlationId?: string;
}

/** Minimal surface of the Flint `RealtimeAdapter` we consume. */
export interface FlintClientLike {
  watchEntities(query: FlintEntityQuery): AsyncIterable<FlintEntityEvent>;
  mutateEntity(record: FlintEntityRecord): Promise<void>;
}

/** Optional resume-offset persistence (per channel+consumer). */
export interface FlintCheckpointStore {
  get(key: string): Promise<bigint | undefined> | bigint | undefined;
  set(key: string, offset: bigint): Promise<void> | void;
}

export interface CreateFlintAdapterOptions {
  name?: string;
  /** The Flint entity-management client (frf-entity-management RealtimeAdapter). */
  client: FlintClientLike;
  /** Channel to subscribe/publish on. */
  channelId: string;
  /** Consumer id for this subscription. */
  consumerId: string;
  /** Restrict to one entity type (optional). */
  entityType?: string;
  /** Resume-offset store; reconnects start `fromOffset = lastSeen + 1`. */
  checkpoints?: FlintCheckpointStore;
  /** Map a Flint event to a change operation. Defaults to "upsert". */
  resolveOp?: (event: FlintEntityEvent) => ChangeOperation;
}

function checkpointKey(channelId: string, consumerId: string): string {
  return `flint:${channelId}:${consumerId}`;
}

/**
 * Build a {@link RealtimeAdapter} backed by the Flint Realtime Fabric.
 *
 * The consumer owns the Flint client (constructed from `@prometheusags/frf-sdk`
 * / `frf-entity-management`); this adapter only orchestrates the stream.
 *
 * @example
 * ```ts
 * import { RealtimeAdapter as FrfAdapter } from "@prometheusags/frf-entity-management";
 * import { getRealtimeManager, createFlintAdapter } from "@prometheus-ags/prometheus-entity-management";
 *
 * const flint = new FrfAdapter(spineClient);
 * const adapter = createFlintAdapter({ client: flint, channelId: "tenant-1", consumerId: "web-1" });
 * getRealtimeManager().register(adapter);
 * ```
 */
export function createFlintAdapter(options: CreateFlintAdapterOptions): RealtimeAdapter {
  const {
    client,
    channelId,
    consumerId,
    entityType,
    checkpoints,
    resolveOp = () => "upsert" as ChangeOperation,
  } = options;
  const name = options.name ?? `flint:${channelId}`;
  const statusListeners = new Set<(s: AdapterStatus) => void>();

  function emitStatus(s: AdapterStatus): void {
    for (const cb of statusListeners) cb(s);
  }

  return {
    name,

    subscribe(_config: SubscriptionConfig, handler: (changeset: ChangeSet) => void): UnsubscribeFn {
      let cancelled = false;
      emitStatus("connecting");

      (async () => {
        const key = checkpointKey(channelId, consumerId);
        const lastSeen = checkpoints ? await checkpoints.get(key) : undefined;
        const query: FlintEntityQuery = {
          channelId,
          consumerId,
          ...(entityType !== undefined ? { entityType } : {}),
          ...(lastSeen !== undefined ? { fromOffset: lastSeen + 1n } : {}),
        };

        try {
          emitStatus("connected");
          for await (const event of client.watchEntities(query)) {
            if (cancelled) break;
            if (entityType !== undefined && event.entityType !== entityType) continue;

            const change: EntityChange = {
              op: resolveOp(event),
              type: event.entityType,
              id: event.entityId,
              data: event.data,
            };
            const changeset: ChangeSet = {
              changes: [change],
              timestamp: new Date().toISOString(),
            };
            handler(changeset);

            if (checkpoints) await checkpoints.set(key, event.offset);
          }
          if (!cancelled) emitStatus("disconnected");
        } catch {
          if (!cancelled) emitStatus("error");
        }
      })();

      return () => {
        cancelled = true;
        emitStatus("disconnected");
      };
    },

    onStatusChange(cb) {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
  };
}

/**
 * Publish an entity mutation to the Flint spine via the client.
 * Thin pass-through kept here so consumers import one Flint surface from us.
 */
export async function publishFlintMutation(
  client: FlintClientLike,
  record: FlintEntityRecord,
): Promise<void> {
  await client.mutateEntity(record);
}
