import { Server } from "lucide-react";
import { RequestHydrationBoundary } from "@/components/request-hydration-boundary";
import {
  ReleaseShowcasePage,
  ReleaseShowcaseShell,
} from "@/demo-pages/release-showcase/release-showcase-page";
import type { IsolationProof } from "@/demo-pages/release-showcase/release-showcase-page";
import {
  buildRequestPayload,
  createRequestGraph,
  dehydrateRequestGraph,
  hydrateRequestGraph,
} from "@/lib/server/request-graph";
import type { Task } from "@/types";

// Per-request SSR: this route is rendered dynamically for every request so the
// request graph and payload are always request-scoped, never build-time static.
export const dynamic = "force-dynamic";

/** Proves two concurrent request graphs stay disjoint and serializable. */
async function buildIsolationProof(): Promise<
  Omit<IsolationProof, "requestId" | "serverRenderedAt" | "hydratedTasks">
> {
  const [atlasPayload, hermesPayload] = await Promise.all([
    buildRequestPayload({ tenant: "atlas" }),
    buildRequestPayload({ tenant: "hermes" }),
  ]);

  const atlas = createRequestGraph();
  const hermes = createRequestGraph();
  hydrateRequestGraph(atlas, atlasPayload);
  hydrateRequestGraph(hermes, hermesPayload);

  const atlasIds = Object.keys(atlas.getState().entities.Project ?? {});
  const hermesIds = Object.keys(hermes.getState().entities.Project ?? {});

  const atlasRoundTrip = JSON.stringify(dehydrateRequestGraph(atlas));
  const hermesRoundTrip = JSON.stringify(dehydrateRequestGraph(hermes));

  return {
    requestAtlasIds: atlasIds,
    requestHermesIds: hermesIds,
    crossRequestLeakage:
      atlasIds.some((id) => hermesIds.includes(id)) ||
      hermesIds.some((id) => atlasIds.includes(id)),
    serializable: atlasRoundTrip.length > 0 && hermesRoundTrip.length > 0,
  };
}

export default async function ReleaseShowcaseRoute() {
  const [payload, isolation] = await Promise.all([
    buildRequestPayload(),
    buildIsolationProof(),
  ]);

  // Server prefetch: read through the request-owned graph (never the
  // process-global store) so this HTML ships with real entity data.
  const requestGraph = createRequestGraph();
  hydrateRequestGraph(requestGraph, payload);
  const featured = requestGraph
    .getState()
    .readEntitySnapshot<Task>("Task", "t1");

  const proof: IsolationProof = {
    ...isolation,
    requestId: payload.requestId,
    serverRenderedAt: new Date().toISOString(),
    hydratedTasks: payload.lists.find((list) => list.key.includes("tasks"))?.ids.length ?? 0,
  };

  return (
    <div className="flex h-full flex-col">
      <section className="border-b border-border/60 px-6 py-4" data-testid="ssr-prefetch-card">
        <div className="rounded-xl border border-border/60 bg-card p-4 text-card-foreground">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Server className="h-4 w-4" /> Server prefetch (RSC)
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              request {payload.requestId.slice(0, 8)}
            </span>
          </div>
          <p className="text-sm">
            This panel rendered on the server from a per-request graph:{" "}
            <strong data-testid="ssr-prefetch-task">{featured?.title ?? "unavailable"}</strong>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {payload.entities.length} entities and {payload.lists.length} list slots
            dehydrated for client hydration; the process-global store was not touched.
          </p>
        </div>
      </section>

      <RequestHydrationBoundary payload={payload} fallback={<ReleaseShowcaseShell />}>
        <ReleaseShowcasePage isolation={proof} />
      </RequestHydrationBoundary>
    </div>
  );
}
