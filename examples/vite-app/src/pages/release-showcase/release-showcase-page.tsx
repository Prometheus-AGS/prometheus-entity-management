import React, { Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Cable,
  Database,
  GitMerge,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Wifi,
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
import { useReleaseShowcase, useShowcaseSuspenseTask } from "@/features/release-showcase/release-showcase-hooks";
import type { ShowcaseTransportMode } from "@/features/release-showcase/release-showcase-service";
import type { CompletenessMode } from "@prometheus-ags/prometheus-entity-management";

const transportModes: ShowcaseTransportMode[] = [
  "demo-rest",
  "demo-graphql",
  "live-rest",
  "live-graphql",
];
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

export function ReleaseShowcasePage() {
  const { state, view, live, selected, patch, projects, devtools, runOptimistic, reassign } =
    useReleaseShowcase();
  const [errorRun, setErrorRun] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="React 19 RC showcase"
        subtitle="One deterministic browser lab covering the stable 3.0 entity graph surface; live services are explicit opt-in modes."
      >
        <Badge variant="success">React 19.2</Badge>
        <Badge variant="info">Vite 8.2</Badge>
      </PageHeader>

      <main className="flex-1 overflow-auto p-6">
        {state.error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
            {state.error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
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
              <Link to="/tasks">Open full create/edit/delete workspace</Link>
            </Button>
          </ScenarioCard>

          <ScenarioCard
            id="example.hooks.use-entities-subscribed"
            title="useEntities subscribes to entity data"
            description="The thin 5-field hook. Mutate a task below — these rows repaint from the graph subscription, with no refetch and no remount."
          >
            <ul className="space-y-1 text-sm">
              {live.items.slice(0, 5).map((task) => (
                <li key={task.id} className="flex justify-between gap-2 rounded bg-muted px-2 py-1">
                  <span className="font-mono text-xs">{task.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.title} · <strong>{task.status}</strong>
                  </span>
                </li>
              ))}
            </ul>
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
            description="One typed view descriptor runs locally or through the registered transport."
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
            id="example.transport.rest-graphql-equivalence"
            title="REST and GraphQL seams"
            description="Switch transports without changing the graph-facing hook or view contract."
          >
            <div className="flex flex-wrap gap-2">
              {transportModes.map((mode) => (
                <Button key={mode} size="xs" variant={state.transportMode === mode ? "default" : "outline"} onClick={() => state.setTransportMode(mode)}>
                  <Cable /> {mode}
                </Button>
              ))}
            </div>
            <JsonProof value={state.transportProof ?? { mode: state.transportMode, status: "awaiting fetch" }} />
          </ScenarioCard>

          <ScenarioCard
            id="example.realtime.coalesced-cross-view"
            title="Realtime coalescing"
            description="Three changes to one entity collapse into one graph write."
          >
            <Button size="sm" onClick={state.burst}><Activity /> Emit three-change burst</Button>
            <JsonProof value={state.realtimeProof ?? { status: "not run" }} />
          </ScenarioCard>

          <ScenarioCard
            id="example.offline.persistence-convergence"
            title="PGlite persistence + Loro convergence"
            description="Persist the graph in browser Postgres and reconcile two offline CRDT peers."
          >
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void state.persist()} disabled={state.busy === "persist"}><Database /> Persist</Button>
              <Button size="sm" variant="outline" onClick={() => void state.hydrate()} disabled={state.busy === "hydrate"}><RotateCcw /> Hydrate</Button>
              <Button size="sm" variant="outline" onClick={() => void state.converge()} disabled={state.busy === "converge"}><Wifi /> Converge peers</Button>
            </div>
            <JsonProof value={{ persistence: state.persistenceProof, convergence: state.convergenceProof }} />
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
            id="example.runtime.devtools"
            title="Graph diagnostics"
            description="DevTools project the live graph without introducing a second source of truth."
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
