"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  GitMerge,
  Layers3,
  Server,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, Badge } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readDemoFetchMetrics } from "@/lib/fetch-metrics";
import type { DemoFetchMetrics } from "@/lib/fetch-metrics";
import {
  useReleaseShowcase,
  useShowcaseSuspenseTask,
} from "@/features/release-showcase/release-showcase-hooks";
import type { CompletenessMode } from "@prometheus-ags/prometheus-entity-management";

export interface IsolationProof {
  requestId: string;
  serverRenderedAt: string;
  requestAtlasIds: string[];
  requestHermesIds: string[];
  crossRequestLeakage: boolean;
  serializable: boolean;
  hydratedTasks: number;
}

const viewModes: CompletenessMode[] = ["local", "remote", "hybrid"];

function ScenarioCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card data-scenario-id={id} className="min-h-[220px]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="ember" className="text-foreground">
            {id.replace("example.", "")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function JsonProof({ value }: { value: unknown }) {
  return (
    <pre
      aria-label="Scenario evidence"
      className="max-h-36 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed"
      tabIndex={0}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

class ShowcaseErrorBoundary extends React.Component<
  { resetKey: number; children: React.ReactNode },
  { error: string | null; resetKey: number }
> {
  state = { error: null as string | null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  static getDerivedStateFromProps(
    props: { resetKey: number },
    state: { resetKey: number; error: string | null },
  ) {
    return props.resetKey !== state.resetKey
      ? { resetKey: props.resetKey, error: null }
      : null;
  }

  render() {
    if (this.state.error) {
      return <div role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">{this.state.error}</div>;
    }
    return this.props.children;
  }
}

function SuspenseTask({ errorRun }: { errorRun: number }) {
  const { data } = useShowcaseSuspenseTask(errorRun);
  return <p className="text-sm">Resolved <strong>{data.title}</strong> through a Suspense entity boundary.</p>;
}

function FetchMetricsProof() {
  const [metrics, setMetrics] = useState<DemoFetchMetrics | null>(null);
  useEffect(() => {
    setMetrics(readDemoFetchMetrics());
  }, []);
  return (
    <JsonProof
      value={{
        taskListReads: metrics?.reads["Task.list"] ?? 0,
        projectListReads: metrics?.reads["Project.list"] ?? 0,
        userListReads: metrics?.reads["User.list"] ?? 0,
        note: "Hydrated lists are fresh inside staleTime — zero duplicate reads.",
      }}
    />
  );
}

export function ReleaseShowcasePage({ isolation }: { isolation: IsolationProof }) {
  const { state, view, selected, patch, projects, devtools, runOptimistic, reassign } =
    useReleaseShowcase();
  const [errorRun, setErrorRun] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Next.js App Router SSR showcase"
        subtitle="Per-request server prefetch, deterministic client hydration, and client takeover across the stable 3.0 graph surface."
      >
        <Badge variant="success">React 19.2</Badge>
        <Badge variant="info">Next.js 16.2</Badge>
      </PageHeader>

      <main className="flex-1 overflow-auto p-6">
        {state.error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
            {state.error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
          <ScenarioCard
            id="example.runtime.ssr-isolation-hydration"
            title="Per-request SSR isolation"
            description="Two concurrent request graphs stay disjoint; the hydrated client graph never refetches prefetched data."
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span>request</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" data-testid="ssr-request-id">
                {isolation.requestId}
              </code>
            </div>
            <JsonProof
              value={{
                requestAtlasIds: isolation.requestAtlasIds,
                requestHermesIds: isolation.requestHermesIds,
                crossRequestLeakage: isolation.crossRequestLeakage,
                serializable: isolation.serializable,
                hydratedTasks: isolation.hydratedTasks,
              }}
            />
            <FetchMetricsProof />
          </ScenarioCard>

          <ScenarioCard
            id="example.graph.normalized-cross-view"
            title="One entity, every view"
            description="The list stores IDs; list and detail rejoin the same Task record."
          >
            <div className="flex flex-wrap gap-2">
              {view.items.slice(0, 5).map((task) => (
                <Button
                  key={task.id}
                  variant={task.id === state.selectedTaskId ? "default" : "outline"}
                  size="xs"
                  onClick={() => state.selectTask(task.id)}
                >
                  {task.id}
                </Button>
              ))}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">{selected.data?.title ?? "Loading task…"}</p>
              <p className="text-xs text-muted-foreground">Status: {selected.data?.status ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Visible patch: {patch ? JSON.stringify(patch) : "none"}</p>
            </div>
            <Button asChild variant="link" size="sm">
              <Link href="/tasks">Open full create/edit/delete workspace</Link>
            </Button>
          </ScenarioCard>

          <ScenarioCard
            id="example.crud.optimistic-confirm"
            title="Optimistic confirm and rollback"
            description="UI-only patches are globally visible, then cleared on confirmation or rejection."
          >
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void runOptimistic(false)}>Confirm mutation</Button>
              <Button size="sm" variant="outline" onClick={() => void runOptimistic(true)}>Reject + rollback</Button>
            </div>
            {state.mutationProof && (
              <Badge variant={state.mutationProof.outcome === "confirmed" ? "success" : "warning"}>
                {state.mutationProof.outcome}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">{state.mutationProof?.message ?? "Run either deterministic path."}</p>
          </ScenarioCard>

          <ScenarioCard
            id="example.relationship.cascade-invalidation"
            title="Relationship cascade"
            description="Move a task between projects and invalidate both relationship edges."
          >
            <p className="text-sm">Current project: <strong>{selected.data?.projectId ?? "—"}</strong></p>
            <Button size="sm" onClick={() => void reassign()} disabled={state.busy === "relation"}>
              <GitMerge /> Reassign task
            </Button>
            <p className="text-xs text-muted-foreground">{state.relationProof ?? `${projects.length} projects available`}</p>
          </ScenarioCard>

          <ScenarioCard
            id="example.view.local-remote-hybrid"
            title="Local / remote / hybrid views"
            description="One typed view descriptor runs locally or through the registered demo transport."
          >
            <div className="flex flex-wrap gap-2">
              {viewModes.map((mode) => (
                <Button key={mode} size="xs" variant={state.viewMode === mode ? "default" : "outline"} onClick={() => state.setViewMode(mode)}>
                  {mode}
                </Button>
              ))}
            </div>
            <Input value={state.search} onChange={(event) => state.setSearch(event.target.value)} placeholder="Filter title or description" />
            <p className="text-xs text-muted-foreground">
              {view.completenessMode} · {view.items.length} rows
              {view.isShowingLocalPending ? " · local rows visible during remote fetch" : ""}
            </p>
          </ScenarioCard>

          <ScenarioCard
            id="example.realtime.coalesced-cross-view"
            title="Realtime client takeover"
            description="After hydration the client owns the stream: three changes to one hydrated entity collapse into one graph write."
          >
            <Button size="sm" onClick={state.burst}><Activity /> Emit three-change burst</Button>
            <JsonProof value={state.realtimeProof ?? { status: "not run" }} />
          </ScenarioCard>

          <ScenarioCard
            id="example.runtime.lifecycle-security"
            title="Suspense and error lifecycle"
            description="React Suspense handles loading; the nearest error boundary contains failed entity fetches."
          >
            <ShowcaseErrorBoundary resetKey={errorRun}>
              <Suspense fallback={<p className="text-sm text-muted-foreground">Suspended while the graph resolves…</p>}>
                <SuspenseTask errorRun={errorRun} />
              </Suspense>
            </ShowcaseErrorBoundary>
            <Button size="sm" variant="outline" onClick={() => setErrorRun((run) => run + 1)}>
              <ShieldCheck /> Exercise error boundary
            </Button>
          </ScenarioCard>

          <ScenarioCard
            id="example.runtime.graph-diagnostics"
            title="Graph diagnostics"
            description="DevTools project the live hydrated graph without introducing a second source of truth."
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="Entities" value={devtools.totalEntities} icon={<Layers3 />} />
              <Metric label="Lists" value={devtools.listCount} icon={<Database />} />
              <Metric label="Subscribers" value={devtools.subscriberCount} icon={<Activity />} />
              <Metric label="Patches" value={devtools.patchedEntities.length} icon={<GitMerge />} />
            </div>
          </ScenarioCard>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

/** Deterministic hydration shell rendered identically on server and first client pass. */
export function ReleaseShowcaseShell() {
  return (
    <div className="flex h-full flex-col" data-testid="release-showcase-shell">
      <PageHeader
        title="Next.js App Router SSR showcase"
        subtitle="Hydrating the prefetched entity graph…"
      />
      <main className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="min-h-[220px] animate-pulse">
              <CardHeader>
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-64 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-24 rounded-lg bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
