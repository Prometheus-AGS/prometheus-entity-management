import { useState, useEffect, useRef, useCallback } from "react";
import { RealtimeManager, useGraphDevTools } from "@prometheus-ags/prometheus-entity-management";
import type {
  AdapterStatus,
  ChangeSet,
  EntityChange,
  RealtimeAdapter,
  SubscriptionConfig,
  UnsubscribeFn,
} from "@prometheus-ags/prometheus-entity-management";
import { PageHeader, Badge, StatCard } from "@/components/shared/ui";
import { TaskStatusBadge } from "@/components/shared/entity-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaskStatusMutation, useTasksList } from "@/features/tasks/task-hooks";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import {
  Activity,
  Layers,
  Pause,
  Play,
  Radio,
  Timer,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

// ── Mock realtime adapter ─────────────────────────────────────────────────

interface MockAdapterOptions {
  intervalMs: number;
  onStatusChange?: (status: AdapterStatus) => void;
}

function createMockRealtimeAdapter(opts: MockAdapterOptions): RealtimeAdapter & { stop: () => void; start: () => void; isRunning: () => boolean } {
  let handlers: Array<(cs: ChangeSet) => void> = [];
  let statusHandlers: Array<(s: AdapterStatus) => void> = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let changeCounter = 0;

  const STATUSES: Task["status"][] = ["backlog", "todo", "in-progress", "review", "done"];
  const PRIORITIES: Task["priority"][] = ["low", "medium", "high", "critical"];
  const TASK_IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"];

  function emitChange() {
    changeCounter++;
    const taskId = TASK_IDS[Math.floor(Math.random() * TASK_IDS.length)];
    const field = Math.random() > 0.5 ? "status" : "priority";
    const patch = field === "status"
      ? { status: STATUSES[Math.floor(Math.random() * STATUSES.length)] }
      : { priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)] };

    const change: EntityChange = {
      op: "update",
      type: "Task",
      id: taskId,
      patch: { ...patch, updatedAt: new Date().toISOString() },
    };

    const changeset: ChangeSet = {
      changes: [change],
      timestamp: new Date().toISOString(),
    };

    for (const h of handlers) h(changeset);
  }

  return {
    name: "mock-realtime",
    subscribe(config: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
      handlers.push(handler);
      return () => { handlers = handlers.filter((h) => h !== handler); };
    },
    onStatusChange(cb: (s: AdapterStatus) => void): UnsubscribeFn {
      statusHandlers.push(cb);
      return () => { statusHandlers = statusHandlers.filter((h) => h !== cb); };
    },
    start() {
      if (running) return;
      running = true;
      for (const h of statusHandlers) h("connected");
      timer = setInterval(emitChange, opts.intervalMs);
    },
    stop() {
      running = false;
      if (timer) { clearInterval(timer); timer = null; }
      for (const h of statusHandlers) h("disconnected");
    },
    isRunning: () => running,
  };
}

// ── Feed item type ────────────────────────────────────────────────────────

interface FeedItem {
  id: number;
  timestamp: string;
  adapterName: string;
  change: EntityChange;
}

// ── Realtime page ─────────────────────────────────────────────────────────

