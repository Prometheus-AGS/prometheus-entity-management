import { type ReactNode, useState, useCallback, useEffect, useRef } from "react";
import {
  configureEngine,
  startGarbageCollector,
  stopGarbageCollector,
  useGraphDevTools,
} from "@prometheus-ags/prometheus-entity-management";
import { PageHeader } from "@/components/shared/ui";
import { Btn } from "@/components/shared/entity-badges";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Settings, Trash2, RefreshCw, Clock, RotateCcw,
  Database, List, Users, AlertTriangle, Loader2, Layers,
  Pause, Play, Activity,
} from "lucide-react";

// ── Engine config form ────────────────────────────────────────────────────

interface EngineConfig {
  staleTime: number;
  gcTime: number;
  gcInterval: number;
  maxRetries: number;
  retryBaseDelay: number;
  revalidateOnFocus: boolean;
  revalidateOnReconnect: boolean;
}

const DEFAULT_CONFIG: EngineConfig = {
  staleTime: 30_000,
  gcTime: 300_000,
  gcInterval: 60_000,
  maxRetries: 3,
  retryBaseDelay: 1_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

export function SettingsPage() {
  const [config, setConfig] = useState<EngineConfig>({ ...DEFAULT_CONFIG });
  const [gcActive, setGcActive] = useState(false);
  const [lastGcAction, setLastGcAction] = useState<string | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const devTools = useGraphDevTools();

  const handleApply = useCallback(() => {
    configureEngine({
      defaultStaleTime: config.staleTime,
      defaultGcTime: config.gcTime,
      gcInterval: config.gcInterval,
      maxRetries: config.maxRetries,
      retryBaseDelay: config.retryBaseDelay,
      revalidateOnFocus: config.revalidateOnFocus,
      revalidateOnReconnect: config.revalidateOnReconnect,
    });
    setConfigSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfigSaved(false), 2000);
  }, [config]);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
    configureEngine({
      defaultStaleTime: DEFAULT_CONFIG.staleTime,
      defaultGcTime: DEFAULT_CONFIG.gcTime,
      gcInterval: DEFAULT_CONFIG.gcInterval,
      maxRetries: DEFAULT_CONFIG.maxRetries,
      retryBaseDelay: DEFAULT_CONFIG.retryBaseDelay,
      revalidateOnFocus: DEFAULT_CONFIG.revalidateOnFocus,
      revalidateOnReconnect: DEFAULT_CONFIG.revalidateOnReconnect,
    });
  }, []);

  const toggleGc = useCallback(() => {
    if (gcActive) {
      stopGarbageCollector();
      setGcActive(false);
      setLastGcAction("Stopped");
    } else {
      startGarbageCollector();
      setGcActive(true);
      setLastGcAction("Started");
    }
  }, [gcActive]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Engine Settings"
        subtitle="Configure fetch engine, garbage collection, and view live graph stats"
      >
        <Btn variant="secondary" size="sm" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </Btn>
        <Btn variant="primary" size="sm" onClick={handleApply}>
          {configSaved ? <RefreshCw className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
          {configSaved ? "Applied" : "Apply Config"}
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-[1fr_340px] gap-6">
          <div className="flex flex-col gap-6">
            <ConfigSection title="Fetch Behavior" icon={<Clock className="w-4 h-4" />}>
              <ConfigField
                label="Stale Time"
                hint="Milliseconds before an entity is considered stale"
                value={config.staleTime}
                onChange={(v) => setConfig((c) => ({ ...c, staleTime: v }))}
                unit="ms"
              />
              <ConfigField
                label="Max Retries"
                hint="Failed fetch retry attempts before surfacing error"
                value={config.maxRetries}
                onChange={(v) => setConfig((c) => ({ ...c, maxRetries: v }))}
              />
              <ConfigField
                label="Retry Base Delay"
                hint="Initial retry delay (doubles each attempt)"
                value={config.retryBaseDelay}
                onChange={(v) => setConfig((c) => ({ ...c, retryBaseDelay: v }))}
                unit="ms"
              />
            </ConfigSection>

            <ConfigSection title="Garbage Collection" icon={<Trash2 className="w-4 h-4" />}>
              <ConfigField
                label="GC Max Age"
                hint="Entities older than this with zero subscribers are evicted"
                value={config.gcTime}
                onChange={(v) => setConfig((c) => ({ ...c, gcTime: v }))}
                unit="ms"
              />
              <ConfigField
                label="GC Interval"
                hint="Time between garbage collection passes"
                value={config.gcInterval}
                onChange={(v) => setConfig((c) => ({ ...c, gcInterval: v }))}
                unit="ms"
              />

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-medium text-[--color-text-primary]">Collector Status</p>
                  <p className="text-[10px] text-[--color-text-muted]">
                    {lastGcAction ? `Last action: ${lastGcAction}` : "Not started"}
                  </p>
                </div>
                <Btn
                  variant={gcActive ? "danger" : "secondary"}
                  size="sm"
                  onClick={toggleGc}
                >
                  {gcActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {gcActive ? "Stop GC" : "Start GC"}
                </Btn>
              </div>
            </ConfigSection>

            <ConfigSection title="Revalidation" icon={<RefreshCw className="w-4 h-4" />}>
              <ToggleField
                label="Revalidate on Focus"
                hint="Mark subscribed entities stale when window regains focus"
                value={config.revalidateOnFocus}
                onChange={(v) => setConfig((c) => ({ ...c, revalidateOnFocus: v }))}
              />
              <ToggleField
                label="Revalidate on Reconnect"
                hint="Mark subscribed entities stale when browser comes back online"
                value={config.revalidateOnReconnect}
                onChange={(v) => setConfig((c) => ({ ...c, revalidateOnReconnect: v }))}
              />
            </ConfigSection>
          </div>

          <div className="flex flex-col gap-4">
            <div className="pb-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Live Graph Stats
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">via useGraphDevTools()</p>
            </div>

            <StatCard icon={<Database className="w-4 h-4" />} label="Total Entities" value={devTools.totalEntities} />
            <StatCard icon={<List className="w-4 h-4" />} label="List Queries" value={devTools.listCount} />
            <StatCard icon={<Users className="w-4 h-4" />} label="Subscribers" value={devTools.subscriberCount} />
            <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Stale Entities" value={devTools.staleEntities.length} variant={devTools.staleEntities.length > 0 ? "warning" : "default"} />
            <StatCard icon={<Loader2 className="w-4 h-4" />} label="Fetching" value={devTools.fetchingEntities.length} variant={devTools.fetchingEntities.length > 0 ? "active" : "default"} />
            <StatCard icon={<Layers className="w-4 h-4" />} label="Patched" value={devTools.patchedEntities.length} />

            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Entity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Object.entries(devTools.entityCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-3 rounded-lg bg-muted/55 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{type}</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(100, (count / Math.max(devTools.totalEntities, 1)) * 100)}
                        className="w-16 h-1.5 bg-muted-foreground/15"
                      />
                      <span className="text-xs font-mono text-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Active Lists
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {devTools.lists.map((l) => (
                  <div key={l.key} className="flex items-center justify-between gap-3 rounded-lg bg-muted/55 px-3 py-2 text-[10px]">
                    <span className="font-mono text-muted-foreground truncate max-w-[180px]" title={l.key}>
                      {l.key}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{l.idCount} ids</span>
                      {l.isFetching && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />}
                      {l.isStale && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                    </div>
                  </div>
                ))}
                {devTools.lists.length === 0 && (
                  <span className="text-xs text-muted-foreground">No active lists</span>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function ConfigSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function ConfigField({ label, hint, value, onChange, unit }: {
  label: string; hint: string; value: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="w-24 text-xs font-mono text-right"
        />
        {unit && <span className="text-[10px] text-muted-foreground w-6">{unit}</span>}
      </div>
    </div>
  );
}

function ToggleField({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function StatCard({ icon, label, value, variant = "default" }: {
  icon: ReactNode; label: string; value: number;
  variant?: "default" | "warning" | "active";
}) {
  return (
    <Card size="sm" className={cn(
      variant === "warning" && "bg-amber-50 dark:bg-amber-500/10",
      variant === "active" && "bg-blue-50 dark:bg-blue-500/10"
    )}>
      <CardContent className="flex items-center justify-between py-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-muted-foreground",
            variant === "warning" && "text-amber-600 dark:text-amber-300",
            variant === "active" && "text-blue-600 dark:text-blue-300"
          )}>
            {icon}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}
