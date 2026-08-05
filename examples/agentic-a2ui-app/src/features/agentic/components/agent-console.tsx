import { PrometheusA2uiSurfaces } from "@prometheus-ags/a2ui-react";
import {
  useActionAudit,
  useAgentSession,
  useApproval,
  useTaskViews,
} from "../hooks";

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${value}`}>{value}</span>;
}

function AgentControls() {
  const session = useAgentSession();

  return (
    <section className="panel control-panel" aria-labelledby="agent-control-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">A2A v1 stream</p>
          <h2 id="agent-control-heading">Reference agent</h2>
        </div>
        <span data-testid="agent-lifecycle">
          <StatusPill value={session.lifecycle} />
        </span>
      </div>

      <dl className="transport-grid">
        <div>
          <dt>Mode</dt>
          <dd data-testid="agent-mode">{session.configuration.mode}</dd>
        </div>
        <div>
          <dt>Endpoint</dt>
          <dd title={session.configuration.endpoint}>{session.configuration.endpoint}</dd>
        </div>
        <div>
          <dt>Task</dt>
          <dd data-testid="agent-task-id">{session.taskId ?? "not started"}</dd>
        </div>
        <div>
          <dt>Artifacts</dt>
          <dd data-testid="artifact-count">{session.artifacts.length}</dd>
        </div>
      </dl>

      <div className="button-grid" aria-label="Agent scenarios">
        <button
          className="button button-primary"
          disabled={session.isRunning}
          onClick={() => void session.run("happy")}
        >
          Stream task surface
        </button>
        <button
          className="button"
          disabled={session.isRunning}
          onClick={() => void session.run("malformed")}
        >
          Test malformed surface
        </button>
        <button
          className="button"
          disabled={session.isRunning}
          onClick={() => void session.run("cancelled")}
        >
          Start cancellable task
        </button>
        <button
          className="button button-danger"
          disabled={!session.canCancel}
          onClick={() => void session.cancel()}
        >
          Cancel active task
        </button>
      </div>

      {session.error ? (
        <div className="notice notice-error" role="alert" data-testid="agent-error">
          <strong>Validation stopped the flow.</strong>
          <span>{session.error}</span>
        </div>
      ) : null}

      {session.artifacts.map((artifact) => (
        <div className="artifact-receipt" key={artifact.artifactId}>
          <span aria-hidden="true">◆</span>
          <div>
            <strong>{artifact.name}</strong>
            <small>
              {artifact.messageCount} official messages · {artifact.mediaType}
            </small>
          </div>
        </div>
      ))}
    </section>
  );
}

function TaskViews() {
  const { ids, tasks, detail } = useTaskViews();

  return (
    <section className="panel graph-panel" aria-labelledby="graph-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Canonical normalized graph</p>
          <h2 id="graph-heading">Cross-view reactivity</h2>
        </div>
        <span className="id-badge">ID-only list: {ids.length}</span>
      </div>

      <div className="graph-views">
        <div className="task-list" aria-label="Project task list">
          <h3>Atlas task list</h3>
          {tasks.map((task) => (
            <article className="task-row" key={task.id} data-testid={`list-${task.id}`}>
              <div>
                <strong>{task.title}</strong>
                <small>{task.id}</small>
              </div>
              <StatusPill value={task.status} />
            </article>
          ))}
        </div>

        <article className="detail-card" data-testid="detail-task-sync">
          <p className="eyebrow">Detail projection</p>
          <h3>{detail?.title ?? "Task unavailable"}</h3>
          <p>
            The list and this detail card join the same canonical entity. Agent actions
            never store a second task copy.
          </p>
          <dl>
            <div>
              <dt>Status</dt>
              <dd data-testid="detail-status">{detail?.status ?? "unknown"}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd data-testid="detail-version">{detail?.version ?? "—"}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{detail?.priority ?? "—"}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}

function ApprovalPanel() {
  const approval = useApproval();
  if (!approval.pending) return null;

  return (
    <aside className="approval-panel" aria-labelledby="approval-heading" role="dialog">
      <div>
        <p className="eyebrow">Human authority required</p>
        <h2 id="approval-heading">Review agent action</h2>
        <p>{approval.pending.summary}</p>
        <code>{approval.pending.actionName}</code>
      </div>
      <div className="approval-actions">
        <button className="button" onClick={approval.deny}>
          Deny
        </button>
        <button className="button button-primary" onClick={approval.approve}>
          Approve archive
        </button>
      </div>
    </aside>
  );
}

function ActionAudit() {
  const entries = useActionAudit();

  return (
    <section className="panel audit-panel" aria-labelledby="audit-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Default-deny action catalog</p>
          <h2 id="audit-heading">Policy decisions</h2>
        </div>
        <span className="id-badge">{entries.length} decisions</span>
      </div>
      {entries.length === 0 ? (
        <p className="empty-copy">Run the agent, then exercise the generated actions.</p>
      ) : (
        <ol className="audit-list">
          {entries.map((entry) => (
            <li key={entry.id} data-testid={`decision-${entry.actionName}`}>
              <span className={`decision-dot decision-${entry.outcome}`} aria-hidden="true" />
              <div>
                <strong>{entry.actionName}</strong>
                <p>{entry.reason}</p>
                <small>{entry.code}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AgentSurface() {
  return (
    <section className="panel surface-panel" aria-labelledby="surface-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Official A2UI v0.9.1</p>
          <h2 id="surface-heading">Agent-rendered surface</h2>
        </div>
        <span className="protocol-badge">catalog-gated</span>
      </div>
      <div className="surface-stage" data-testid="a2ui-surface-stage">
        <PrometheusA2uiSurfaces
          empty={
            <div className="empty-surface">
              <span aria-hidden="true">◇</span>
              <p>Stream the task surface to render the agent artifact here.</p>
            </div>
          }
        />
      </div>
    </section>
  );
}

export function AgentConsole() {
  const { reset } = useAgentSession();

  return (
    <>
      <header className="hero">
        <nav aria-label="Example context">
          <a className="brand" href="https://github.com/Prometheus-AGS/prometheus-entity-management">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span>Prometheus Entity Graph</span>
          </a>
          <span className="version-badge">3.0 · agentic reference</span>
        </nav>
        <div className="hero-copy">
          <div>
            <p className="eyebrow">A2A orchestration → A2UI projection → normalized state</p>
            <h1>Agentic UI with an application-owned safety boundary.</h1>
            <p>
              A deterministic agent streams an official task surface without a model key.
              Every action crosses validation, tenant authorization, and optional human
              approval before the canonical graph changes.
            </p>
          </div>
          <button className="button button-quiet" onClick={reset}>
            Reset shared scenario
          </button>
        </div>
      </header>

      <main className="app-grid">
        <AgentControls />
        <TaskViews />
        <AgentSurface />
        <ActionAudit />
      </main>

      <ApprovalPanel />
      <footer>
        <span>Deterministic CI path: no model credential required.</span>
        <span>Optional external agent: VITE_EXTERNAL_A2A_URL</span>
      </footer>
    </>
  );
}
