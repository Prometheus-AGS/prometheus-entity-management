/**
 * flint-live.fixture.ts — checked fixture for the Flint wire contract.
 *
 * Mirrors `@prometheusags/frf-entity-management` `RealtimeAdapter` semantics
 * (flint-realtime-fabric `sdks/entity-management/src/adapter.ts`) over an
 * in-memory loopback spine, so the watch/mutate contract is verified in
 * default CI with no sibling repo and no network:
 *
 *   - only `EventKind.ENTITY_CHANGE` (= 1) envelopes are decoded;
 *   - malformed JSON payloads are skipped, never forwarded;
 *   - `entityType` filters on the payload's `entityType` field;
 *   - `tenantId` comes from `envelope.channel.tenantId`;
 *   - `mutateEntity` publishes a JSON `{entityType, entityId, data}` payload
 *     on `channel { id, tenantId, path: "entity/<entityType>" }`.
 *
 * The fixture is imported ONLY by tests. The package ships `dist/` built from
 * `index.ts`, which never reaches this module.
 */

export const FIXTURE_EVENT_KIND_ENTITY_CHANGE = 1;

export interface FixtureEnvelope {
  id?: string;
  channel?: { id: string; tenantId: string; path?: string };
  kind: number;
  payload: Uint8Array;
  correlationId?: string;
  offset?: { value: bigint };
}

export interface FixtureEntityQuery {
  channelId: string;
  consumerId: string;
  entityType?: string;
  fromOffset?: bigint;
}

export interface FixtureEntityRecord {
  entityType: string;
  entityId: string;
  tenantId: string;
  channelId: string;
  data: Record<string, unknown>;
  correlationId?: string;
}

export interface FixtureEntityEvent {
  entityType: string;
  entityId: string;
  tenantId: string;
  channelId: string;
  data: Record<string, unknown>;
  offset: bigint;
  correlationId?: string;
}

/** Minimal spine surface the fixture adapter consumes. */
export interface FixtureSpineClient {
  publish(req: { envelope: FixtureEnvelope }): Promise<unknown>;
  subscribe(req: {
    channelId: string;
    consumerId: string;
    from?: { value: bigint };
  }): AsyncIterable<FixtureEnvelope>;
}

/**
 * Loopback spine: publish() queues envelopes; subscribe() yields them with a
 * stamped offset, matching the real spine's envelope shape. `close()`
 * terminates the consumer's `for await` loop so no generator leaks across
 * test files.
 */
export function createLoopbackSpine(): FixtureSpineClient & { close(): void } {
  const queue: FixtureEnvelope[] = [];
  let resolveNext: (() => void) | null = null;
  let closed = false;
  return {
    async publish(req) {
      queue.push(req.envelope);
      resolveNext?.();
      resolveNext = null;
      return {};
    },
    close() {
      closed = true;
      resolveNext?.();
      resolveNext = null;
    },
    async *subscribe() {
      let offset = 0n;
      while (!closed) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolveNext = r;
          });
          if (closed) return;
        }
        const env = queue.shift();
        if (!env) continue;
        yield { ...env, offset: { value: ++offset } };
      }
    },
  };
}

/**
 * Fixture stand-in for the real `RealtimeAdapter`. Encode/decode behavior is
 * line-for-line equivalent to the sibling SDK's adapter; keep it in sync when
 * the upstream wire contract changes.
 */
export class FixtureRealtimeAdapter {
  constructor(private readonly client: FixtureSpineClient) {}

  async *watchEntities(query: FixtureEntityQuery): AsyncIterable<FixtureEntityEvent> {
    const subscribeArgs: { channelId: string; consumerId: string; from?: { value: bigint } } = {
      channelId: query.channelId,
      consumerId: query.consumerId,
    };
    if (query.fromOffset !== undefined) {
      subscribeArgs.from = { value: query.fromOffset };
    }
    const stream = this.client.subscribe(subscribeArgs);

    for await (const envelope of stream) {
      if (envelope.kind !== FIXTURE_EVENT_KIND_ENTITY_CHANGE) continue;

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(new TextDecoder().decode(envelope.payload)) as Record<string, unknown>;
      } catch {
        continue;
      }

      const entityType = String(payload["entityType"] ?? "");
      if (query.entityType !== undefined && entityType !== query.entityType) {
        continue;
      }

      const event: FixtureEntityEvent = {
        entityType,
        entityId: String(payload["entityId"] ?? ""),
        tenantId: envelope.channel?.tenantId ?? "",
        channelId: envelope.channel?.id ?? query.channelId,
        data: (payload["data"] as Record<string, unknown>) ?? {},
        offset: envelope.offset?.value ?? 0n,
      };
      const corrId = envelope.correlationId;
      if (corrId) event.correlationId = corrId;
      yield event;
    }
  }

  async mutateEntity(record: FixtureEntityRecord): Promise<void> {
    const payload = new TextEncoder().encode(
      JSON.stringify({
        entityType: record.entityType,
        entityId: record.entityId,
        data: record.data,
      }),
    );

    await this.client.publish({
      envelope: {
        id: crypto.randomUUID(),
        channel: {
          id: record.channelId,
          tenantId: record.tenantId,
          path: `entity/${record.entityType}`,
        },
        kind: FIXTURE_EVENT_KIND_ENTITY_CHANGE,
        payload,
        correlationId: record.correlationId ?? "",
      },
    });
  }
}
