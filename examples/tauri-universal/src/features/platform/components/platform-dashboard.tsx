import { TASK_STATUSES, type TaskStatus, type TaskView } from "@/features/tasks/types";
import { useTaskBoard, useUniversalPlatform } from "../hooks";

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  review: "Review",
  done: "Done",
};

function PrometheusMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-flame">▲</span>
    </span>
  );
}

function TaskCard({ task, selected, onSelect }: { task: TaskView; selected: boolean; onSelect(): void }) {
  return (
    <button
      className={`task-card${selected ? " task-card--selected" : ""}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`task-card-${task.id}`}
    >
      <span className="task-card__topline">
        <span className={`priority-dot priority-dot--${task.priority}`} aria-label={`${task.priority} priority`} />
        <span>{task.project?.name ?? "Unassigned project"}</span>
        {task.pendingSync ? <span className="pending-pill">Queued</span> : null}
      </span>
      <strong>{task.title}</strong>
      <span className="task-card__meta">
        <span className={`status status--${task.status}`}>{STATUS_LABELS[task.status]}</span>
        <span className="avatar" aria-label={`Assigned to ${task.assignee?.name ?? "nobody"}`}>
          {task.assignee?.initials ?? "—"}
        </span>
      </span>
    </button>
  );
}

function StatusSelector({ current, onChange }: { current: TaskStatus; onChange(status: TaskStatus): void }) {
  return (
    <div className="status-selector" role="group" aria-label="Task status">
      {TASK_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={current === status ? "is-active" : ""}
          onClick={() => onChange(status)}
          aria-pressed={current === status}
          data-testid={`status-${status}`}
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}

function RuntimePanel() {
  const platform = useUniversalPlatform();
  const nativeRuntime = platform.platform !== "browser-preview";
  const lastPersisted = platform.lastPersistedAt
    ? new Date(platform.lastPersistedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Not yet";

  return (
    <aside className="runtime-panel" aria-label="Native runtime status">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Runtime</span>
          <h2>One graph, every target</h2>
        </div>
        <span className={`connection-dot connection-dot--${platform.connection}`} aria-hidden="true" />
      </div>

      <dl className="runtime-grid">
        <div>
          <dt>Host</dt>
          <dd>{platform.platform}</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>{platform.storage}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd>{platform.lifecycle}</dd>
        </div>
        <div>
          <dt>Queued writes</dt>
          <dd data-testid="pending-count">{platform.pendingMutations}</dd>
        </div>
      </dl>

      <div className="control-stack">
        <button
          type="button"
          className={platform.connection === "offline" ? "control control--active" : "control"}
          onClick={() => void platform.setConnection(platform.connection === "online" ? "offline" : "online")}
          disabled={platform.phase !== "ready"}
          data-testid="connection-toggle"
        >
          <span>{platform.connection === "online" ? "Simulate offline" : "Reconnect and sync"}</span>
          <small>{platform.connection === "online" ? "Queue the next edit durably" : "Flush queued mutations"}</small>
        </button>
        <div className="button-row">
          <button type="button" onClick={() => void platform.persist()} disabled={platform.phase !== "ready"}>
            Persist now
          </button>
          <button type="button" onClick={() => void platform.restore()} disabled={platform.phase !== "ready"}>
            Restore
          </button>
        </div>
        <small className="persistence-note">Last durable write: {lastPersisted}</small>
      </div>

      <div className="boundary-proof">
        <span className="eyebrow">Capability boundary</span>
        <p>
          Clear and remove are intentionally absent from the main webview. {nativeRuntime ? "Invoke the real denied command." : "Run inside Tauri for an IPC proof."}
        </p>
        <button
          type="button"
          onClick={() => void platform.proveDestructiveCommandDenied()}
          disabled={platform.phase !== "ready"}
          data-testid="prove-denial"
        >
          Prove clear is denied
        </button>
        {platform.capabilityProof ? <output className="proof-output">{platform.capabilityProof}</output> : null}
      </div>

      <div className="event-note">
        <span className="eyebrow">Deep link</span>
        <code>prometheus-entity://task/task-native-persistence?tenant=prometheus-labs</code>
        <small>{platform.deepLink ?? "Awaiting a validated task link"}</small>
      </div>
    </aside>
  );
}

export function PlatformDashboard() {
  const platform = useUniversalPlatform();
  const board = useTaskBoard();

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Prometheus Entity Graph home">
          <PrometheusMark />
          <span>
            <strong>Prometheus</strong>
            <small>Entity Graph</small>
          </span>
        </a>
        <div className="topbar__status" role="status">
          <span className={`connection-dot connection-dot--${platform.connection}`} aria-hidden="true" />
          {platform.phase === "booting" ? "Starting native graph…" : `${platform.platform} · ${platform.connection}`}
        </div>
      </header>

      <main id="top" className="workspace">
        <section className="board" aria-labelledby="board-title">
          <div className="hero">
            <div>
              <span className="eyebrow">Universal workspace</span>
              <h1 id="board-title">Ship from one reactive graph.</h1>
              <p>Desktop, Android, and iOS share the same domain, persistence path, and React views.</p>
            </div>
            <div className="metrics" aria-label="Task summary">
              <span><strong>{board.counts.all}</strong> tasks</span>
              <span><strong>{board.counts.active}</strong> active</span>
              <span><strong>{board.counts.pending}</strong> queued</span>
            </div>
          </div>

          {platform.error ? <div className="error-banner" role="alert">{platform.error}</div> : null}

          <div className="task-layout">
            <div className="task-list" aria-label="Tasks">
              {board.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={board.selectedTask?.id === task.id}
                  onSelect={() => board.selectTask(task.id)}
                />
              ))}
            </div>

            <article className="task-detail" aria-live="polite">
              {board.selectedTask ? (
                <>
                  <div className="detail-heading">
                    <span className={`status status--${board.selectedTask.status}`}>
                      {STATUS_LABELS[board.selectedTask.status]}
                    </span>
                    {board.selectedTask.pendingSync ? <span className="pending-pill">Durably queued</span> : null}
                  </div>
                  <h2>{board.selectedTask.title}</h2>
                  <p>{board.selectedTask.description}</p>
                  <dl className="detail-grid">
                    <div><dt>Project</dt><dd>{board.selectedTask.project?.name}</dd></div>
                    <div><dt>Assignee</dt><dd>{board.selectedTask.assignee?.name}</dd></div>
                    <div><dt>Priority</dt><dd>{board.selectedTask.priority}</dd></div>
                    <div><dt>Entity ID</dt><dd><code>{board.selectedTask.id}</code></dd></div>
                  </dl>
                  <div className="detail-action">
                    <span className="eyebrow">Update status</span>
                    <StatusSelector
                      current={board.selectedTask.status}
                      onChange={(status) => void board.updateStatus(status)}
                    />
                  </div>
                </>
              ) : (
                <p>Hydrating the normalized task graph…</p>
              )}
            </article>
          </div>
        </section>
        <RuntimePanel />
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a href="#top" aria-current="page"><span aria-hidden="true">◆</span>Workspace</a>
        <a href="#top"><span aria-hidden="true">◎</span>Graph</a>
        <a href="#top"><span aria-hidden="true">⌁</span>Runtime</a>
      </nav>
    </div>
  );
}
