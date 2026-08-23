/**
 * App.tsx — shell layout: responsive two-pane desktop / stacked mobile,
 * seeded graph, deep-link navigation target.
 */
import { useCallback, useEffect, useState } from "react";
import { registerDomainSchemas } from "./domain/schema";
import { seedGraph, ensureRealtimeChannel } from "./features/task-service";
import { TaskBoard } from "./features/TaskBoard";
import { PlatformPanel } from "./features/PlatformPanel";

registerDomainSchemas();

export function App() {
  const [lastDenial, setLastDenial] = useState<string | null>(null);
  const [deepLinkTask, setDeepLinkTask] = useState<string | null>(null);

  useEffect(() => {
    seedGraph();
    ensureRealtimeChannel();
  }, []);

  const onNavigateTask = useCallback((taskId: string) => setDeepLinkTask(taskId), []);
  const onDenial = useCallback((message: string) => setLastDenial(message), []);

  return (
    <main className="shell">
      <header className="app-header">
        <h1>Prometheus Entity Graph</h1>
        <p>Tauri universal showcase — desktop + mobile, one React frontend</p>
      </header>
      <div className="panes">
        <TaskBoard onDenial={onDenial} />
        <PlatformPanel onNavigateTask={onNavigateTask} lastDenial={lastDenial} />
      </div>
      {deepLinkTask ? (
        <p className="deep-link-note">Navigated to task {deepLinkTask} via deep link.</p>
      ) : null}
    </main>
  );
}