export function RealtimePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [adapterStatus, setAdapterStatus] = useState<AdapterStatus>("disconnected");
  const [batchCount, setBatchCount] = useState(0);
  const [intervalMs, setIntervalMs] = useState(2000);
  const feedIdRef = useRef(0);

  const managerRef = useRef<RealtimeManager | null>(null);
  const adapterRef = useRef<ReturnType<typeof createMockRealtimeAdapter> | null>(null);
  const unregisterRef = useRef<UnsubscribeFn | null>(null);

  const devTools = useGraphDevTools();

  const { items: tasks } = useTasksList();
  const taskStatusMutation = useTaskStatusMutation();

  // Create the RealtimeManager once. No adapter here — the second effect owns that.
  useEffect(() => {
    const manager = new RealtimeManager({
      flushInterval: 16,
      onStatusChange: (_name, status) => setAdapterStatus(status),
      onChangeReceived: (_name, change) => {
        feedIdRef.current++;
        setFeed((prev) => [
          { id: feedIdRef.current, timestamp: new Date().toISOString(), adapterName: _name, change },
          ...prev.slice(0, 49),
        ]);
        setBatchCount((c) => c + 1);
      },
    });
    managerRef.current = manager;

    return () => {
      adapterRef.current?.stop();
      unregisterRef.current?.();
    };
  }, []);

  // Create/replace the adapter whenever intervalMs changes (runs on mount too).
  // React runs effects in declaration order, so managerRef is always populated here.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const prevAdapter = adapterRef.current;
    const wasRunning = prevAdapter?.isRunning() ?? false;
    prevAdapter?.stop();
    unregisterRef.current?.();

    const adapter = createMockRealtimeAdapter({ intervalMs });
    adapterRef.current = adapter;
    const unsub = manager.register(adapter, [{ type: "Task" }]);
    unregisterRef.current = unsub;

    if (wasRunning) adapter.start();
  }, [intervalMs]);

  const handleToggle = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    if (adapter.isRunning()) {
      adapter.stop();
      return;
    }
    adapter.start();
  }, []);

  const handleManualChange = useCallback(() => {
    const statuses: Task["status"][] = ["backlog", "todo", "in-progress", "review", "done"];
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    if (!randomTask) return;
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    taskStatusMutation.mutate({ id: randomTask.id, status: newStatus });
  }, [tasks, taskStatusMutation]);

  const clearFeed = useCallback(() => {
    setFeed([]);
    setBatchCount(0);
  }, []);

  const isConnected = adapterStatus === "connected";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Realtime Demo"
        subtitle="RealtimeManager coalescing & adapter simulation"
      >
        <Button
          variant={isConnected ? "destructive" : "default"}
          size="sm"
          onClick={handleToggle}
        >
          {isConnected ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isConnected ? "Stop Stream" : "Start Stream"}
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Feed Events"
              value={feed.length}
              delta="Rolling 50-event window"
              icon={<Radio className="h-4 w-4" />}
            />
            <StatCard
              label="Coalesced Batches"
              value={batchCount}
              delta="16ms flush interval"
              icon={<Layers className="h-4 w-4" />}
            />
            <StatCard
              label="Tasks In Graph"
              value={tasks.length}
              delta={`${devTools.totalEntities} total entities`}
              icon={<Activity className="h-4 w-4" />}
            />
            <StatCard
              label="Subscribers"
              value={devTools.subscriberCount}
              delta={isConnected ? "Realtime stream active" : "Realtime stream idle"}
              icon={isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
            <Card className="min-h-[36rem]">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Realtime Feed</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Watch coalesced adapter updates land in the normalized task graph in real time.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40",
                      )}
                    />
                    {isConnected ? "Streaming" : "Disconnected"}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                    <span>Interval</span>
                    <Select value={String(intervalMs)} onValueChange={(value) => setIntervalMs(Number(value))}>
                      <SelectTrigger size="sm" className="w-24 border-0 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500ms</SelectItem>
                        <SelectItem value="1000">1s</SelectItem>
                        <SelectItem value="2000">2s</SelectItem>
                        <SelectItem value="5000">5s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleManualChange} disabled={tasks.length === 0}>
                    <Zap className="h-3.5 w-3.5" />
                    Simulate Mutation
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearFeed} disabled={feed.length === 0}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex h-full min-h-0 flex-1 flex-col">
                {feed.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-muted/35 px-6 text-center text-muted-foreground">
                    <Radio className="mb-3 h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No realtime events yet</p>
                    <p className="mt-1 text-xs">
                      Start the stream or simulate a mutation to populate the feed.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {feed.map((item) => (
                      <FeedEntry key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Connection</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-3 py-3">
                    <div className="flex items-center gap-3">
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">mock-realtime</p>
                        <p className="text-xs text-muted-foreground">Shared demo adapter</p>
                      </div>
                    </div>
                    <Badge variant={isConnected ? "success" : "muted"}>{adapterStatus}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The manager batches updates inside a 16ms window before flushing to the graph store.
                  </p>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Graph Stats</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <MetricRow label="Total Entities" value={devTools.totalEntities} />
                  <MetricRow label="List Queries" value={devTools.listCount} />
                  <MetricRow label="Active Subscribers" value={devTools.subscriberCount} />
                  <MetricRow label="Stale Entities" value={devTools.staleEntities.length} />
                  <MetricRow label="Fetching" value={devTools.fetchingEntities.length} />
                  <MetricRow label="Patched" value={devTools.patchedEntities.length} />
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>By Type</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {Object.entries(devTools.entityCounts).map(([type, count]) => (
                    <MetricRow key={type} label={type} value={count} />
                  ))}
                  {Object.keys(devTools.entityCounts).length === 0 && (
                    <div className="rounded-xl bg-muted/35 px-3 py-3 text-xs text-muted-foreground">
                      No entities in the graph yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Live Task State</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {tasks.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        {task.title}
                      </span>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="rounded-xl bg-muted/35 px-3 py-3 text-xs text-muted-foreground">
                      No tasks loaded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FeedEntry({ item }: { item: FeedItem }) {
  const time = new Date(item.timestamp);
  const timeStr = time.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 });

  const opColors: Record<string, string> = {
    insert: "text-emerald-400",
    update: "text-blue-400",
    upsert: "text-amber-400",
    delete: "text-red-400",
  };

  return (
    <div className="rounded-2xl bg-muted/35 px-4 py-3 transition-colors hover:bg-muted/55">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-3 w-3 text-muted-foreground opacity-60" />
        <span className="text-[10px] font-mono text-muted-foreground">{timeStr}</span>
        <span className={cn("text-[10px] font-mono font-semibold uppercase", opColors[item.change.op] ?? "text-muted-foreground")}>
          {item.change.op}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {item.change.type}:{item.change.id}
        </span>
      </div>
      {item.change.patch && (
        <div className="ml-5 flex flex-wrap gap-1.5">
          {Object.entries(item.change.patch).map(([key, val]) => (
            <span key={key} className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {key}: {typeof val === "string" && val.length > 20 ? `${val.slice(0, 20)}…` : String(val)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
