import {
  buildA2uiForwardedProps,
  type PrometheusA2uiActionEnvelope,
  type PrometheusA2uiDataConflict,
  type PrometheusA2uiProducerFault,
  type PrometheusA2uiResyncRequest,
  type PrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import { create } from "zustand";

/** Bound on each evidence list, so a long stream cannot grow the page without limit. */
const MAX_RECORDS = 200;

export type LabConnection = "idle" | "connecting" | "open" | "closed";

export interface LabRecord {
  readonly at: string;
  readonly summary: string;
  readonly detail: unknown;
}

interface LabState {
  readonly connection: LabConnection;
  readonly producerUrl: string | null;
  readonly eventsReceived: number;
  readonly faults: readonly LabRecord[];
  readonly refusals: readonly LabRecord[];
  readonly conflicts: readonly LabRecord[];
  readonly resyncs: readonly LabRecord[];
  readonly posts: readonly LabRecord[];
  readonly lastActionId: string | null;
  readonly retryLastAction: () => Promise<boolean>;
  readonly connect: (producerUrl: string, runtime: PrometheusA2uiRuntime, streams: readonly string[]) => void;
  readonly disconnect: () => void;
  readonly recordFault: (fault: PrometheusA2uiProducerFault) => void;
  readonly recordConflict: (conflict: PrometheusA2uiDataConflict) => void;
  readonly sendResync: (request: PrometheusA2uiResyncRequest) => void;
  readonly sendEnvelope: (envelope: PrometheusA2uiActionEnvelope) => Promise<void>;
}

function appended(records: readonly LabRecord[], summary: string, detail: unknown): readonly LabRecord[] {
  const next = { at: new Date().toISOString(), summary, detail };
  return [...records, next].slice(-MAX_RECORDS);
}

/**
 * The lab store owns every external call: the SSE subscription that feeds the
 * runtime and the POSTs that carry action envelopes and resync reports back to
 * the producer. Components reach it only through `hooks.ts`.
 */
let sources: EventSource[] = [];
let activeRuntime: PrometheusA2uiRuntime | null = null;

export const useLabStore = create<LabState>((set, get) => {
  async function post(summary: string, forwardedProps: unknown): Promise<unknown> {
    const { producerUrl } = get();
    if (!producerUrl) return undefined;
    try {
      const response = await fetch(`${producerUrl}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forwardedProps }),
      });
      set((state) => ({
        posts: appended(state.posts, `${summary}: HTTP ${response.status}`, forwardedProps),
      }));
      return (await response.json()) as unknown;
    } catch (error) {
      set((state) => ({
        posts: appended(state.posts, `${summary}: failed`, String(error)),
      }));
      return undefined;
    }
  }

  /** A producer that rejects an action as stale answers with the operations that repair it. */
  function applyRejection(reply: unknown): void {
    const rejection = reply && typeof reply === "object" ? (reply as { rejection?: unknown }).rejection : undefined;
    if (rejection === undefined || !activeRuntime) return;
    try {
      activeRuntime.applyStaleActionRejection(rejection);
    } catch (error) {
      set((state) => ({
        refusals: appended(state.refusals, error instanceof Error ? error.message : "refused", error),
      }));
    }
  }

  return {
    connection: "idle",
    producerUrl: null,
    eventsReceived: 0,
    faults: [],
    refusals: [],
    conflicts: [],
    resyncs: [],
    posts: [],
    lastActionId: null,

    connect(producerUrl, runtime, streams) {
      get().disconnect();
      activeRuntime = runtime;
      set({ connection: "connecting", producerUrl, eventsReceived: 0 });

      const handleMessage = (message: MessageEvent<string>): void => {
        set((state) => ({ eventsReceived: state.eventsReceived + 1 }));
        try {
          runtime.processAgUiEvent(JSON.parse(message.data));
        } catch (error) {
          // A refused event leaves the surfaces unchanged; keep it as evidence. A producer
          // fault the runtime also reported through `onProducerFault` is listed there.
          set((state) => ({
            refusals: appended(state.refusals, error instanceof Error ? error.message : "refused", error),
          }));
        }
      };

      // Several streams model a run stream plus a `connect()` stream carrying the same activity.
      const opened = new Set<EventSource>();
      sources = streams.map((stream) => {
        const next = new EventSource(`${producerUrl}/events?stream=${encodeURIComponent(stream)}`);
        // The page is open once every stream is, so a scenario emitting on any of them is heard.
        next.onopen = () => {
          opened.add(next);
          if (opened.size === streams.length) set({ connection: "open" });
        };
        next.onerror = () => {
          opened.delete(next);
          set({ connection: next.readyState === EventSource.CLOSED ? "closed" : "connecting" });
        };
        next.onmessage = handleMessage;
        return next;
      });
    },

    disconnect() {
      for (const source of sources) source.close();
      sources = [];
      activeRuntime = null;
      set({ connection: "closed" });
    },

    recordFault(fault) {
      set((state) => ({ faults: appended(state.faults, fault.kind, fault) }));
    },

    recordConflict(conflict) {
      set((state) => ({
        conflicts: appended(state.conflicts, `${conflict.surfaceId}${conflict.path}`, conflict),
      }));
    },

    sendResync(request) {
      set((state) => ({ resyncs: appended(state.resyncs, request.reason, request) }));
      void post(
        `resync ${request.reason}`,
        buildA2uiForwardedProps({ resync: { held: request.held, reason: request.reason } }),
      );
    },

    async sendEnvelope(envelope) {
      set({ lastActionId: envelope.actionId });
      applyRejection(await post(`action ${envelope.actionId}`, envelope.forwardedProps));
    },

    async retryLastAction() {
      const { lastActionId } = get();
      return lastActionId && activeRuntime ? activeRuntime.retryAction(lastActionId) : false;
    },
  };
});
