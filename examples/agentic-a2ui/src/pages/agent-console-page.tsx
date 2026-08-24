/**
 * Agent console: the single showcase page. Components read joined graph
 * views through feature hooks and submit intent through the flow/store
 * layer — no direct graph or server access from components.
 */
import { useEffect, useMemo, useState } from "react";
import {
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  type PrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import type { A2AServer } from "@prometheus-ags/entity-graph-a2a";
import { createShowcaseAgentServer } from "../agent/agent-server";
import {
  runCancellableStream,
  runDeniedDelete,
  runHappyUpdate,
  runMalformedPayload,
  runSurfaceProjection,
} from "../agent/agent-flows";
import { TASK_BOARD_SURFACE_ID } from "../agent/surface-messages";
import { createShowcaseA2uiRuntime, useApprovalStore, useSessionStore } from "../a2ui/runtime";
import { seedDemoGraph } from "../lib/graph-seed";
import { DEMO_TENANT, OTHER_TENANT } from "../lib/demo-data";
import { useAuditStore } from "../lib/audit-store";
import {
  demonstrateTerminalError,
  optimisticCompleteTask,
  runRealtimeBurst,
} from "../features/tasks/task-store";
import {
  useActiveProjects,
  useCanonicalTask,
  useProjectTasks,
  useRealtimeStats,
  useTaskComments,
  useTaskDetail,
} from "../features/tasks/task-hooks";

function ApprovalDialog() {
  const pending = useApprovalStore((state) => state.pending);
  const respond = useApprovalStore((state) => state.respond);
  if (!pending) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Destructive action approval">
        <h3>Approve destructive action?</h3>
        <p>
          The agent surface requested <code>{pending.request.action.name}</code>. This requires
          explicit human approval before the graph changes.
        </p>
        <div className="dialog-actions">
          <button type="button" data-testid="approval-approve" onClick={() => respond(true)}>
            Approve
          </button>
          <button type="button" data-testid="approval-deny" onClick={() => respond(false)}>
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

function GraphViews() {
  const projects = useActiveProjects();
  const tasks = useProjectTasks();
  const detail = useTaskDetail("task-sync");
  const canonical = useCanonicalTask("task-schema");
  const comments = useTaskComments();
  return (
    <section className="panel" aria-label="Normalized graph views">
      <h2>Normalized graph views</h2>
      <div className="views-grid">
        <div data-testid="project-list">
          <h3>Projects (ID list join)</h3>
          <ul>
            {projects.map((project) => (
              <li key={project.id} data-project-id={project.id}>
                {project.name} — {project.status}
              </li>
            ))}
          </ul>
        </div>
        <div data-testid="task-list">
          <h3>Atlas tasks (ID list join)</h3>
          <ul>
            {tasks.map((task) => (
              <li key={task.id} data-task-id={task.id}>
                {task.title} — {task.status}
              </li>
            ))}
          </ul>
        </div>
        <div data-testid="task-detail">
          <h3>Task detail (task-sync)</h3>
          <p>{detail ? `${detail.title} — ${detail.status} (v${detail.version})` : "loading"}</p>
          <h3>Canonical task-schema</h3>
          <p data-testid="canonical-task-schema">
            {canonical ? `${canonical.title} — ${canonical.status}` : "loading"}
          </p>
        </div>
        <div data-testid="comment-list">
          <h3>task-sync comments</h3>
          <ul>
            {comments.map((comment) => (
              <li key={comment.id}>{comment.body}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function AgentConsolePage() {
  const tenantId = useSessionStore((state) => state.tenantId);
  const setTenantId = useSessionStore((state) => state.setTenantId);
  const timeline = useAuditStore((state) => state.timeline);
  const decisions = useAuditStore((state) => state.decisions);
  const lifecycle = useAuditStore((state) => state.lifecycle);
  const realtime = useRealtimeStats();

  const [server, setServer] = useState<A2AServer | null>(null);
  const [runtime, setRuntime] = useState<PrometheusA2uiRuntime | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    seedDemoGraph();
    // Cancellable flow needs a working window; other flows are instant.
    const instance = createShowcaseAgentServer({ stepDelayMs: 400 });
    setServer(instance);
    const a2ui = createShowcaseA2uiRuntime();
    setRuntime(a2ui);
    return () => a2ui.dispose();
  }, []);

  const externalEndpointProblem = useMemo(() => {
    if (!externalUrl) return null;
    try {
      const url = new URL(externalUrl);
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.protocol !== "https:" && !loopback) {
        return "External agents must use HTTPS or loopback; plaintext remote endpoints are refused.";
      }
      return null;
    } catch {
      return "Enter a valid URL.";
    }
  }, [externalUrl]);

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      // Fail-closed surfaces (e.g. foreign tenant) throw; record, never crash.
      useAuditStore.getState().recordTask({
        taskId: name,
        state: "forbidden",
        detail: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      });
    } finally {
      setBusy(null);
    }
  };

  if (!server || !runtime) {
    return <main className="console">Loading the deterministic agent…</main>;
  }

  return (
    <PrometheusA2uiProvider runtime={runtime}>
      <main className="console">
        <header className="console-header">
          <div>
            <h1>Agentic A2UI console</h1>
            <p>
              Deterministic keyless A2A agent · official A2UI v0.9.1 surfaces · policy-gated graph
              actions
            </p>
          </div>
          <label className="tenant-picker">
            Session tenant
            <select
              data-testid="tenant-select"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            >
              <option value={DEMO_TENANT}>{DEMO_TENANT}</option>
              <option value={OTHER_TENANT}>{OTHER_TENANT} (denied)</option>
            </select>
          </label>
        </header>

        <section className="panel" aria-label="Agent scenarios">
          <h2>Agent scenarios</h2>
          <div className="scenario-row">
            <button
              type="button"
              data-testid="run-happy"
              disabled={busy !== null}
              onClick={() => run("happy", () => runHappyUpdate(server, tenantId))}
            >
              Stream authorized update
            </button>
            <button
              type="button"
              data-testid="run-denied"
              disabled={busy !== null}
              onClick={() => run("denied", () => runDeniedDelete(server, tenantId))}
            >
              Ask agent to delete (denied)
            </button>
            <button
              type="button"
              data-testid="run-malformed"
              disabled={busy !== null}
              onClick={() => run("malformed", () => runMalformedPayload(server, tenantId))}
            >
              Send malformed payload
            </button>
            <button
              type="button"
              data-testid="run-cancel"
              disabled={busy !== null}
              onClick={() => run("cancel", () => runCancellableStream(server, tenantId))}
            >
              Stream then cancel
            </button>
            <button
              type="button"
              data-testid="run-surface"
              disabled={busy !== null}
              onClick={() => run("surface", () => runSurfaceProjection(server, runtime, tenantId))}
            >
              Render A2UI task board
            </button>
            <button
              type="button"
              data-testid="run-optimistic"
              onClick={() => optimisticCompleteTask("task-schema")}
            >
              Optimistic complete task-schema
            </button>
            <button type="button" data-testid="run-realtime" onClick={() => runRealtimeBurst()}>
              Realtime burst (3 events)
            </button>
            <button
              type="button"
              data-testid="run-terminal-error"
              onClick={() => demonstrateTerminalError()}
            >
              Simulate terminal error
            </button>
          </div>
        </section>

        <div className="console-grid">
          <section className="panel" aria-label="A2UI surface" data-testid="a2ui-panel">
            <h2>A2UI surface</h2>
            <PrometheusA2uiSurface
              surfaceId={TASK_BOARD_SURFACE_ID}
              fallback={<p data-testid="surface-fallback">No surface yet — run the surface scenario.</p>}
            />
          </section>

          <section className="panel" aria-label="A2A task timeline">
            <h2>A2A task timeline</h2>
            <ol data-testid="a2a-timeline" className="log">
              {timeline.map((entry, index) => (
                <li key={`${entry.taskId}-${index}`} data-state={entry.state}>
                  <strong>{entry.taskId}</strong> → {entry.state} · {entry.detail}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel" aria-label="Policy decisions">
            <h2>Policy decisions</h2>
            <ul data-testid="policy-log" className="log">
              {decisions.map((decision, index) => (
                <li key={index} data-allowed={decision.allowed}>
                  [{decision.channel}] {decision.action} —{" "}
                  {decision.allowed ? "allowed" : "DENIED"} · {decision.reason}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" aria-label="Lifecycle and realtime">
            <h2>Lifecycle &amp; realtime</h2>
            <p data-testid="lifecycle-log">lifecycle: {lifecycle.join(" → ") || "none yet"}</p>
            <p data-testid="realtime-stats">
              realtime: {realtime.queuedEvents} queued · {realtime.coalescedEntities} entities ·{" "}
              {realtime.flushCount} flush window(s)
            </p>
          </section>
        </div>

        <GraphViews />

        <section className="panel" aria-label="External agent configuration">
          <h2>External agent (optional)</h2>
          <p>
            Point the console at an external A2A agent discovered through its AgentCard. HTTPS or
            loopback only; no credentials are stored.
          </p>
          <input
            data-testid="external-url"
            type="url"
            placeholder="https://agent.example.com"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
          />
          {externalEndpointProblem ? (
            <p role="alert" data-testid="external-url-error">
              {externalEndpointProblem}
            </p>
          ) : null}
        </section>

        <ApprovalDialog />
      </main>
    </PrometheusA2uiProvider>
  );
}
