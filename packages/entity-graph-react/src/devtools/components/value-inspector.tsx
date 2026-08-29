import { formatInspectorValue, type EntityFieldDiff } from "../diff";

export function InspectorValue({ value, label }: { value: unknown; label: string }) {
  return (
    <pre className="pem-value" aria-label={label} tabIndex={0}>
      {formatInspectorValue(value)}
    </pre>
  );
}

export function InspectorDiff({ rows }: { rows: readonly EntityFieldDiff[] }) {
  if (rows.length === 0) {
    return <p className="pem-empty">Original and live values are identical.</p>;
  }
  return (
    <div className="pem-diff-table" role="table" aria-label="Entity field changes">
      <div className="pem-diff-row pem-diff-head" role="row">
        <span role="columnheader">Field</span>
        <span role="columnheader">Original</span>
        <span role="columnheader">Live</span>
      </div>
      {rows.map((row) => (
        <div className="pem-diff-row" role="row" key={row.path} data-kind={row.kind}>
          <code role="cell" translate="no">{row.path}</code>
          <code role="cell">{formatInspectorValue(row.original)}</code>
          <code role="cell">{formatInspectorValue(row.live)}</code>
        </div>
      ))}
    </div>
  );
}
