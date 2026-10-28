import { useEffect } from "react";
import { usePrometheusA2uiRuntime } from "@prometheus-ags/a2ui-react";
import { useLabStore } from "./lab-store";

const DEFAULT_STREAM = "default";

export interface LabConnectionParams {
  readonly producerUrl: string | null;
  /** One or more streams; several model a run stream plus a `connect()` stream carrying the same activity. */
  readonly streams: readonly string[];
}

/** Producer URL and stream name from the page query (`?producer=<url>&stream=<name>`). */
export function readLabConnectionParams(search: string): LabConnectionParams {
  const params = new URLSearchParams(search);
  return {
    producerUrl: params.get("producer"),
    streams: (params.get("stream") ?? DEFAULT_STREAM).split(",").filter((name) => name.length > 0),
  };
}

/**
 * Connect the runtime to the producer named in the page query and expose the
 * evidence the lab shows. The subscription is the store's; this hook only ties
 * its lifetime to the component.
 */
export function useLabSession(search: string) {
  const runtime = usePrometheusA2uiRuntime();
  const { producerUrl, streams } = readLabConnectionParams(search);
  const streamKey = streams.join(",");
  const connect = useLabStore((state) => state.connect);
  const disconnect = useLabStore((state) => state.disconnect);

  useEffect(() => {
    if (!producerUrl) return undefined;
    connect(producerUrl, runtime, streamKey.split(","));
    return disconnect;
  }, [producerUrl, streamKey, runtime, connect, disconnect]);

  return {
    producerUrl,
    connection: useLabStore((state) => state.connection),
    eventsReceived: useLabStore((state) => state.eventsReceived),
    faults: useLabStore((state) => state.faults),
    refusals: useLabStore((state) => state.refusals),
    conflicts: useLabStore((state) => state.conflicts),
    resyncs: useLabStore((state) => state.resyncs),
    posts: useLabStore((state) => state.posts),
    lastActionId: useLabStore((state) => state.lastActionId),
    retryLastAction: useLabStore((state) => state.retryLastAction),
  };
}
