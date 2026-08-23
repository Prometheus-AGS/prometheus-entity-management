import type {
  FlintClientLike,
  FlintEntityEvent,
  FlintEntityQuery,
  FlintEntityRecord,
} from "../flint";

export const FLINT_ENTITY_CHANGE_KIND = 1;

export const FLINT_PORTABLE_CONTRACT = {
  sourceRepository: "Prometheus-AGS/flint-realtime-fabric",
  sourceRevision: "cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89",
  entityManagementPackage: "@prometheusags/frf-entity-management",
  sdkPackage: "@prometheusags/frf-sdk",
  methods: ["watchEntities", "mutateEntity"],
} as const;

interface FlintWireChannel {
  id: string;
  tenantId: string;
  path: string;
}

interface FlintWireOffset {
  value: bigint;
}

export interface FlintWireEnvelope {
  id: string;
  channel?: FlintWireChannel;
  kind: number;
  payload: Uint8Array;
  correlationId?: string;
  offset?: FlintWireOffset;
}

export interface FlintSpineClientLike {
  publish(request: { envelope: FlintWireEnvelope }): Promise<unknown>;
  subscribe(request: {
    channelId: string;
    consumerId: string;
    from?: FlintWireOffset;
  }): AsyncIterable<FlintWireEnvelope>;
}

export interface FlintLoopbackSpine extends FlintSpineClientLike {
  readonly published: readonly FlintWireEnvelope[];
  readonly subscriptions: readonly {
    channelId: string;
    consumerId: string;
    from?: FlintWireOffset;
  }[];
  close(): void;
}

export function createFlintLoopbackSpine(): FlintLoopbackSpine {
  const queue: FlintWireEnvelope[] = [];
  const published: FlintWireEnvelope[] = [];
  const subscriptions: {
    channelId: string;
    consumerId: string;
    from?: FlintWireOffset;
  }[] = [];
  let resolveNext: (() => void) | undefined;
  let closed = false;

  return {
    published,
    subscriptions,
    async publish({ envelope }) {
      published.push(envelope);
      queue.push(envelope);
      resolveNext?.();
      resolveNext = undefined;
      return {};
    },
    close() {
      closed = true;
      resolveNext?.();
      resolveNext = undefined;
    },
    async *subscribe(request) {
      subscriptions.push(request);
      let offset = request.from?.value ?? 0n;
      while (!closed) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
          if (closed) return;
        }
        const envelope = queue.shift();
        if (!envelope) continue;
        offset += 1n;
        yield { ...envelope, offset: { value: offset } };
      }
    },
  };
}

/**
 * Checked fixture matching the current Flint entity-management SDK contract.
 * It is test-only and is not exported by the public package entry point.
 */
export class CheckedFlintRealtimeAdapter implements FlintClientLike {
  private nextEnvelopeId = 1;

  constructor(private readonly client: FlintSpineClientLike) {}

  async *watchEntities(query: FlintEntityQuery): AsyncIterable<FlintEntityEvent> {
    const request: {
      channelId: string;
      consumerId: string;
      from?: FlintWireOffset;
    } = {
      channelId: query.channelId,
      consumerId: query.consumerId,
    };
    if (query.fromOffset !== undefined) {
      request.from = { value: query.fromOffset };
    }

    for await (const envelope of this.client.subscribe(request)) {
      if (envelope.kind !== FLINT_ENTITY_CHANGE_KIND) continue;

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(new TextDecoder().decode(envelope.payload)) as Record<
          string,
          unknown
        >;
      } catch {
        continue;
      }

      const entityType = String(payload["entityType"] ?? "");
      if (query.entityType !== undefined && entityType !== query.entityType) {
        continue;
      }

      const event: FlintEntityEvent = {
        entityType,
        entityId: String(payload["entityId"] ?? ""),
        tenantId: envelope.channel?.tenantId ?? "",
        channelId: envelope.channel?.id ?? query.channelId,
        data: (payload["data"] as Record<string, unknown>) ?? {},
        offset: envelope.offset?.value ?? 0n,
      };
      if (envelope.correlationId) {
        event.correlationId = envelope.correlationId;
      }
      yield event;
    }
  }

  async mutateEntity(record: FlintEntityRecord): Promise<void> {
    const payload = new TextEncoder().encode(
      JSON.stringify({
        entityType: record.entityType,
        entityId: record.entityId,
        data: record.data,
      }),
    );

    await this.client.publish({
      envelope: {
        id: `fixture-${this.nextEnvelopeId++}`,
        channel: {
          id: record.channelId,
          tenantId: record.tenantId,
          path: `entity/${record.entityType}`,
        },
        kind: FLINT_ENTITY_CHANGE_KIND,
        payload,
        correlationId: record.correlationId ?? "",
      },
    });
  }
}
