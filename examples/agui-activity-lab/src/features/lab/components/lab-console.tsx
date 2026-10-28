import type { ReactNode } from "react";
import { PrometheusA2uiSurfaces } from "@prometheus-ags/a2ui-react";
import { useLabSession } from "../hooks";
import type { LabRecord } from "../lab-store";

function RecordList({ id, title, records }: { id: string; title: string; records: readonly LabRecord[] }): ReactNode {
  return (
    <section>
      <h2>
        {title} (<span data-testid={`${id}-count`}>{records.length}</span>)
      </h2>
      <ol data-testid={id}>
        {records.map((record, index) => (
          <li key={`${record.at}-${index}`} data-summary={record.summary}>
            <code>{record.summary}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The lab page: the surfaces the runtime holds, plus what it reported about the stream. */
export function LabConsole(): ReactNode {
  const session = useLabSession(window.location.search);

  if (!session.producerUrl) {
    return <p>Open this page with <code>?producer=http://127.0.0.1:5176</code>.</p>;
  }
  return (
    <main>
      <header>
        <h1>AG-UI activity lab</h1>
        <p>
          connection <strong data-testid="connection">{session.connection}</strong>, events{" "}
          <strong data-testid="events-received">{session.eventsReceived}</strong>
        </p>
      </header>
      <p>
        last action <code data-testid="last-action-id">{session.lastActionId ?? "none"}</code>{" "}
        <button type="button" onClick={() => void session.retryLastAction()}>
          Retry last action
        </button>
      </p>
      <section data-testid="surfaces">
        <PrometheusA2uiSurfaces />
      </section>
      <RecordList id="faults" title="Producer faults" records={session.faults} />
      <RecordList id="refusals" title="Refused events" records={session.refusals} />
      <RecordList id="conflicts" title="Data conflicts" records={session.conflicts} />
      <RecordList id="resyncs" title="Resync requests" records={session.resyncs} />
      <RecordList id="posts" title="Posts to producer" records={session.posts} />
    </main>
  );
}
