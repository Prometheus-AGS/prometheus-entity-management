/** Isolated Shadow DOM contract for the shared forensic inspector workspace. */
export const ENTITY_GRAPH_DEVTOOLS_STYLES = `
:host {
  all: initial;
  color-scheme: dark;
  position: fixed;
  z-index: 2147483000;
  inset: 20px;
  box-sizing: border-box;
  font-family: var(--pem-devtools-font-body, ui-sans-serif, system-ui, sans-serif);
  color: var(--pem-devtools-color-text, #e8e6df);
}

*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
h1, h2, h3, p, dl, dd, ol, ul { margin: 0; }
ol, ul { padding: 0; list-style: none; }
code, pre, .pem-mono {
  font-family: var(--pem-devtools-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
}
button:focus-visible, input:focus-visible, select:focus-visible, [tabindex="0"]:focus-visible {
  outline: 2px solid var(--pem-devtools-color-focus, #6ed8c9);
  outline-offset: 2px;
}

.pem-inspector {
  --pem-panel: #151a1d;
  --pem-line: #303a40;
  --pem-muted: #92a0a6;
  --pem-accent: #6ed8c9;
  --pem-attention: #ffc36a;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  width: min(1180px, calc(100vw - 40px));
  height: min(780px, calc(100vh - 40px));
  overflow: hidden;
  border: 1px solid var(--pem-line);
  border-radius: 8px;
  background: var(--pem-devtools-color-shell, #101416);
  box-shadow: 0 28px 80px rgb(0 0 0 / 52%);
  color: var(--pem-devtools-color-text, #e8e6df);
  font-size: 13px;
  line-height: 1.4;
}

.pem-shell-header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--pem-line);
  background: #121719;
}
.pem-brand, .pem-shell-status, .pem-status-cluster, .pem-row-signals {
  display: flex;
  align-items: center;
}
.pem-brand { gap: 10px; }
.pem-brand strong { display: block; font-size: 13px; letter-spacing: .02em; }
.pem-brand small, .pem-shell-status small { color: var(--pem-muted); }
.pem-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #8be5d8;
  border-radius: 5px;
  color: var(--pem-accent);
  font: 700 14px/1 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-shell-status { flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.pem-shell-status > span, .pem-status-cluster > span, .pem-live-status, .pem-registered-status {
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 3px 8px;
  background: #171d20;
  color: #b9c4c8;
  font-size: 11px;
  white-space: nowrap;
}
[data-tone="attention"] { color: var(--pem-attention) !important; }

.pem-workspace-tabs {
  display: flex;
  min-height: 39px;
  align-items: end;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 1px solid var(--pem-line);
  background: #111618;
}
.pem-workspace-tabs button, .pem-value-tabs button, .pem-filter-row button, .pem-pause {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.pem-workspace-tabs button {
  min-height: 38px;
  padding: 0 12px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  font-weight: 650;
}
.pem-workspace-tabs button[aria-selected="true"] {
  border-color: var(--pem-accent);
  color: #f5f2e9;
}

.pem-shell-main, .pem-workspace, .pem-navigator, .pem-entity-detail,
.pem-view-detail, .pem-activity-detail { min-width: 0; min-height: 0; }
.pem-shell-main { overflow: hidden; }
.pem-workspace { height: 100%; overflow: auto; }
.pem-workspace-heading, .pem-detail-header, .pem-card-heading, .pem-navigator-heading,
.pem-activity-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pem-workspace-heading h2, .pem-detail-header h2, .pem-navigator-heading h2 {
  font-size: 18px;
  line-height: 1.2;
}
.pem-eyebrow {
  margin-bottom: 4px;
  color: var(--pem-accent);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pem-overview { padding: 20px; }
.pem-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.pem-metric, .pem-card, .pem-detail-section {
  border: 1px solid var(--pem-line);
  border-radius: 6px;
  background: var(--pem-panel);
}
.pem-metric { min-height: 82px; padding: 13px; }
.pem-metric span { display: block; margin-bottom: 6px; color: var(--pem-muted); font-size: 11px; }
.pem-metric strong { font-size: 24px; line-height: 1; }
.pem-overview-grid {
  display: grid;
  grid-template-columns: minmax(240px, .7fr) minmax(420px, 1.3fr);
  gap: 12px;
  margin-top: 12px;
}
.pem-card, .pem-detail-section { padding: 14px; }
.pem-card-heading { margin-bottom: 10px; }
.pem-card-heading h3 { font-size: 12px; }
.pem-card-heading > span {
  color: var(--pem-muted);
  font: 11px var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-readout-list { display: grid; gap: 8px; }
.pem-readout-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #252e32;
  padding-bottom: 7px;
}
.pem-readout-list div:last-child { border: 0; padding-bottom: 0; }
.pem-readout-list dt, .pem-readout-list dd, .pem-empty { color: var(--pem-muted); }
.pem-trace-list { display: grid; gap: 5px; }
.pem-trace-list li {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
  border-top: 1px solid #252e32;
  padding: 8px 0 3px;
}
.pem-trace-type {
  color: var(--pem-accent);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
  text-transform: uppercase;
}
.pem-trace-copy { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-trace-list time, .pem-compact-list time {
  color: var(--pem-muted);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
}

.pem-entity-workspace, .pem-view-workspace, .pem-activity-workspace {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  overflow: hidden;
}
.pem-navigator {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 14px 10px 10px;
  border-right: 1px solid var(--pem-line);
  background: #121719;
}
.pem-search input, .pem-select-label select {
  width: 100%;
  border: 1px solid var(--pem-line);
  border-radius: 5px;
  padding: 8px 9px;
  background: #0d1113;
  color: #e8e6df;
}
.pem-filter-row { display: flex; gap: 5px; }
.pem-filter-row button, .pem-pause {
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--pem-muted);
  font-size: 11px;
  text-transform: capitalize;
}
.pem-filter-row button[aria-pressed="true"], .pem-pause[aria-pressed="true"] {
  border-color: #4a887f;
  background: #17302e;
  color: var(--pem-accent);
}
.pem-scroll-list { min-height: 0; flex: 1; overflow: auto; scrollbar-color: #445158 transparent; }
.pem-virtual-space, .pem-virtual-row { position: relative; width: 100%; }
.pem-virtual-row { position: absolute; inset: 0 0 auto; }
.pem-entity-row, .pem-view-row, .pem-event-row, .pem-membership-row,
.pem-compact-list button {
  width: 100%;
  border: 0;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.pem-entity-row, .pem-view-row, .pem-event-row {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 7px;
}
.pem-entity-row:hover, .pem-view-row:hover, .pem-event-row:hover,
.pem-membership-row:hover, .pem-compact-list button:hover { background: #20282c; }
.pem-entity-row[data-selected="true"], .pem-view-row[data-selected="true"],
.pem-event-row[data-selected="true"] {
  background: #20322f;
  box-shadow: inset 2px 0 var(--pem-accent);
}
.pem-entity-copy, .pem-event-copy { display: grid; min-width: 0; }
.pem-entity-copy strong, .pem-event-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.pem-entity-copy code, .pem-event-copy small, .pem-view-row code {
  overflow: hidden;
  color: var(--pem-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pem-row-signals, .pem-status-cluster {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  color: var(--pem-attention);
  font-size: 10px;
}
.pem-entity-detail, .pem-view-detail, .pem-activity-detail { overflow: auto; padding: 18px; }
.pem-detail-header { margin-bottom: 14px; }
.pem-detail-header h2 code { color: var(--pem-muted); font-size: .75em; font-weight: 500; }
.pem-error, .pem-expired {
  display: grid;
  gap: 3px;
  margin-bottom: 12px;
  border: 1px solid #7f5233;
  border-radius: 5px;
  padding: 9px 11px;
  background: #2b2019;
  color: #ffd4a0;
}

.pem-value-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--pem-line); }
.pem-value-tabs button {
  padding: 7px 10px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  text-transform: capitalize;
}
.pem-value-tabs button[aria-selected="true"] { border-color: var(--pem-accent); color: #f5f2e9; }
.pem-value-panel {
  min-height: 160px;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--pem-line);
  border-top: 0;
  border-radius: 0 0 5px 5px;
  background: #0e1214;
}
.pem-value {
  overflow: auto;
  margin: 0;
  padding: 12px;
  color: #d7e4e1;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.pem-diff-table { display: grid; }
.pem-diff-row {
  display: grid;
  grid-template-columns: minmax(90px, .65fr) repeat(2, minmax(120px, 1fr));
  border-top: 1px solid #252e32;
}
.pem-diff-row:first-child { border-top: 0; }
.pem-diff-row > span {
  min-width: 0;
  padding: 7px 9px;
  overflow-wrap: anywhere;
  font: 10px/1.4 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-diff-head { color: var(--pem-muted); background: #161c1f; font-weight: 700; }
.pem-diff-row[data-kind="changed"] > span:first-child,
.pem-diff-row[data-kind="added"] > span:first-child,
.pem-diff-row[data-kind="removed"] > span:first-child { color: var(--pem-attention); }

.pem-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.pem-compact-list { display: grid; gap: 3px; }
.pem-compact-list button, .pem-membership-row { display: grid; gap: 3px; padding: 6px; }
.pem-compact-list code, .pem-compact-list small, .pem-membership-row code {
  color: var(--pem-muted);
  font-size: 9px;
}
.pem-view-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-readout { min-height: 70px; }
.pem-list-health { margin-bottom: 12px; }
.pem-membership-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}
.pem-membership-row { border: 1px solid #293337; background: #121719; }
.pem-activity-heading { align-items: start; }
.pem-select-label { display: grid; gap: 5px; color: var(--pem-muted); font-size: 10px; }
.pem-event-row { min-height: 50px; justify-content: start; }
.pem-event-sequence {
  flex: 0 0 42px;
  color: var(--pem-accent);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-event-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-event-readouts div { border: 1px solid #293337; border-radius: 4px; padding: 8px; }
.pem-change-list { display: grid; gap: 5px; }
.pem-change-list li {
  display: grid;
  grid-template-columns: 70px minmax(120px, .8fr) minmax(0, 1fr);
  gap: 9px;
  border-top: 1px solid #252e32;
  padding: 7px 0;
}
.pem-empty { padding: 10px 2px; font-size: 11px; }
.pem-empty-large { display: grid; min-height: 240px; place-items: center; text-align: center; }
.pem-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.pem-devtools-loading {
  min-width: 224px;
  border: 1px solid var(--pem-devtools-color-border, #344047);
  border-radius: var(--pem-devtools-radius-panel, 6px);
  padding: 12px 16px;
  background: var(--pem-devtools-color-shell, #111416);
  color: var(--pem-devtools-color-text, #e8e6df);
  box-shadow: 0 16px 48px rgb(0 0 0 / 36%);
  font-size: 13px;
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`;
